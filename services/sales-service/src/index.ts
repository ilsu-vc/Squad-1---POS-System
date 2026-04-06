import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z, ZodSchema } from 'zod';

dotenv.config();

// ── OWASP: Validate required environment variables at startup ─────────────────
// Keys are never hardcoded — always loaded from environment variables.
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

const PORT = process.env.PORT || 4003;

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// General: 100 requests / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  statusCode: 429,
});

// Strict: 20 requests / 15 min for payment endpoints to prevent fraud
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please try again later.' },
  statusCode: 429,
});

// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data; // Replace body with sanitized/parsed data, rejects extra fields
  next();
};

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const CompleteTransactionSchema = z.object({
  transactionId: z.string().uuid('Invalid transactionId'),
  vat: z.number().min(0).max(1_000_000).optional(),
  subtotal: z.number().min(0).max(10_000_000).optional(),
  totalAmount: z.number().min(0).max(10_000_000),
  paymentMethod: z.string().max(50),
  itemsCount: z.number().int().min(1),
  items: z.array(z.any()).min(1, 'At least one item is required'),
  discountType: z.string().max(50).optional(),
  discountAmount: z.number().min(0).max(10_000_000).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

const CancelTransactionSchema = z.object({
  transactionId: z.string().uuid('Invalid transactionId'),
});

const UpdateNotesSchema = z.object({
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', generalLimiter, (req: Request, res: Response) => {
  res.json({ service: 'sales-service', status: 'ok', port: PORT });
});

// ── Initiate Transaction ──────────────────────────────────────────────────────
app.post('/transactions/initiate', paymentLimiter, async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('transactions')
      .insert({ status: 'pending' })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ transactionId: data.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Complete Payment ──────────────────────────────────────────────────────────
app.post('/transactions/complete', paymentLimiter, validate(CompleteTransactionSchema), async (req: Request, res: Response) => {
  const { transactionId, vat, subtotal, totalAmount, paymentMethod, itemsCount, items, discountType, discountAmount, notes, tags } = req.body;
  try {
    const { data: receiptRows, error: rpcErr } = await getSupabase(req).rpc(
      'confirm_payment_and_issue_receipt',
      {
        p_transaction_id: transactionId,
        p_vat: Number(vat ?? 0),
        p_subtotal: Number(subtotal ?? 0),
        p_total_amount: Number(totalAmount ?? 0),
        p_payment_method: paymentMethod,
        p_items_count: itemsCount,
        p_items: items,
        p_discount_type: discountType || 'None',
        p_discount_amount: Number(discountAmount ?? 0),
      }
    );
    if (rpcErr) return res.status(500).json({ error: rpcErr.message });

    const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
    const receiptNumber = receipt?.o_receipt_number ?? null;

    if (notes !== undefined || tags !== undefined) {
      await getSupabase(req).from('transactions').update({ notes, tags }).eq('id', transactionId);
    }

    res.json({ receiptNumber, transactionId });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Cancel Transaction ────────────────────────────────────────────────────────
app.post('/transactions/cancel', generalLimiter, validate(CancelTransactionSchema), async (req: Request, res: Response) => {
  const { transactionId } = req.body;
  try {
    const { error } = await getSupabase(req)
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get All Transactions (for History page & Dashboard) ───────────────────────
app.get('/transactions', generalLimiter, async (req: Request, res: Response) => {
  try {
    const { data: txns, error: txnErr } = await getSupabase(req)
      .from('transactions')
      .select(`
        id,
        status,
        total_amount,
        vat,
        subtotal,
        payment_method,
        items_count,
        discount_type,
        discount_amount,
        notes,
        tags,
        created_at,
        transaction_items (
          item_name,
          category,
          unit_price,
          quantity
        ),
        receipts (
          receipt_number
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (txnErr) return res.status(500).json({ error: txnErr.message });

    const formatted = (txns || []).map((t: any) => {
      const createdAt = new Date(t.created_at);
      const h = createdAt.getHours();
      const hour =
        h >= 12 ? (h === 12 ? '12PM' : `${h - 12}PM`) : h === 0 ? '12AM' : `${h}AM`;

      const rawAmount = Number(t.total_amount ?? 0);
      const receiptNumber =
        Array.isArray(t.receipts) && t.receipts.length > 0
          ? t.receipts[0].receipt_number ?? null
          : t.receipts?.receipt_number ?? null;

      return {
        id: t.id,
        receiptNumber,
        date: createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: createdAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        hour,
        amount: `₱${rawAmount.toFixed(2)}`,
        rawAmount,
        method: t.payment_method ?? 'Unknown',
        itemsCount: Number(t.items_count ?? 0),
        items: (t.transaction_items || []).map((item: any) => ({
          name: item.item_name,
          qty: Number(item.quantity),
          price: Number(item.unit_price),
          category: item.category ?? undefined,
        })),
        subtotal: Number(t.subtotal ?? 0),
        tax: Number(t.vat ?? 0),
        discountType: t.discount_type ?? 'None',
        discountAmount: Number(t.discount_amount ?? 0),
        notes: t.notes ?? undefined,
        tags: Array.isArray(t.tags) ? t.tags : [],
        type: 'sale' as const,
      };
    });

    res.json({ transactions: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update Transaction Notes/Tags ─────────────────────────────────────────────
app.put('/transactions/:id/notes', generalLimiter, validate(UpdateNotesSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes, tags } = req.body;
  try {
    const { error } = await getSupabase(req)
      .from('transactions')
      .update({ notes, tags })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ sales-service running on port ${PORT}`);
});
