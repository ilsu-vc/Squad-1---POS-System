import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import { z, ZodSchema } from 'zod';
import amqp from 'amqplib';

dotenv.config();

// ── OWASP: Validate required environment variables at startup ─────────────────
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
app.use(express.json({ limit: '10kb' })); 

// ── Supabase Client Factory (JWT-forwarding) ──────────────────────────────────
const getSupabase = (req: Request) => {
  const authHeader = req.headers.authorization;
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });
};

const PORT = process.env.PORT || 4002;

// ── RabbitMQ Publisher ────────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'inventory_events';

let rabbitChannel: amqp.Channel | null = null;

async function connectRabbitMQ(retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      rabbitChannel = await connection.createChannel();
      await rabbitChannel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      console.log('✅ [InventoryService] Connected to RabbitMQ');

      connection.on('error', (err) => {
        console.error('[InventoryService] RabbitMQ error:', err.message);
        rabbitChannel = null;
      });
      connection.on('close', () => {
        console.warn('[InventoryService] RabbitMQ closed. Reconnecting...');
        rabbitChannel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });
      return;
    } catch (err: any) {
      console.warn(`[InventoryService] RabbitMQ connection failed (${i+1}/${retries}): ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 3000));
    }
  }
}

function publishStockLow(product: any, currentStock: number) {
  if (!rabbitChannel) return;
  const payload = {
    event: 'stock.low',
    data: {
      id: product.id,
      name: product.name,
      stock: currentStock,
      threshold: product.low_stock_threshold,
    },
    timestamp: new Date().toISOString()
  };
  rabbitChannel.publish(EXCHANGE_NAME, 'stock.low', Buffer.from(JSON.stringify(payload)));
  console.log(`[InventoryService] Published stock.low for product ${product.id}`);
}

// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data;
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
  product_name: z.string().optional(),
  quantity_transfer: z.number().int().min(1, 'Quantity must be at least 1'),
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
  requested_by: z.string().optional(),
  destination_branch_id: z.union([z.string(), z.number()]).optional(),
  destination_branch_name: z.string().optional(),
});

const UpdateTransferSchema = z.object({
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
  quantity_transfer: z.number().int().min(1).optional(),
});

const DecrementStockSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const StockAdjustSchema = z.object({
  sku: z.union([z.string(), z.number()]),
  amount: z.number().int(),
  reason: z.string().optional(),
});

const StockTransferSchema = CreateTransferSchema;

const RESERVED_STATUSES = ['Pending', 'Approved', 'In-Transit'];

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'inventory-service', status: 'ok', port: PORT, rabbitmq: rabbitChannel ? 'connected' : 'disconnected' });
});

// ── Branches ──────────────────────────────────────────────────────────────────
app.get('/branches', async (req: Request, res: Response) => {
  try {
    const { data: branches, error } = await getSupabase(req)
      .from('storebranches')
      .select('id, branch_name')
      .order('id', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ branches: branches || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Products ──────────────────────────────────────────────────────────────────
app.get('/products/:sku', async (req: Request, res: Response) => {
  const { sku } = req.params;
  try {
    const supabase = getSupabase(req);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', sku)
      .single();

    if (error) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/products/:sku/stock', async (req: Request, res: Response) => {
  const { sku } = req.params;
  try {
    const supabase = getSupabase(req);
    // Optimized: Only select stock column and use .single() for p95 < 100ms
    const { data, error } = await supabase
      .from('products')
      .select('stock')
      .eq('id', sku)
      .single();

    if (error) return res.status(404).json({ error: 'Product not found' });
    res.json({ sku, stock: data.stock });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/products/:id/decrement', validate(DecrementStockSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const supabase = getSupabase(req);
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, name, stock, low_stock_threshold')
      .eq('id', id)
      .single();

    if (fetchErr) return res.status(404).json({ error: 'Product not found' });
    
    const currentStock = Number(product.stock) || 0;
    const newStock = Math.max(0, currentStock - quantity);

    const { data, error: updateErr } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // Emit stock.low event if threshold crossed
    const threshold = Number(product.low_stock_threshold);
    if (threshold > 0 && data.stock <= threshold) {
      publishStockLow(product, data.stock);
    }
    
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
    
    if (pErr) return res.status(500).json({ error: pErr.message });

    const { data: transfers, error: tErr } = await supabase
      .from('requesttransfers')
      .select('id, product_id, quantity_transfer, transfer_status')
      .order('created_at', { ascending: false });
    
    if (tErr) return res.status(500).json({ error: tErr.message });

    const rows = transfers || [];
    const enriched = (products || []).map((product: any) => {
      const reserved_transfer_qty = rows
        .filter((r: any) => String(r.product_id) === String(product.id) && RESERVED_STATUSES.includes(r.transfer_status))
        .reduce((sum: number, r: any) => sum + (Number(r.quantity_transfer) || 0), 0);
      const available_stock = Math.max(0, (Number(product.stock) || 0) - reserved_transfer_qty);
      return { ...product, reserved_transfer_qty, available_stock };
    });

    res.json({ products: enriched, transfers: rows });
  } catch (err: any) {
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

// ── Stock Management ──────────────────────────────────────────────────────────
app.post('/stock/adjust', validate(StockAdjustSchema), async (req: Request, res: Response) => {
  const { sku, amount } = req.body;
  try {
    const supabase = getSupabase(req);
    // 1. Fetch current stock and threshold
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, name, stock, low_stock_threshold')
      .eq('id', sku)
      .single();

    if (fetchErr) return res.status(404).json({ error: 'Product not found' });

    const currentStock = Number(product.stock) || 0;
    const newStock = currentStock + amount;

    // 2. Update with new stock
    const { data, error: updateErr } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', sku)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // 3. Emit stock.low event if threshold crossed
    const threshold = Number(product.low_stock_threshold);
    if (threshold > 0 && data.stock <= threshold) {
      publishStockLow(product, data.stock);
    }

    res.json({ success: true, sku, newStock: data.stock });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/stock/transfer', validate(StockTransferSchema), async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('requesttransfers')
      .insert(req.body)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ transfer: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Transfers (Legacy) ────────────────────────────────────────────────────────
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

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ inventory-service running on port ${PORT}`);
  });
});
