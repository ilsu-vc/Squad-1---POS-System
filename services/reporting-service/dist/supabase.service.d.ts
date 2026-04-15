import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private request;
    private client;
    constructor(request: any);
    getClient(): SupabaseClient;
}
export declare class SupabaseServiceAdmin {
    private client;
    constructor();
    getClient(): SupabaseClient;
}
