import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly POS_INVENTORY_RABBITMQ_URL = process.env.POS_INVENTORY_RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly EXCHANGE_NAME = 'inventory_events';

  async onModuleInit() {
    await this.connect(5);
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private async connect(retries: number) {
    for (let i = 0; i < retries; i++) {
      try {
        this.connection = await amqp.connect(this.POS_INVENTORY_RABBITMQ_URL);
        this.channel = await this.connection.createChannel();
        await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', { durable: true });
        this.logger.log('✅ [InventoryService] Connected to RabbitMQ');

        this.connection.on('error', (err: any) => {
          this.logger.error(`RabbitMQ error: ${err.message}`);
          this.channel = null;
        });
        
        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ closed. Reconnecting...');
          this.channel = null;
          setTimeout(() => this.connect(5), 5000);
        });

        return;
      } catch (err: any) {
        this.logger.warn(`RabbitMQ connection failed (${i+1}/${retries}): ${err.message}`);
        if (i < retries - 1) await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  publishStockLow(product: any, currentStock: number) {
    if (!this.channel) return;
    const payload = {
      event: 'stock.low',
      data: {
        id: product.id,
        name: product.name,
        stock: currentStock,
        threshold: product.low_stock_threshold,
      },
      timestamp: new Date().toISOString()
    };
    this.channel.publish(this.EXCHANGE_NAME, 'stock.low', Buffer.from(JSON.stringify(payload)));
    this.logger.log(`Published stock.low for product ${product.id}`);
  }

  isConnected() {
    return this.channel !== null;
  }
}
