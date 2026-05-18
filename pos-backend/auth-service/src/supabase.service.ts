import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private client: SupabaseClient;
  private auditClient: SupabaseClient;

  constructor(@Inject(REQUEST) private request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_AUTH_SUPABASE_URL as string;
    const supabaseKey = process.env.NEXT_PUBLIC_POS_AUTH_SUPABASE_ANON_KEY as string;
    const auditUrl = process.env.POS_AUTH_AUDIT_SUPABASE_URL as string;
    const auditKey = process.env.POS_AUTH_AUDIT_SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables for Main DB');
    }

    const serviceRoleKey = (process.env.POS_AUTH_SUPABASE_SERVICE_ROLE_KEY || supabaseKey) as string;
    
    // Main Database Client (Profiles, Roles)
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Audit Database Client (Shifts, Logs) - Fallback to main if keys missing
    if (auditUrl && auditKey) {
      this.auditClient = createClient(auditUrl, auditKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } else {
      this.auditClient = this.client;
    }
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAuditClient(): SupabaseClient {
    return this.auditClient;
  }
}
