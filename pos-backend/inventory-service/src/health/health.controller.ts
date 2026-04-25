import { Controller, Get } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq.service';

@Controller('health')
export class HealthController {
  constructor(private rabbitmq: RabbitMQService) {}
  
  @Get()
  check() {
    return { service: 'inventory-service', status: 'ok', port: process.env.PORT || 4002, rabbitmq: this.rabbitmq.isConnected() ? 'connected' : 'disconnected' };
  }
}
