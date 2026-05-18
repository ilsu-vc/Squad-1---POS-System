import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
import { ApiCenterService } from './api-center.service';

@Module({
  controllers: [TransactionController],
  providers: [TransactionService, SupabaseService, RabbitMQService, ApiCenterService],
  exports: [TransactionService, ApiCenterService],
})
export class TransactionModule {}
