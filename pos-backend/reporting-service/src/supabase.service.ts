import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private client: SupabaseClient;

  constructor(@Inject(REQUEST) private request: any) {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_REPORTING_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_POS_REPORTING_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required env vars');
    }

    const serviceRoleKey = process.env.POS_REPORTING_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
    
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}

@Injectable()
export class SupabaseServiceAdmin {
  private client: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_REPORTING_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_POS_REPORTING_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required env vars');
    }
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
