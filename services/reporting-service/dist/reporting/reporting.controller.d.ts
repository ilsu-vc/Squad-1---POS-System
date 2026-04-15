import { SupabaseService } from '../supabase.service';
export declare class ReportingController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    getActivityLogs(): Promise<{
        logs: any[];
    }>;
    createActivityLog(body: any): Promise<{
        success: boolean;
    }>;
    getShiftRecords(): Promise<{
        records: {
            id: any;
            clock_in_at: any;
            clock_out_at: any;
            total_hours: any;
            handover_notes: any;
            cash_discrepancies: any;
            issues: any;
            pending_items: any;
            user_profiles: {
                full_name: any;
                email: any;
                role: any;
            }[];
        }[];
    }>;
}
