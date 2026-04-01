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

const PORT = process.env.PORT || 4001;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'auth-service', status: 'ok', port: PORT });
});

// ── Session & Profile ─────────────────────────────────────────────────────────
app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await getSupabase(req).auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/logout', async (req: Request, res: Response) => {
  try {
    const { error } = await getSupabase(req).auth.signOut();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/session', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req).auth.getSession();
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/profile/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const { data, error } = await getSupabase(req)
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', userId)
      .single();
    if (error) return res.status(404).json({ error: error.message });
    res.json({ profile: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shift Management ───────────────────────────────────────────────────────────
app.post('/shift/clock-in', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const { data, error } = await getSupabase(req)
      .from('shift_records')
      .insert({ user_id: userId, clock_in_at: new Date().toISOString() })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ shift: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/shift/clock-out', async (req: Request, res: Response) => {
  const { shiftId, userId, clockOutAt, totalHours, handoverNotes, cashDiscrepancies, issues, pendingItems } = req.body;
  if (!shiftId) return res.status(400).json({ error: 'shiftId is required' });
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/shift/active/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── Password ───────────────────────────────────────────────────────────────────
app.post('/password/change', async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'newPassword is required' });
  try {
    const { error } = await getSupabase(req).auth.updateUser({ password: newPassword });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ auth-service running on port ${PORT}`);
});
