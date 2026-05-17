import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { StockModule } from './stock/stock.module';
import { TransfersModule } from './transfers/transfers.module';
import { RabbitMQService } from './rabbitmq.service';
import { ReceiptModule } from './receipt/receipt.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    InventoryModule,
    StockModule,
    TransfersModule,
    ReceiptModule, // ✅ ADD THIS LINE
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class AppModule { }
