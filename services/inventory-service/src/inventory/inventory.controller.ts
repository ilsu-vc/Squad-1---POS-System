import { Controller, Get, Param, Patch, Body, UsePipes, BadRequestException, InternalServerErrorException, NotFoundException, Put } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { DecrementStockSchema, UpdateProductSchema, RESERVED_STATUSES } from '../schemas';

@Controller()
export class InventoryController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly rabbitmqService: RabbitMQService,
  ) {}

  @Get('branches')
  async getBranches() {
    const client = this.supabaseService.getClient();
    const { data: branches, error } = await client
      .from('storebranches')
      .select('id, branch_name')
      .order('id', { ascending: true });
    
    if (error) throw new InternalServerErrorException(error.message);
    return { branches: branches || [] };
  }

  @Get('products')
  async getProducts() {
    const client = this.supabaseService.getClient();
    const { data: products, error: pErr } = await client
      .from('products')
      .select('id, name, price, stock, category, low_stock_threshold')
      .order('id', { ascending: true });
    
    if (pErr) throw new InternalServerErrorException(pErr.message);

    const { data: transfers, error: tErr } = await client
      .from('requesttransfers')
      .select('id, product_id, product_name, quantity_transfer, transfer_status, requested_by, destination_branch_id, destination_branch_name, created_at')
      .order('created_at', { ascending: false });
    
    if (tErr) throw new InternalServerErrorException(tErr.message);

    const rows = transfers || [];
    const enriched = (products || []).map((product: any) => {
      const reserved_transfer_qty = rows
        .filter((r: any) => String(r.product_id) === String(product.id) && RESERVED_STATUSES.includes(r.transfer_status))
        .reduce((sum: number, r: any) => sum + (Number(r.quantity_transfer) || 0), 0);
      const available_stock = Math.max(0, (Number(product.stock) || 0) - reserved_transfer_qty);
      return { ...product, reserved_transfer_qty, available_stock };
    });

    return { products: enriched, transfers: rows };
  }

  @Get('products/:sku')
  async getProduct(@Param('sku') sku: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('id', sku)
      .single();

    if (error) throw new NotFoundException('Product not found');
    return { product: data };
  }

  @Get('products/:sku/stock')
  async getProductStock(@Param('sku') sku: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('products')
      .select('stock')
      .eq('id', sku)
      .single();

    if (error) throw new NotFoundException('Product not found');
    return { sku, stock: data.stock };
  }

  @Put('products/:id')
  @UsePipes(new ZodValidationPipe(UpdateProductSchema))
  async updateProduct(@Param('id') id: string, @Body() body: any) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('products')
      .update(body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    return { product: data };
  }

  @Patch('products/:id/decrement')
  @UsePipes(new ZodValidationPipe(DecrementStockSchema))
  async decrementStock(@Param('id') id: string, @Body() body: any) {
    const { quantity } = body;
    const client = this.supabaseService.getClient();
    
    const { data: product, error: fetchErr } = await client
      .from('products')
      .select('id, name, stock, low_stock_threshold')
      .eq('id', id)
      .single();

    if (fetchErr) throw new NotFoundException('Product not found');
    
    const currentStock = Number(product.stock) || 0;
    const newStock = Math.max(0, currentStock - quantity);

    const { data, error: updateErr } = await client
      .from('products')
      .update({ stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw new InternalServerErrorException(updateErr.message);

    const threshold = Number(product.low_stock_threshold);
    if (threshold > 0 && data.stock <= threshold) {
      this.rabbitmqService.publishStockLow(product, data.stock);
    }
    
    return { success: true, newStock: data.stock };
  }
}
