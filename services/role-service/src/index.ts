import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
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

const PORT = process.env.PORT || 4005;

// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.body = result.data; // Sanitized data only — extra fields are stripped
  next();
};

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ['admin', 'manager', 'cashier', 'staff'] as const;

const UpdateRoleSchema = z.object({
  role: z.enum(ALLOWED_ROLES, 'Invalid role value'),
});

const ToggleActiveSchema = z.object({
  is_active: z.boolean(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'role-service', status: 'ok', port: PORT });
});

// ── List Users ────────────────────────────────────────────────────────────────
app.get('/users', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .order('email', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Single User ───────────────────────────────────────────────────────────
app.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user id format' });
  }
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update User Role ──────────────────────────────────────────────────────────
app.put('/users/:id/role', validate(UpdateRoleSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user id format' });
  }
  try {
    const { data: roleRow, error: roleError } = await getSupabase(req)
      .from('roles')
      .select('id, role_key')
      .eq('role_key', role)
      .single();
    if (roleError) return res.status(500).json({ error: roleError.message });

    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .update({ role, role_id: roleRow.id })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Toggle Active Status ──────────────────────────────────────────────────────
app.put('/users/:id/active', validate(ToggleActiveSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid user id format' });
  }
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Reset User Password (admin action) ───────────────────────────────────────
app.post('/users/reset-password', validate(ResetPasswordSchema), async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const { error } = await getSupabase(req).auth.resetPasswordForEmail(email);
    if (error) return res.status(500).json({ error: error.message });
    // Generic success message to avoid email enumeration
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ role-service running on port ${PORT}`);
});
