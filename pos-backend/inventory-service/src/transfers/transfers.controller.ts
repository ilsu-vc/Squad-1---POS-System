import { Controller, Get, Post, Put, Param, Body, UsePipes, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { CreateTransferSchema, UpdateTransferSchema } from '../schemas';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  async getTransfers() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('requesttransfers')
      .select('id, product_id, product_name, quantity_transfer, transfer_status, requested_by, destination_branch_id, destination_branch_name, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return { transfers: data || [] };
  }

  @Post()
  async createTransfer(@Body(new ZodValidationPipe(CreateTransferSchema)) body: any) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('requesttransfers')
      .insert(body)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { transfer: data };
  }

  @Put(':id')
  async updateTransfer(@Param('id') id: string, @Body(new ZodValidationPipe(UpdateTransferSchema)) body: any) {
    const { transfer_status, quantity_transfer } = body;
    const client = this.supabaseService.getClient();
    
    const updateData: any = {};
    if (transfer_status) updateData.transfer_status = transfer_status;
    if (quantity_transfer) updateData.quantity_transfer = quantity_transfer;

    const { data, error } = await client
      .from('requesttransfers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { transfer: data };
  }
}
