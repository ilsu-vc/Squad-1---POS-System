import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private client: SupabaseClient;

  constructor(@Inject(REQUEST) private request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_ROLE_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_POS_ROLE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required env vars: NEXT_PUBLIC_POS_ROLE_SUPABASE_URL or NEXT_PUBLIC_POS_ROLE_SUPABASE_ANON_KEY');
    }

    const authHeader = this.request.headers.authorization;
    this.client = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
      auth: {
        persistSession: false,
      }
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
