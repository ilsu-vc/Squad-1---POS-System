import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
export declare class InventoryController {
    private readonly supabaseService;
    private readonly rabbitmqService;
    constructor(supabaseService: SupabaseService, rabbitmqService: RabbitMQService);
    getBranches(): Promise<{
        branches: {
            id: any;
            branch_name: any;
        }[];
    }>;
    getProducts(): Promise<{
        products: any[];
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
    getProduct(sku: string): Promise<{
        product: any;
    }>;
    getProductStock(sku: string): Promise<{
        sku: string;
        stock: any;
    }>;
    updateProduct(id: string, body: any): Promise<{
        product: any;
    }>;
    decrementStock(id: string, body: any): Promise<{
        success: boolean;
        newStock: any;
    }>;
}
