import { Controller, Post, Body, UsePipes, BadRequestException, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { StockAdjustSchema, StockTransferSchema } from '../schemas';

@Controller('stock')
export class StockController {
  private readonly logger = new Logger(StockController.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly rabbitmqService: RabbitMQService,
  ) {}

  @Post('adjust')
  @UsePipes(new ZodValidationPipe(StockAdjustSchema))
  async adjustStock(@Body() body: any) {
    const { sku, amount } = body;
    const client = this.supabaseService.getClient();

    const { data: product, error: fetchErr } = await client
      .from('products')
      .select('id, name, stock, low_stock_threshold')
      .eq('id', sku)
      .single();

    if (fetchErr) throw new NotFoundException('Product not found');

    const currentStock = Number(product.stock) || 0;
    const newStock = currentStock + amount;

    const { data, error: updateErr } = await client
      .from('products')
      .update({ stock: newStock })
      .eq('id', sku)
      .select()
      .single();

    if (updateErr) throw new InternalServerErrorException(updateErr.message);

    this.logger.log(`Stock adjusted for product ${sku} (${product.name}): ${currentStock} -> ${data.stock}`);

    const threshold = Number(product.low_stock_threshold);
    if (threshold > 0 && data.stock <= threshold) {
      this.rabbitmqService.publishStockLow(product, data.stock);
    }

    return { success: true, sku, newStock: data.stock };
  }

  @Post('transfer')
  @UsePipes(new ZodValidationPipe(StockTransferSchema))
  async transferStock(@Body() body: any) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('requesttransfers')
      .insert(body)
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return { transfer: data };
  }
}
