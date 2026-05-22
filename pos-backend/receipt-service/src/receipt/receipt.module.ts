import { Module } from '@nestjs/common';
import { ReceiptController } from './receipt.controller';
import { SupabaseService } from '../supabase.service';
import { PrinterService } from './printer.service';

@Module({
  controllers: [ReceiptController],
  providers: [SupabaseService, PrinterService],
})
export class ReceiptModule {}
