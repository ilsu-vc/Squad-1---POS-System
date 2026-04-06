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
app.use(express.json({ limit: '10kb' }));

// ── Supabase Client Factory (JWT-forwarding) ──────────────────────────────────
const getSupabase = (req: Request) => {
  const authHeader = req.headers.authorization;
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  });
};

const PORT = process.env.PORT || 4006;

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// 100 requests / 15 min per IP — gracefully returns 429 with Retry-After header
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
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
const PrintReceiptSchema = z.object({
  receiptNumber: z.union([z.string().max(50), z.number()]).optional(),
  items: z.array(
    z.object({
      name: z.string().max(200),
      quantity: z.number().int().min(1),
      price: z.number().min(0),
    })
  ).min(1, 'At least one item is required'),
  vatable: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0),
  splitPayments: z.array(
    z.object({
      method: z.string().max(50),
      amount: z.union([z.string(), z.number()]),
      refNo: z.string().max(100).optional(),
      cardLast4: z.string().max(4).optional(),
      mobileProvider: z.string().max(50).optional(),
    })
  ).optional(),
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', generalLimiter, (req: Request, res: Response) => {
  res.json({ service: 'receipt-service', status: 'ok', port: PORT });
});

// ── Print Receipt ────────────────────────────────────────────────────────────
// Validates structure before passing to printer to prevent injection via receipt data
app.post('/print', generalLimiter, validate(PrintReceiptSchema), async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Fetch Receipt Data ─────────────────────────────────────────────────────────
app.get('/receipt/:transactionId', generalLimiter, async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  // Reject non-UUID formats to prevent path traversal/injection
  if (!/^[0-9a-f-]{36}$/i.test(transactionId)) {
    return res.status(400).json({ error: 'Invalid transactionId format' });
  }
  try {
    const { data, error } = await getSupabase(req)
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ receipt: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ receipt-service running on port ${PORT}`);
});
