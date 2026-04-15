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
  @UsePipes(new ZodValidationPipe(CreateTransferSchema))
  async createTransfer(@Body() body: any) {
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
  @UsePipes(new ZodValidationPipe(UpdateTransferSchema))
  async updateTransfer(@Param('id') id: string, @Body() body: any) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('requesttransfers')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { transfer: data };
  }
}
