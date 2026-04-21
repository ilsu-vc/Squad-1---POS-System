import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RabbitMQService } from '../rabbitmq.service';
import { SupabaseServiceAdmin } from '../supabase.service';

@Module({
  controllers: [HealthController],
  providers: [RabbitMQService, SupabaseServiceAdmin],
})
export class HealthModule {}
