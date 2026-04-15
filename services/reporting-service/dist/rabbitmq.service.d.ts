import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseServiceAdmin } from './supabase.service';
export declare class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly supabaseAdmin;
    private readonly logger;
    private connection;
    private channel;
    private readonly RABBITMQ_URL;
    private readonly EXCHANGE_NAME;
    private readonly QUEUE_NAME;
    constructor(supabaseAdmin: SupabaseServiceAdmin);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    isConnected(): boolean;
}
