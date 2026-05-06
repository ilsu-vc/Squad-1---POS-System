import { Controller, Post, Get, Body, Param, UsePipes, BadRequestException, InternalServerErrorException, HttpCode } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { ClockInSchema, ClockOutSchema } from '../schemas';

@Controller('shift')
export class ShiftController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post('clock-in')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ClockInSchema))
  async clockIn(@Body() body: any) {
    const { userId } = body;
    const client = this.supabaseService.getAuditClient();

    // Check if the user already has an active shift
    const { data: activeShift, error: checkError } = await client
      .from('shift_records')
      .select('id')
      .eq('user_id', userId)
      .is('clock_out_at', null)
      .maybeSingle();

    if (checkError) throw new InternalServerErrorException(checkError.message);

    if (activeShift) {
      throw new BadRequestException({ error: 'User already has an open shift' });
    }

    const { data, error } = await client
      .from('shift_records')
      .insert({ user_id: userId, clock_in_at: new Date().toISOString() })
      .select()
      .single();
    
    if (error) {
      if (error.message.includes('shift_records_one_open_shift_per_user') || error.code === '23505') {
        throw new BadRequestException({ error: 'User already has an open shift' });
      }
      throw new InternalServerErrorException(error.message);
    }
    
    return { shift: data };
  }

  @Post('clock-out')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(ClockOutSchema))
  async clockOut(@Body() body: any) {
    const { shiftId, userId, clockOutAt, totalHours, handoverNotes, cashDiscrepancies, issues, pendingItems } = body;
    const client = this.supabaseService.getAuditClient();
    const { error } = await client
      .from('shift_records')
      .update({
        clock_out_at: clockOutAt,
        total_hours: totalHours,
        handover_notes: handoverNotes || null,
        cash_discrepancies: cashDiscrepancies || null,
        issues: issues || null,
        pending_items: pendingItems || null,
      })
      .eq('id', shiftId)
      .eq('user_id', userId);
    
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  @Get('active/:userId')
  async getActiveShift(@Param('userId') userId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      throw new BadRequestException({ error: 'Validation failed' });
    }
    const client = this.supabaseService.getAuditClient();
    const { data, error } = await client
      .from('shift_records')
      .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
      .eq('user_id', userId)
      .is('clock_out_at', null)
      .order('clock_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return { shift: data };
  }

  @Get('latest-handover')
  async getLatestHandover() {
    const client = this.supabaseService.getAuditClient();
    const { data, error } = await client
      .from('shift_records')
      .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
      .not('clock_out_at', 'is', null)
      .or('handover_notes.not.is.null,cash_discrepancies.not.is.null,issues.not.is.null,pending_items.not.is.null')
      .order('clock_out_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return { handover: data };
  }
}
