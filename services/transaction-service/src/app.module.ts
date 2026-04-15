import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { TransactionModule } from './transaction/transaction.module';
import { DiscountModule } from './discount/discount.module';
import { RabbitMQService } from './rabbitmq.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, TransactionModule, DiscountModule],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class AppModule {}
