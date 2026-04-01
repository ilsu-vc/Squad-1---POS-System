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

const PORT = process.env.PORT || 4003;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'sales-service', status: 'ok', port: PORT });
});

// ── Initiate Transaction ──────────────────────────────────────────────────────
app.post('/transactions/initiate', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('transactions')
      .insert({ status: 'pending' })
      .select('id')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ transactionId: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Complete Payment ──────────────────────────────────────────────────────────
app.post('/transactions/complete', async (req: Request, res: Response) => {
  const {
    transactionId,
    vat,
    subtotal,
    totalAmount,
    paymentMethod,
    itemsCount,
    items,
    discountType,
    discountAmount,
    notes,
    tags,
  } = req.body;

  if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });

  try {
    // Call the existing Supabase RPC — no schema change needed
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

    // Save optional notes/tags
    if (notes !== undefined || tags !== undefined) {
      await getSupabase(req)
        .from('transactions')
        .update({ notes, tags })
        .eq('id', transactionId);
    }

    res.json({ receiptNumber, transactionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cancel Transaction ────────────────────────────────────────────────────────
app.post('/transactions/cancel', async (req: Request, res: Response) => {
  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });
  try {
    const { error } = await getSupabase(req)
      .from('transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Transaction Notes/Tags ─────────────────────────────────────────────
app.put('/transactions/:id/notes', async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ sales-service running on port ${PORT}`);
});
