import { Controller, Get, Param, Put, Post, Body, UsePipes, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { UpdateRoleSchema, ToggleActiveSchema, ResetPasswordSchema } from '../schemas';

@Controller('users')
export class RoleController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get()
  async getUsers() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .order('email', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return { users: data || [] };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Invalid user id format');

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException(error.message);
    return { user: data };
  }

  @Put(':id/role')
  @UsePipes(new ZodValidationPipe(UpdateRoleSchema))
  async updateRole(@Param('id') id: string, @Body() body: any) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Invalid user id format');
    const { role } = body;
    const client = this.supabaseService.getClient();

    const { data: roleRow, error: roleError } = await client
      .from('roles')
      .select('id, role_key')
      .eq('role_key', role)
      .single();

    if (roleError) throw new InternalServerErrorException(roleError.message);

    const { data, error } = await client
      .from('user_profiles')
      .update({ role, role_id: roleRow.id })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { user: data };
  }

  @Put(':id/active')
  @UsePipes(new ZodValidationPipe(ToggleActiveSchema))
  async toggleActive(@Param('id') id: string, @Body() body: any) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException('Invalid user id format');
    const { is_active } = body;
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('user_profiles')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return { user: data };
  }

  @Post('reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  async resetPassword(@Body() body: any) {
    const { email } = body;
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.resetPasswordForEmail(email);

    if (error) throw new InternalServerErrorException(error.message);
    return { success: true, message: 'If that email exists, a reset link has been sent.' };
  }
}
