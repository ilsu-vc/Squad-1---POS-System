import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
export declare class StockController {
    private readonly supabaseService;
    private readonly rabbitmqService;
    constructor(supabaseService: SupabaseService, rabbitmqService: RabbitMQService);
    adjustStock(body: any): Promise<{
        success: boolean;
        sku: any;
        newStock: any;
    }>;
    transferStock(body: any): Promise<{
        transfer: any;
    }>;
}
