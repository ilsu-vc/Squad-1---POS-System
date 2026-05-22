import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { PrintReceiptSchema } from '../schemas';
import { PrinterService } from './printer.service';

@Controller()
export class ReceiptController {
  private readonly logger = new Logger(ReceiptController.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly printerService: PrinterService,
  ) {}

  @Post('print')
  @UsePipes(new ZodValidationPipe(PrintReceiptSchema))
  async printReceipt(@Body() body: any) {
    const {
      receiptNumber,
      items,
      vatable,
      vatAmount,
      total,
      splitPayments,
      storeName,
      storeAddress,
      storeTin,
      date,
      cashier,
      paymentMethod,
      amountPaid,
      change,
      discount,
      discountType,
      isReprint,
      orFields,
    } = body;

    // ── Always log to console (useful for debugging) ──────────────────────
    this.logger.log(`=== RECEIPT #${receiptNumber || '000000'} ===`);
    this.logger.log(`Date: ${date || new Date().toLocaleString()}`);
    this.logger.log(`Items: ${JSON.stringify(items)}`);
    this.logger.log(`Total: PHP ${(total ?? 0).toFixed(2)}`);

    // ── Attempt to print to Sunmi V2 if IP is configured ─────────────────
    const printerIp = process.env.POS_RECEIPT_PRINTER_IP;

    if (printerIp) {
      try {
        await this.printerService.printToSunmi(printerIp, {
          storeName: storeName || 'PharmaCare Drugstore',
          storeAddress: storeAddress || '123 Sample St., City, Philippines',
          storeTin: storeTin || '000-000-000-000',
          receiptNumber: receiptNumber || '000000',
          date: date || new Date().toLocaleString(),
          cashier,
          items,
          vatable: vatable ?? 0,
          vatAmount: vatAmount ?? 0,
          discount,
          discountType,
          total: total ?? 0,
          paymentMethod,
          amountPaid,
          change,
          splitPayments,
          isReprint: isReprint ?? false,
          orFields,
        });
        this.logger.log(`Receipt printed successfully via direct WiFi ESC/POS to ${printerIp}`);
        return { success: true, receiptNumber, printed: true, printer: printerIp, method: 'direct_wifi' };
      } catch (err: any) {
        this.logger.warn(`Direct WiFi print failed to ${printerIp}: ${err.message}. Falling back to Cloud Print Queue...`);
        
        try {
          const client = this.supabaseService.getClient();
          const itemsForQueue = items.map((item: any) => ({
            name: item.name,
            qty: item.quantity ?? item.qty,
            price: item.price
          }));
          
          const { error: dbError } = await client
            .from('print_queue')
            .insert({
              receipt_number: String(receiptNumber || '000000'),
              total: total ?? 0,
              payment_method: paymentMethod || 'Cash',
              status: 'pending',
              items: itemsForQueue,
            });

          if (dbError) {
            this.logger.error(`Failed to enqueue print job to Supabase print_queue: ${dbError.message}`);
            return {
              success: true,
              receiptNumber,
              printed: false,
              printerError: `WiFi fail (${err.message}) and Queue fail (${dbError.message})`,
            };
          }

          this.logger.log(`Successfully enqueued receipt #${receiptNumber} to Supabase print_queue`);
          return {
            success: true,
            receiptNumber,
            printed: false,
            viaQueue: true,
            method: 'cloud_queue',
            message: 'Direct print failed; enqueued to Cloud Print Queue successfully'
          };
        } catch (queueErr: any) {
          this.logger.error(`Exception enqueuing print job: ${queueErr.message}`);
          return {
            success: true,
            receiptNumber,
            printed: false,
            printerError: `WiFi fail (${err.message}) and Queue exception (${queueErr.message})`,
          };
        }
      }
    } else {
      this.logger.warn('POS_RECEIPT_PRINTER_IP not set. Enqueuing to Cloud Print Queue...');
      try {
        const client = this.supabaseService.getClient();
        const itemsForQueue = items.map((item: any) => ({
          name: item.name,
          qty: item.quantity ?? item.qty,
          price: item.price
        }));

        const { error: dbError } = await client
          .from('print_queue')
          .insert({
            receipt_number: String(receiptNumber || '000000'),
            total: total ?? 0,
            payment_method: paymentMethod || 'Cash',
            status: 'pending',
            items: itemsForQueue,
          });

        if (dbError) {
          this.logger.error(`Failed to enqueue print job to Supabase print_queue: ${dbError.message}`);
          return { success: true, receiptNumber, printed: false, printerError: dbError.message };
        }

        this.logger.log(`Successfully enqueued receipt #${receiptNumber} to Supabase print_queue`);
        return {
          success: true,
          receiptNumber,
          printed: false,
          viaQueue: true,
          method: 'cloud_queue',
          message: 'Enqueued in Cloud Print Queue successfully'
        };
      } catch (queueErr: any) {
        this.logger.error(`Exception enqueuing print job: ${queueErr.message}`);
        return { success: true, receiptNumber, printed: false, printerError: queueErr.message };
      }
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
