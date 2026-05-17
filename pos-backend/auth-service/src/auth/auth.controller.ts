import { Controller, Post, Get, Body, Param, UsePipes, BadRequestException, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { LoginSchema, ChangePasswordSchema } from '../schemas';

@Controller()
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() body: any) {
    const { email, password } = body;
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedException(error.message);
    return { session: data.session, user: data.user };
  }

  @Post('logout')
  async logout() {
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.signOut();
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }

  @Get('session')
  async getSession() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw new UnauthorizedException(error.message);
    return { session: data.session };
  }

  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      throw new BadRequestException('Invalid userId format');
    }
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('user_profiles')
      .select('id, email, full_name, role, role_id, is_active')
      .eq('id', userId)
      .single();
    if (error) {
      console.error(`🛡️ AUTH PROFILE ERROR for UserID [${userId}]:`, error);
      throw new NotFoundException(error.message);
    }
    return { profile: data };
  }

  @Post('password/change')
  @UsePipes(new ZodValidationPipe(ChangePasswordSchema))
  async changePassword(@Body() body: any) {
    const { newPassword } = body;
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new InternalServerErrorException(error.message);
    return { success: true };
  }
}
