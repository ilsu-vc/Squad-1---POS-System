import { Response } from 'express';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
export declare class InventoryController {
    private readonly supabaseService;
    private readonly rabbitmqService;
    constructor(supabaseService: SupabaseService, rabbitmqService: RabbitMQService);
    health(): {
        status: string;
        service: string;
        port: number;
    };
    getBranches(): Promise<{
        branches: {
            id: any;
            branch_name: any;
        }[];
    }>;
    getProducts(res: Response): Promise<Response<any, Record<string, any>>>;
    getProductStock(sku: string, res: Response): Promise<Response<any, Record<string, any>>>;
    getProduct(sku: string): Promise<{
        product: any;
    }>;
    updateProduct(id: string, body: any): Promise<{
        product: any;
    }>;
    decrementStock(id: string, body: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
