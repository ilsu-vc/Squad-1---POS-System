import { SupabaseService } from '../supabase.service';
export declare class ReceiptController {
    private readonly supabaseService;
    constructor(supabaseService: SupabaseService);
    printReceipt(body: any): {
        success: boolean;
        receiptNumber: any;
    };
    getReceipt(transactionId: string): Promise<{
        receipt: any;
    }>;
}
