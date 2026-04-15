import { SupabaseService } from '../supabase.service';
export declare class ShiftController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    clockIn(body: any): Promise<{
        shift: any;
    }>;
    clockOut(body: any): Promise<{
        success: boolean;
    }>;
    getActiveShift(userId: string): Promise<{
        shift: {
            id: any;
            user_id: any;
            clock_in_at: any;
            clock_out_at: any;
            total_hours: any;
            created_at: any;
            handover_notes: any;
            cash_discrepancies: any;
            issues: any;
            pending_items: any;
        } | null;
    }>;
    getLatestHandover(): Promise<{
        handover: {
            id: any;
            user_id: any;
            clock_in_at: any;
            clock_out_at: any;
            total_hours: any;
            created_at: any;
            handover_notes: any;
            cash_discrepancies: any;
            issues: any;
            pending_items: any;
        } | null;
    }>;
}
