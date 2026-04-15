import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private connection;
    private channel;
    private readonly RABBITMQ_URL;
    private readonly EXCHANGE_NAME;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    publishStockLow(product: any, currentStock: number): void;
    isConnected(): boolean;
}
