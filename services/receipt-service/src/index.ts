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

const PORT = process.env.PORT || 4006;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'receipt-service', status: 'ok', port: PORT });
});

// ── Print Receipt ─────────────────────────────────────────────────────────────
//  Replaces the browser-stub in printer-service.ts
//  In the future: swap the console.log for a real thermal printer call (node-thermal-printer)
app.post('/print', async (req: Request, res: Response) => {
  const { receiptNumber, items, vatable, vatAmount, total, splitPayments } = req.body;
  try {
    console.log('=== RECEIPT (receipt-service) ===');
    console.log('Receipt #:', receiptNumber || '000000');
    console.log('Date:', new Date().toLocaleString());
    console.log('Items:', JSON.stringify(items, null, 2));
    console.log('VATable Sales:', (vatable ?? 0).toFixed(2));
    console.log('VAT Amount (12%):', (vatAmount ?? 0).toFixed(2));
    console.log('TOTAL: PHP', (total ?? 0).toFixed(2));

    if (splitPayments && splitPayments.length > 0) {
      console.log('--- SPLIT PAYMENT ---');
      splitPayments.forEach((p: any, i: number) => {
        const label = p.method.charAt(0).toUpperCase() + p.method.slice(1);
        let detail = `  Payment ${i + 1}: ${label} - PHP ${parseFloat(p.amount).toFixed(2)}`;
        if (p.method === 'card') detail += ` (Ref: ${p.refNo}, Card: ****${p.cardLast4})`;
        if (p.method === 'mobile') detail += ` (${p.mobileProvider}, Ref: ${p.refNo})`;
        console.log(detail);
      });
    }
    console.log('=================================');

    res.json({ success: true, receiptNumber });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fetch Receipt Data ─────────────────────────────────────────────────────────
app.get('/receipt/:transactionId', async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  try {
    const { data, error } = await getSupabase(req)
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ receipt: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ receipt-service running on port ${PORT}`);
});
