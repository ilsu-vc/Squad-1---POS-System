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

const PORT = process.env.PORT || 4005;

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
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single User ───────────────────────────────────────────────────────────
app.get('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', id)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update User Role ──────────────────────────────────────────────────────────
app.put('/users/:id/role', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'role is required' });

  try {
    // Fetch matching role row first (same logic as original RoleManagementView)
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
    res.status(500).json({ error: err.message });
  }
});

// ── Toggle Active Status ──────────────────────────────────────────────────────
app.put('/users/:id/active', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;
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
    res.status(500).json({ error: err.message });
  }
});

// ── Reset User Password (admin action via Supabase) ───────────────────────────
app.post('/users/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const { error } = await getSupabase(req).auth.resetPasswordForEmail(email);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: `Password reset email sent to ${email}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ role-service running on port ${PORT}`);
});
