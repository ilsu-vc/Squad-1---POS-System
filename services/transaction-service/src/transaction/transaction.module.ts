import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService, SupabaseService, RabbitMQService],
  exports: [TransactionService],
})
export class TransactionModule {}
