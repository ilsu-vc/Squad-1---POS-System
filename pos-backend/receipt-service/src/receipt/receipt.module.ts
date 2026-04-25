import { Module } from '@nestjs/common';
import { ReceiptController } from './receipt.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [ReceiptController],
  providers: [SupabaseService],
})
export class ReceiptModule {}
