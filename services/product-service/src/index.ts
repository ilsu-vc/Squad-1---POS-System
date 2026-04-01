import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const getSupabase = (req: any) => {
  const authHeader = req.headers.authorization;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    }
  });
};

const PORT = process.env.PORT || 4002;

const RESERVED_STATUSES = ['Pending', 'Approved', 'In-Transit'];

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'product-service', status: 'ok', port: PORT });
});

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/products', async (req: Request, res: Response) => {
  try {
    const { data: products, error: pErr } = await getSupabase(req)
      .from('products')
      .select('id, name, price, stock, category, low_stock_threshold')
      .order('id', { ascending: true });
    if (pErr) return res.status(500).json({ error: pErr.message });

    const { data: transfers, error: tErr } = await getSupabase(req)
      .from('requesttransfers')
      .select('id, product_id, quantity_transfer, transfer_status')
      .order('created_at', { ascending: false });
    if (tErr) return res.status(500).json({ error: tErr.message });

    const rows = transfers || [];

    const enriched = (products || []).map((product: any) => {
      const reserved_transfer_qty = rows
        .filter(
          (req: any) =>
            String(req.product_id) === String(product.id) &&
            RESERVED_STATUSES.includes(req.transfer_status)
        )
        .reduce((sum: number, req: any) => sum + (Number(req.quantity_transfer) || 0), 0);

      const available_stock = Math.max(0, (Number(product.stock) || 0) - reserved_transfer_qty);

      return { ...product, reserved_transfer_qty, available_stock };
    });

    res.json({ products: enriched, transfers: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { data, error } = await getSupabase(req)
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ product: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/transfers', async (req: Request, res: Response) => {
  const payload = req.body;
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .insert(payload)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ transfer: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/transfers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ transfer: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ product-service running on port ${PORT}`);
});
