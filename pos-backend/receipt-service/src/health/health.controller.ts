import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { service: 'receipt-service', status: 'ok', port: process.env.PORT || 4006 };
  }
}
