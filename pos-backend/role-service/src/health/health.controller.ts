import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { service: 'role-service', status: 'ok', port: process.env.PORT || 4005 };
  }
}
