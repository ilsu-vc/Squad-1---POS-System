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
exports.StockController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase.service");
const rabbitmq_service_1 = require("../rabbitmq.service");
const zod_validation_pipe_1 = require("../zod-validation.pipe");
const schemas_1 = require("../schemas");
let StockController = class StockController {
    supabaseService;
    rabbitmqService;
    constructor(supabaseService, rabbitmqService) {
        this.supabaseService = supabaseService;
        this.rabbitmqService = rabbitmqService;
    }
    async adjustStock(body) {
        const { sku, amount } = body;
        const client = this.supabaseService.getClient();
        const { data: product, error: fetchErr } = await client
            .from('products')
            .select('id, name, stock, low_stock_threshold')
            .eq('id', sku)
            .single();
        if (fetchErr)
            throw new common_1.NotFoundException('Product not found');
        const currentStock = Number(product.stock) || 0;
        const newStock = currentStock + amount;
        const { data, error: updateErr } = await client
            .from('products')
            .update({ stock: newStock })
            .eq('id', sku)
            .select()
            .single();
        if (updateErr)
            throw new common_1.InternalServerErrorException(updateErr.message);
        const threshold = Number(product.low_stock_threshold);
        if (threshold > 0 && data.stock <= threshold) {
            this.rabbitmqService.publishStockLow(product, data.stock);
        }
        return { success: true, sku, newStock: data.stock };
    }
    async transferStock(body) {
        const client = this.supabaseService.getClient();
        const { data, error } = await client
            .from('requesttransfers')
            .insert(body)
            .select()
            .single();
        if (error)
            throw new common_1.InternalServerErrorException(error.message);
        return { transfer: data };
    }
};
exports.StockController = StockController;
__decorate([
    (0, common_1.Post)('adjust'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.StockAdjustSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, common_1.UsePipes)(new zod_validation_pipe_1.ZodValidationPipe(schemas_1.StockTransferSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "transferStock", null);
exports.StockController = StockController = __decorate([
    (0, common_1.Controller)('stock'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        rabbitmq_service_1.RabbitMQService])
], StockController);
//# sourceMappingURL=stock.controller.js.map