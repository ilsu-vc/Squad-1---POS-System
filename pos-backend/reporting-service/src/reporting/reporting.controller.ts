import { Controller, Get, Post, Body, UsePipes, InternalServerErrorException, Query } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { CreateActivityLogSchema } from '../schemas';
import { Apriori, Itemset } from 'node-apriori';

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

  @Get('mba-rules')
  async getMarketBasketRules(@Query('support') supportStr?: string) {
    const minSupport = supportStr ? parseFloat(supportStr) : 0.05; // Default 5% support
    const client = this.supabaseService.getClient();

    // 1. Fetch historical completed transactions and their items
    const { data: txns, error } = await client
      .from('transactions')
      .select('id, transaction_items(name)')
      .in('status', ['paid', 'completed'])
      .limit(3000); // Limit to recent 3000 for performance

    if (error) throw new InternalServerErrorException(error.message);

    // 2. Format dataset: array of arrays of product names
    const dataset = (txns || [])
      .map(t => (t.transaction_items as any[])?.map(i => i.name) || [])
      .filter(items => items.length > 1); // We only care about baskets with > 1 item

    if (dataset.length === 0) {
      return { itemsets: [], message: 'Not enough multi-item transaction data.' };
    }

    // 3. Run Apriori Algorithm to find frequent itemsets
    const apriori = new Apriori(minSupport);

    return new Promise((resolve, reject) => {
      apriori.exec(dataset)
        .then((result) => {
          // result.itemsets contains frequent itemsets and their support
          // Sort by support descending
          const sortedItemsets = result.itemsets
            .filter((is: Itemset<string>) => is.items.length > 1) // Only pairs or more
            .sort((a: Itemset<string>, b: Itemset<string>) => b.support - a.support)
            .slice(0, 20); // Top 20

          resolve({
            executionTimeMs: result.executionTime,
            totalTransactionsAnalyzed: dataset.length,
            frequentItemsets: sortedItemsets
          });
        })
        .catch(err => {
          reject(new InternalServerErrorException(`Apriori calculation failed: ${err.message}`));
        });
    });
  }
}
