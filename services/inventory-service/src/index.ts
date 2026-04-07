import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import { z, ZodSchema } from 'zod';

dotenv.config();

// ── OWASP: Validate required environment variables at startup ─────────────────
// Keys are read from environment variables only — never hardcoded.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const app = express();

// ── OWASP: Secure HTTP headers ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Prevent oversized payload attacks

// ── Supabase Client Factory (JWT-forwarding) ──────────────────────────────────
const getSupabase = (req: Request) => {
  const authHeader = req.headers.authorization;
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });
};

const PORT = process.env.PORT || 4002;

// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data; // Replace with sanitized data — rejects extra fields
  next();
};

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().min(0).max(1_000_000).optional(),
  stock: z.number().int().min(0).optional(),
  category: z.string().max(100).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
});

const CreateTransferSchema = z.object({
  product_id: z.union([z.string(), z.number()]),
  quantity_transfer: z.number().int().min(1, 'Quantity must be at least 1'),
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
});

const UpdateTransferSchema = z.object({
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
  quantity_transfer: z.number().int().min(1).optional(),
});

const DecrementStockSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const RESERVED_STATUSES = ['Pending', 'Approved', 'In-Transit'];

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'product-service', status: 'ok', port: PORT });
});

// ── Products ──────────────────────────────────────────────────────────────────
app.patch('/products/:id/decrement', validate(DecrementStockSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const supabase = getSupabase(req);

    // 1. Fetch current stock
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchErr) return res.status(404).json({ error: 'Product not found' });
    
    const currentStock = Number(product.stock) || 0;
    const newStock = Math.max(0, currentStock - quantity);

    // 2. Update with new stock
    const { data, error: updateErr } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error(`[ProductService] Error updating stock for product ${id}:`, updateErr.message);
      return res.status(500).json({ error: updateErr.message });
    }
    
    console.log(`[ProductService] Successfully decremented stock for product ${id}. New stock: ${data.stock}`);
    res.json({ success: true, newStock: data.stock });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase(req);
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name, price, stock, category, low_stock_threshold')
      .order('id', { ascending: true });
    
    if (pErr) {
      console.error('Error fetching products:', pErr);
      return res.status(500).json({ error: pErr.message });
    }

    const { data: transfers, error: tErr } = await supabase
      .from('requesttransfers')
      .select('id, product_id, quantity_transfer, transfer_status')
      .order('created_at', { ascending: false });
    
    if (tErr) {
      console.error('Error fetching transfers:', tErr);
      return res.status(500).json({ error: tErr.message });
    }

    const rows = transfers || [];
    const enriched = (products || []).map((product: any) => {
      try {
        const reserved_transfer_qty = rows
          .filter(
            (r: any) =>
              r && 
              String(r.product_id) === String(product.id) &&
              RESERVED_STATUSES.includes(r.transfer_status)
          )
          .reduce((sum: number, r: any) => sum + (Number(r.quantity_transfer) || 0), 0);

        const available_stock = Math.max(0, (Number(product.stock) || 0) - reserved_transfer_qty);
        return { ...product, reserved_transfer_qty, available_stock };
      } catch (err) {
        console.error(`Error enriching product ${product?.id}:`, err);
        return product;
      }
    });

    res.json({ products: enriched, transfers: rows });
  } catch (err: any) {
    console.error('Unhandled error in /products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/products/:id', validate(UpdateProductSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await getSupabase(req)
      .from('products')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ product: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Transfers ─────────────────────────────────────────────────────────────────
app.get('/transfers', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .select('id, product_id, quantity_transfer, transfer_status')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ transfers: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/transfers', validate(CreateTransferSchema), async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .insert(req.body)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ transfer: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/transfers/:id', validate(UpdateTransferSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ transfer: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ product-service running on port ${PORT}`);
});
