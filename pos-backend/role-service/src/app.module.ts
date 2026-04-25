import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, RoleModule],
})
export class AppModule {}
