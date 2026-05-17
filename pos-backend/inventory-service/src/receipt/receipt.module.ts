import { Module } from '@nestjs/common';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { SupabaseService } from '../supabase.service';

@Module({
    controllers: [ReceiptController],
    providers: [ReceiptService, SupabaseService],
})
export class ReceiptModule { }