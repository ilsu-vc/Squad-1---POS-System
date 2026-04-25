import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { ReportingModule } from './reporting/reporting.module';
import { RabbitMQService } from './rabbitmq.service';
import { SupabaseServiceAdmin } from './supabase.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, ReportingModule],
  providers: [RabbitMQService, SupabaseServiceAdmin],
  exports: [RabbitMQService],
})
export class AppModule {}
