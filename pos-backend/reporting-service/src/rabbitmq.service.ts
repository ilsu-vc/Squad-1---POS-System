import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { SupabaseServiceAdmin } from './supabase.service';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any = null;
  private channel: any = null;
  private readonly POS_REPORTING_RABBITMQ_URL = process.env.POS_REPORTING_RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private readonly EXCHANGE_NAME = 'transaction_events';
  private readonly QUEUE_NAME = 'reporting_queue';

  constructor(private readonly supabaseAdmin: SupabaseServiceAdmin) {}

  async onModuleInit() {
    // Non-fatal startup: if RabbitMQ is not ready yet, keep retrying in background
    this.connect(10).catch((err) => {
      this.logger.warn(`Initial RabbitMQ connection failed, will retry: ${err?.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private async connect(retries: number) {
    for (let i = 0; i < retries; i++) {
       try {
         this.connection = await amqp.connect(this.POS_REPORTING_RABBITMQ_URL);
         this.channel = await this.connection.createChannel();
         
         await this.channel.assertExchange(this.EXCHANGE_NAME, 'fanout', { durable: true });
         await this.channel.assertQueue(this.QUEUE_NAME, { durable: true });
         await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, '');
         await this.channel.prefetch(1);

         this.logger.log(`✅ [ReportingService] Connected to RabbitMQ — consuming from "${this.QUEUE_NAME}"`);

         this.channel.consume(this.QUEUE_NAME, async (msg: any) => {
           if (!msg) return;
           try {
             const envelope = JSON.parse(msg.content.toString());
             this.logger.log(`Received event: ${envelope.event}`);

             if (envelope.event === 'transaction.completed') {
               const { transactionId, receiptNumber, totalAmount, paymentMethod, itemsCount, items } = envelope.data;

               const itemsSummary = Array.isArray(items)
                 ? items.map((i: any) => `${i.name || i.item_name} x${i.quantity}`).join(', ')
                 : `${itemsCount} item(s)`;

               const details = `Sale completed — Receipt: ${receiptNumber || 'N/A'}, Total: ₱${Number(totalAmount ?? 0).toFixed(2)}, Method: ${paymentMethod}, Items: ${itemsSummary}`;

               const supabase = this.supabaseAdmin.getClient();
               const { error } = await supabase.from('user_activity_logs').insert({
                 user_id: null,
                 user_email: null,
                 action_type: 'SALE',
                 action_details: details,
                 entity_type: 'transaction',
                 entity_id: transactionId,
               });

               if (error) {
                 this.logger.error(`Failed to log SALE activity: ${error.message}`);
               } else {
                 this.logger.log(`SALE activity logged for transaction ${transactionId}`);
               }
             }

             this.channel.ack(msg);
           } catch (err: any) {
             this.logger.error(`Error processing message: ${err.message}`);
             this.channel.nack(msg, false, true);
           }
         });

         this.connection.on('error', (err: any) => {
           this.logger.error(`RabbitMQ connection error: ${err.message}`);
           this.channel = null;
         });
         
         this.connection.on('close', () => {
           this.logger.warn('RabbitMQ connection closed. Reconnecting...');
           this.channel = null;
           setTimeout(() => this.connect(5), 5000);
         });

         return;
       } catch (err: any) {
         this.logger.warn(`RabbitMQ connection attempt ${i + 1}/${retries} failed: ${err.message}`);
         if (i < retries - 1) {
           await new Promise(resolve => setTimeout(resolve, 3000));
         }
       }
    }
    this.logger.error('Could not connect to RabbitMQ after all retries.');
  }

  isConnected() {
    return this.channel !== null;
  }
}
