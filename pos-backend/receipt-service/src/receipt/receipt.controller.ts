import { Controller, Get, Post, Body, Param, UsePipes, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { PrintReceiptSchema } from '../schemas';

@Controller()
export class ReceiptController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post('print')
  @UsePipes(new ZodValidationPipe(PrintReceiptSchema))
  printReceipt(@Body() body: any) {
    const { receiptNumber, items, vatable, vatAmount, total, splitPayments } = body;
    try {
      console.log('=== RECEIPT (receipt-service) ===');
      console.log('Receipt #:', receiptNumber || '000000');
      console.log('Date:', new Date().toLocaleString());
      console.log('Items:', JSON.stringify(items, null, 2));
      console.log('VATable Sales:', (vatable ?? 0).toFixed(2));
      console.log('VAT Amount (12%):', (vatAmount ?? 0).toFixed(2));
      console.log('TOTAL: PHP', (total ?? 0).toFixed(2));

      if (splitPayments && splitPayments.length > 0) {
        console.log('--- SPLIT PAYMENT ---');
        splitPayments.forEach((p: any, i: number) => {
          const label = p.method.charAt(0).toUpperCase() + p.method.slice(1);
          let detail = `  Payment ${i + 1}: ${label} - PHP ${parseFloat(p.amount).toFixed(2)}`;
          if (p.method === 'card') detail += ` (Ref: ${p.refNo}, Card: ****${p.cardLast4})`;
          if (p.method === 'mobile') detail += ` (${p.mobileProvider}, Ref: ${p.refNo})`;
          console.log(detail);
        });
      }
      console.log('=================================');
      return { success: true, receiptNumber };
    } catch (err: any) {
      throw new InternalServerErrorException('Internal server error');
    }
  }

  @Get('receipt/:transactionId')
  async getReceipt(@Param('transactionId') transactionId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(transactionId)) {
      throw new BadRequestException('Invalid transactionId format');
    }
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) throw new NotFoundException(error.message);
    return { receipt: data };
  }
}
