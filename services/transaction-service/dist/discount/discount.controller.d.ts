import { SupabaseService } from '../supabase.service';
export declare class DiscountController {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    validateDiscount(body: any): Promise<{
        valid: boolean;
        reason: string;
        message: string;
        discount?: undefined;
    } | {
        valid: boolean;
        discount: {
            code: any;
            type: any;
            value: any;
            computedDiscount: number;
            description: any;
        };
        reason?: undefined;
        message?: undefined;
    }>;
}
