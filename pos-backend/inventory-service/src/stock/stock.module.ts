import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';

@Module({
  controllers: [StockController],
  providers: [SupabaseService, RabbitMQService],
})
export class StockModule {}
