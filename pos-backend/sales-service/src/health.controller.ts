import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      service: 'sales-service',
      status: 'ok',
      port: process.env.PORT || 4003,
      note: 'Transaction processing is handled by transaction-service on port 4007',
    };
  }
}
