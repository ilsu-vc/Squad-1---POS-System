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

const PORT = process.env.PORT || 4004;

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ service: 'reporting-service', status: 'ok', port: PORT });
});

// ── Activity Logs ─────────────────────────────────────────────────────────────
app.get('/activity-logs', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase(req)
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ logs: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/activity-logs', async (req: Request, res: Response) => {
  const { userId, userEmail, actionType, actionDetails, entityType, entityId } = req.body;
  if (!userId || !actionType) return res.status(400).json({ error: 'userId and actionType are required' });
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
    res.status(500).json({ error: err.message });
  }
});

// ── Shift Records ─────────────────────────────────────────────────────────────
app.get('/shift-records', async (req: Request, res: Response) => {
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ reporting-service running on port ${PORT}`);
});
