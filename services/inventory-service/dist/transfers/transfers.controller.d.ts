import { SupabaseService } from '../supabase.service';
export declare class TransfersController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    getTransfers(): Promise<{
        transfers: {
            id: any;
            product_id: any;
            product_name: any;
            quantity_transfer: any;
            transfer_status: any;
            requested_by: any;
            destination_branch_id: any;
            destination_branch_name: any;
            created_at: any;
        }[];
    }>;
    createTransfer(body: any): Promise<{
        transfer: any;
    }>;
    updateTransfer(id: string, body: any): Promise<{
        transfer: any;
    }>;
}
