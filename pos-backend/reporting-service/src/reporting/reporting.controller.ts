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
    console.log('[MBA] Starting Market Basket Analysis request...');
    const minSupport = supportStr ? parseFloat(supportStr) : 0.05; // Default 5% support
    const client = this.supabaseService.getClient();

    console.log(`[MBA] Connecting to Supabase to fetch transactions...`);
    // 1. Fetch historical completed transactions and their items
    const { data: txns, error } = await client
      .from('transactions')
      .select('id, transaction_items(name)')
      .in('status', ['paid', 'completed'])
      .limit(1000); // Analyze up to 1000 transactions

    if (error) {
      console.error(`[MBA] Supabase query failed:`, error);
      throw new InternalServerErrorException(error.message);
    }
    
    console.log(`[MBA] Supabase returned ${txns?.length || 0} transactions.`);

    // 2. Format dataset: array of arrays of product names
    const dataset = (txns || [])
      .map(t => (t.transaction_items as any[])?.map(i => i.name) || [])
      .filter(items => items.length > 1); // We only care about baskets with > 1 item

    console.log(`[MBA] Formatted dataset to ${dataset.length} multi-item baskets.`);

    if (dataset.length === 0) {
      return { executionTimeMs: 0, totalTransactionsAnalyzed: 0, frequentItemsets: [], message: 'Not enough multi-item transaction data.' };
    }

    const startTime = Date.now();
    const totalTxns = dataset.length;

    console.log(`[MBA] Running custom Apriori algorithm...`);
    // 3. Lightning Fast Custom 2-Itemset Apriori Algorithm
    const itemFrequencies: Record<string, number> = {};
    const pairFrequencies: Record<string, number> = {};

    dataset.forEach(basket => {
      // De-duplicate items in the same basket
      const uniqueItems = Array.from(new Set(basket));
      
      // Count individual item frequencies
      uniqueItems.forEach(item => {
        itemFrequencies[item] = (itemFrequencies[item] || 0) + 1;
      });

      // Count pairs
      for (let i = 0; i < uniqueItems.length; i++) {
        for (let j = i + 1; j < uniqueItems.length; j++) {
          const pair = [uniqueItems[i], uniqueItems[j]].sort().join('||');
          pairFrequencies[pair] = (pairFrequencies[pair] || 0) + 1;
        }
      }
    });

    const frequentItemsets = [];

    // Evaluate pairs against minimum support threshold
    for (const [pairKey, count] of Object.entries(pairFrequencies)) {
      const support = count / totalTxns;
      if (support >= minSupport) {
        frequentItemsets.push({
          items: pairKey.split('||'),
          support: support
        });
      }
    }

    // Sort by support descending and get top 20
    const sortedItemsets = frequentItemsets
      .sort((a, b) => b.support - a.support)
      .slice(0, 20);

    console.log(`[MBA] Finished processing in ${Date.now() - startTime}ms.`);

    return {
      executionTimeMs: Date.now() - startTime,
      totalTransactionsAnalyzed: totalTxns,
      frequentItemsets: sortedItemsets
    };
  }
}
