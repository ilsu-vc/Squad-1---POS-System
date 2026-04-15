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
exports.ReceiptController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let ReceiptController = class ReceiptController {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    printReceipt(body) {
        const { receiptNumber, items, vatable, vatAmount, total, splitPayments } = body;
        try {
            console.log('=== RECEIPT (receipt-service) ===');
            console.log('Receipt #:', receiptNumber || '000000');
            console.log('Date:', new Date().toLocaleString());
            console.log('Items:', JSON.stringify(items, null, 2));
            console.log('VATable Sales:', (vatable ?? 0).toFixed(2));
            console.log('VAT Amount (12%):', (vatAmount ?? 0).toFixed(2));
            console.log('TOTAL: PHP', (total ?? 0).toFixed(2));
            if (splitPayments && splitPayments.length > 0) {
                console.log('--- SPLIT PAYMENT ---');
                splitPayments.forEach((p, i) => {
                    const label = p.method.charAt(0).toUpperCase() + p.method.slice(1);
                    let detail = `  Payment ${i + 1}: ${label} - PHP ${parseFloat(p.amount).toFixed(2)}`;
                    if (p.method === 'card')
                        detail += ` (Ref: ${p.refNo}, Card: ****${p.cardLast4})`;
                    if (p.method === 'mobile')
                        detail += ` (${p.mobileProvider}, Ref: ${p.refNo})`;
                    console.log(detail);
                });
            }
            console.log('=================================');
            return { success: true, receiptNumber };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException('Internal server error');
        }
    }
    async getReceipt(transactionId) {
        if (!/^[0-9a-f-]{36}$/i.test(transactionId)) {
            throw new common_1.BadRequestException('Invalid transactionId format');
        }
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();
        if (error)
            throw new common_1.NotFoundException(error.message);
        return { receipt: data };
    }
};
exports.ReceiptController = ReceiptController;
__decorate([
    (0, common_1.Post)('print'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.PrintReceiptSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReceiptController.prototype, "printReceipt", null);
__decorate([
    (0, common_1.Get)('receipt/:transactionId'),
    __param(0, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReceiptController.prototype, "getReceipt", null);
exports.ReceiptController = ReceiptController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ReceiptController);
//# sourceMappingURL=receipt.controller.js.map