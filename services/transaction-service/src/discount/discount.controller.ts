import { Controller, Post, Body, UsePipes, InternalServerErrorException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { DiscountValidateSchema } from '../schemas';

@Controller('discounts')
export class DiscountController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post('validate')
  @UsePipes(new ZodValidationPipe(DiscountValidateSchema))
  async validateDiscount(@Body() body: any) {
    const { code, cartTotal, cashierId } = body;
    const client = this.supabase.getClient();

    const { data: discount, error } = await client
      .from('discount_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);

    if (!discount) {
      return { valid: false, reason: 'INVALID_CODE', message: `Discount code "${code}" does not exist.` };
    }

    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return { valid: false, reason: 'EXPIRED', message: `Discount code "${code}" has expired.` };
    }

    if (discount.max_uses !== null && discount.times_used >= discount.max_uses) {
      return { valid: false, reason: 'OVER_LIMIT', message: `Discount code "${code}" has reached its maximum usage limit.` };
    }

    if (discount.requires_supervisor) {
      if (!cashierId) {
        return { valid: false, reason: 'SUPERVISOR_REQUIRED', message: `Discount code "${code}" requires supervisor approval.` };
      }
      const { data: profile } = await client.from('user_profiles').select('role').eq('id', cashierId).maybeSingle();
      const supervisorRoles = ['supervisor', 'manager', 'admin'];
      if (!profile || !supervisorRoles.includes(profile.role?.toLowerCase())) {
        return { valid: false, reason: 'SUPERVISOR_REQUIRED', message: `Discount code "${code}" requires supervisor approval.` };
      }
    }

    if (discount.min_cart_total && cartTotal < discount.min_cart_total) {
      return { valid: false, reason: 'MIN_CART_NOT_MET', message: `Cart total must be at least ₱${discount.min_cart_total} to use this code.` };
    }

    const discountValue = discount.type === 'percentage'
      ? Math.min(cartTotal * (discount.value / 100), discount.max_discount || Infinity)
      : discount.value;

    return {
      valid: true,
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        computedDiscount: Math.round(discountValue * 100) / 100,
        description: discount.description || null,
      },
    };
  }
}
