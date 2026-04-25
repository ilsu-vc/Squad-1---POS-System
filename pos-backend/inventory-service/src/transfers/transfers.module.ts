import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [TransfersController],
  providers: [SupabaseService],
})
export class TransfersModule {}
