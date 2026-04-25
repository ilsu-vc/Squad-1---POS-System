import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { SupabaseService } from '../supabase.service';

@Module({
  controllers: [RoleController],
  providers: [SupabaseService],
})
export class RoleModule {}
