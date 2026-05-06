import { Controller, Get, Post, Body, UsePipes, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { CreateActivityLogSchema } from '../schemas';

@Controller()
export class ReportingController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('activity-logs')
  async getActivityLogs() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw new InternalServerErrorException(error.message);
    return { logs: data || [] };
  }

  @Post('activity-logs')
  @UsePipes(new ZodValidationPipe(CreateActivityLogSchema))
  async createActivityLog(@Body() body: any) {
    const { userId, userEmail, actionType, actionDetails, entityType, entityId } = body;
    const client = this.supabaseService.getClient();

    const { error } = await client.from('user_activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: actionType,
      action_details: actionDetails,
      entity_type: entityType,
      entity_id: entityId,
    });

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  @Get('shift-records')
  async getShiftRecords() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('shift_records')
      .select(`
        id,
        clock_in_at,
        clock_out_at,
        total_hours,
        handover_notes,
        cash_discrepancies,
        issues,
        pending_items
      `)
      .order('clock_in_at', { ascending: false })
      .limit(5000);

    if (error) throw new InternalServerErrorException(error.message);
    return { records: data || [] };
  }
}
