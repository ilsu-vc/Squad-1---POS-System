import { Injectable, Scope, Inject, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(@Inject(REQUEST) private request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_POS_INVENTORY_SUPABASE_URL as string;
    this.logger.log(`Supabase connecting to: ${supabaseUrl}`);
    const supabaseKey = process.env.NEXT_PUBLIC_POS_INVENTORY_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required env vars: NEXT_PUBLIC_POS_INVENTORY_SUPABASE_URL or NEXT_PUBLIC_POS_INVENTORY_SUPABASE_ANON_KEY');
    }

    const serviceRoleKey = process.env.POS_INVENTORY_SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
    
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
