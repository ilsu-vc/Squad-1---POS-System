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

const PORT = process.env.PORT || 4004;

// ── Rate Limiters ─────────────────────────────────────────────────────────────
// 100 requests / 15 min per IP — reporting endpoints are generally read-heavy
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
  req.body = result.data; // Replace body with sanitized/parsed data — extra fields stripped
  next();
};

// ── Zod Schemas ───────────────────────────────────────────────────────────────
// Activity log entries are security-sensitive — strongly typed to prevent injection
const ALLOWED_ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'SALE', 'REFUND', 'PRODUCT_UPDATE', 'ROLE_CHANGE',
  'SHIFT_CLOCK_IN', 'SHIFT_CLOCK_OUT', 'PASSWORD_CHANGE', 'USER_DEACTIVATED',
  'USER_ACTIVATED', 'TRANSFER_REQUEST', 'TRANSFER_STATUS_UPDATE', 'ERROR',
  'ORDER_HELD', 'ORDER_RESUMED', 'ORDER_DELETED', 'DISCOUNT_APPLIED',
] as const;

const CreateActivityLogSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  userEmail: z.string().email('Invalid email format').max(255).optional(),
  actionType: z.enum(ALLOWED_ACTION_TYPES, 'Invalid action type'),
  actionDetails: z.string().max(2000).optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.union([z.string().max(100), z.number()]).optional(),
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', generalLimiter, (req: Request, res: Response) => {
  res.json({ service: 'reporting-service', status: 'ok', port: PORT });
});

// ── Activity Logs ─────────────────────────────────────────────────────────────
app.get('/activity-logs', generalLimiter, async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ logs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Strictly validated — activity logs are audit records and must not accept arbitrary data
app.post('/activity-logs', generalLimiter, validate(CreateActivityLogSchema), async (req: Request, res: Response) => {
  const { userId, userEmail, actionType, actionDetails, entityType, entityId } = req.body;
  try {
    const { error } = await getSupabase(req).from('user_activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: actionType,
      action_details: actionDetails,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shift Records ─────────────────────────────────────────────────────────────
app.get('/shift-records', generalLimiter, async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('shift_records')
      .select(`
        id,
        clock_in_at,
        clock_out_at,
        total_hours,
        handover_notes,
        cash_discrepancies,
        issues,
        pending_items,
        user_profiles (full_name, email, role)
      `)
      .order('clock_in_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ records: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ reporting-service running on port ${PORT}`);
});
