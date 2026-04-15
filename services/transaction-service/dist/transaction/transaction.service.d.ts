import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
export declare class TransactionService {
    private request;
    private readonly supabaseService;
    private readonly rabbitmqService;
    private readonly logger;
    constructor(request: any, supabaseService: SupabaseService, rabbitmqService: RabbitMQService);
    decrementStock(items: any[]): Promise<void>;
}
