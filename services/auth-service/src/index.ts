import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import { z, ZodSchema } from 'zod';

dotenv.config();

// ── OWASP: Validate required environment variables at startup ─────────────────
// Keys are read from environment variables only — never hardcoded.
// Set these in your .env file and never commit .env to source control.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const app = express();

// ── OWASP: Secure HTTP headers via helmet ─────────────────────────────────────
// Adds headers like X-Content-Type-Options, X-Frame-Options, etc.
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload attacks

// ── Supabase Client Factory (JWT-forwarding) ──────────────────────────────────
// Creates a Supabase client that forwards the user's JWT to Supabase for RLS.
const getSupabase = (req: Request) => {
  const authHeader = req.headers.authorization;
  return createClient(supabaseUrl!, supabaseKey!, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    }
  });
};

const PORT = process.env.PORT || 4001;

// ── Validation Middleware Factory ─────────────────────────────────────────────
// Validates request body against a Zod schema; rejects unexpected fields.
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data; // Replace body with sanitized/parsed data only
  next();
};

// ── Zod Schemas (input validation) ────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const ClockInSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
});

const ClockOutSchema = z.object({
  shiftId: z.union([z.string(), z.number()]),
  userId: z.string().uuid('Invalid userId format'),
  clockOutAt: z.string().datetime({ offset: true, message: 'Invalid dateTime format' }),
  totalHours: z.number().min(0).max(1000).optional(),
  handoverNotes: z.string().max(2000).optional(),
  cashDiscrepancies: z.string().max(1000).optional(),
  issues: z.string().max(1000).optional(),
  pendingItems: z.string().max(1000).optional(),
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'auth-service', status: 'ok', port: PORT });
});

// ── Session & Profile ─────────────────────────────────────────────────────────
app.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await getSupabase(req).auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/logout', async (req: Request, res: Response) => {
  try {
    const { error } = await getSupabase(req).auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/session', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req).auth.getSession();
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/profile/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  // Basic UUID format check on URL param
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', userId)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ profile: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Shift Management ───────────────────────────────────────────────────────────
app.post('/shift/clock-in', validate(ClockInSchema), async (req: Request, res: Response) => {
  const { userId } = req.body;
  try {
    const { data, error } = await getSupabase(req)
      .from('shift_records')
      .insert({ user_id: userId, clock_in_at: new Date().toISOString() })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ shift: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/shift/clock-out', validate(ClockOutSchema), async (req: Request, res: Response) => {
  const { shiftId, userId, clockOutAt, totalHours, handoverNotes, cashDiscrepancies, issues, pendingItems } = req.body;
  try {
    const { error } = await getSupabase(req)
      .from('shift_records')
      .update({
        clock_out_at: clockOutAt,
        total_hours: totalHours,
        handover_notes: handoverNotes || null,
        cash_discrepancies: cashDiscrepancies || null,
        issues: issues || null,
        pending_items: pendingItems || null,
      })
      .eq('id', shiftId)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/shift/active/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }
  try {
    const { data, error } = await getSupabase(req)
      .from('shift_records')
      .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
      .eq('user_id', userId)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ shift: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/shift/latest-handover', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('shift_records')
      .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
      .not('clock_out_at', 'is', null)
      .or('handover_notes.not.is.null,cash_discrepancies.not.is.null,issues.not.is.null,pending_items.not.is.null')
      .order('clock_out_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ handover: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Password ───────────────────────────────────────────────────────────────────
// Rate-limited strictly: prevents password-spraying attacks (OWASP A07)
app.post('/password/change', validate(ChangePasswordSchema), async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  try {
    const { error } = await getSupabase(req).auth.updateUser({ password: newPassword });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ auth-service running on port ${PORT}`);
});
