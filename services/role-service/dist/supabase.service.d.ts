import { SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';
export declare class SupabaseService {
    private request;
    private client;
    constructor(request: Request);
    getClient(): SupabaseClient;
}
