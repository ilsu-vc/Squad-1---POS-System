import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Defensive initialization for build-time safety
export const supabase = createClient(
    supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
);
