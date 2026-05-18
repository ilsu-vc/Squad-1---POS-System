import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly POS_TRANSACTION_RABBITMQ_URL = process.env.POS_TRANSACTION_RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly EXCHANGE_NAME = 'transaction_events';

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
         this.connection = await amqp.connect(this.POS_TRANSACTION_RABBITMQ_URL);
         this.channel = await this.connection.createChannel();
         await this.channel.assertExchange(this.EXCHANGE_NAME, 'fanout', { durable: true });
         this.logger.log('✅ [TransactionService] Connected to RabbitMQ');

         this.connection.on('error', (err: any) => {
           this.logger.error(`[TransactionService] RabbitMQ connection error: ${err.message}`);
           this.channel = null;
         });
         
         this.connection.on('close', () => {
           this.logger.warn('[TransactionService] RabbitMQ connection closed. Reconnecting...');
           this.channel = null;
           setTimeout(() => this.connect(5), 5000);
         });

         return;
       } catch (err: any) {
         this.logger.warn(`[TransactionService] RabbitMQ connection attempt ${i + 1}/${retries} failed: ${err.message}`);
         if (i < retries - 1) {
           await new Promise(resolve => setTimeout(resolve, 3000));
         }
       }
    }
    this.logger.error('[TransactionService] Could not connect to RabbitMQ. Events will not be published.');
  }

  publishTransactionCompleted(payload: object): void {
    if (!this.channel) {
      this.logger.warn('[TransactionService] RabbitMQ channel not available — skipping event publish');
      return;
    }
    try {
      const message = Buffer.from(JSON.stringify({
        event: 'transaction.completed',
        data: payload,
        timestamp: new Date().toISOString(),
      }));
      this.channel.publish(this.EXCHANGE_NAME, '', message, { persistent: true });
      this.logger.log('[TransactionService] Published transaction.completed event');
    } catch (err: any) {
      this.logger.error(`[TransactionService] Failed to publish event: ${err.message}`);
    }
  }

  isConnected() {
    return this.channel !== null;
  }
}
