import { Injectable, InternalServerErrorException, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';

@Injectable({ scope: Scope.REQUEST })
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @Inject(REQUEST) private request: any,
    private readonly supabaseService: SupabaseService,
    private readonly rabbitmqService: RabbitMQService,
  ) {}

  async decrementStock(items: any[]) {
    const inventoryServiceUrl = process.env.POS_TRANSACTION_INVENTORY_SERVICE_URL || 'http://localhost:4002';
    const authHeader = this.request.headers.authorization;

    await Promise.allSettled(
      items.map(async (item: any) => {
        if (!item.product_id) return;
        try {
          const response = await fetch(`${inventoryServiceUrl}/stock/adjust`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify({ 
              sku: item.product_id, 
              amount: -Math.abs(Number(item.quantity) || 1),
              reason: 'POS Sale' 
            }),
          });
          if (!response.ok) {
            const errText = await response.text();
            this.logger.error(`Stock adjustment failed for ${item.product_id}: ${response.status} ${errText}`);
          } else {
            this.logger.log(`Stock adjusted for product ${item.product_id} by -${item.quantity}`);
          }
        } catch (err) {
          this.logger.error(`Error adjusting stock for product ${item.product_id}:`, err);
        }
      })
    );
  }
}
