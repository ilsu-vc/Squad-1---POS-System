"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let DiscountController = class DiscountController {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async validateDiscount(body) {
        const { code, cartTotal, cashierId } = body;
        const client = this.supabase.getClient();
        const { data: discount, error } = await client
            .from('discount_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .maybeSingle();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
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
};
exports.DiscountController = DiscountController;
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.DiscountValidateSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscountController.prototype, "validateDiscount", null);
exports.DiscountController = DiscountController = __decorate([
    (0, common_1.Controller)('discounts'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], DiscountController);
//# sourceMappingURL=discount.controller.js.map