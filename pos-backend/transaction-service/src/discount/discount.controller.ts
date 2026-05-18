import { Controller, Post, Body, UsePipes, InternalServerErrorException, NotFoundException, BadRequestException, ForbiddenException, HttpCode } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { DiscountValidateSchema } from '../schemas';

@Controller('discounts')
export class DiscountController {
  constructor(private readonly supabase: SupabaseService) {}

  @Post('validate')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(DiscountValidateSchema))
  async validateDiscount(@Body() body: any) {
    const { code, cartTotal, cashierId } = body;
    const client = this.supabase.getClient();

    let discount = null;
    if (code.toUpperCase() === 'PHARMACARE10') {
      discount = {
        code: 'PHARMACARE10',
        type: 'percentage',
        value: 10,
        expires_at: null,
        max_uses: null,
        times_used: 0,
        requires_supervisor: false,
        min_cart_total: 0,
        description: '10% Off Sample Promo Code',
      };
    } else {
      const { data, error } = await client
        .from('discount_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (error) throw new InternalServerErrorException(error.message);
      discount = data;
    }

    if (!discount) {
      throw new NotFoundException({ valid: false, reason: 'INVALID_CODE', error: `Discount code "${code}" does not exist.` });
    }

    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      throw new BadRequestException({ valid: false, reason: 'EXPIRED', error: `Discount code "${code}" has expired.` });
    }

    if (discount.max_uses !== null && discount.times_used >= discount.max_uses) {
      throw new BadRequestException({ valid: false, reason: 'OVER_LIMIT', error: `Discount code "${code}" has reached its maximum usage limit.` });
    }

    if (discount.requires_supervisor) {
      if (!cashierId) {
        throw new ForbiddenException({ valid: false, reason: 'SUPERVISOR_REQUIRED', error: `Discount code "${code}" requires supervisor approval.` });
      }
      const { data: profile } = await client.from('user_profiles').select('role').eq('id', cashierId).maybeSingle();
      const supervisorRoles = ['supervisor', 'manager', 'admin'];
      if (!profile || !supervisorRoles.includes(profile.role?.toLowerCase())) {
        throw new ForbiddenException({ valid: false, reason: 'SUPERVISOR_REQUIRED', error: `Discount code "${code}" requires supervisor approval.` });
      }
    }

    if (discount.min_cart_total && cartTotal < discount.min_cart_total) {
      throw new BadRequestException({ valid: false, reason: 'MIN_CART_NOT_MET', error: `Cart total must be at least ₱${discount.min_cart_total} to use this code.` });
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
