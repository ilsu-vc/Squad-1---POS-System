import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [ReportingController],
  providers: [SupabaseService],
})
export class ReportingModule {}
