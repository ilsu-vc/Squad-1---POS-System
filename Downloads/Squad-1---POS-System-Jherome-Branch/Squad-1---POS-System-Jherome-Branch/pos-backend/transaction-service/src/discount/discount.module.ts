import { Module } from '@nestjs/common';
import { DiscountController } from './discount.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [DiscountController],
  providers: [SupabaseService],
})
export class DiscountModule {}
