import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [ShiftController],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class ShiftModule {}
