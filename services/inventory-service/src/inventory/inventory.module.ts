import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';

@Module({
  controllers: [InventoryController],
  providers: [SupabaseService, RabbitMQService],
  exports: [SupabaseService, RabbitMQService],
})
export class InventoryModule {}
