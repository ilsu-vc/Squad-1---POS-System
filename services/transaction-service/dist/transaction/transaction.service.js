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
var TransactionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const supabase_service_1 = require("../supabase.service");
const rabbitmq_service_1 = require("../rabbitmq.service");
let TransactionService = TransactionService_1 = class TransactionService {
    request;
    supabaseService;
    rabbitmqService;
    logger = new common_1.Logger(TransactionService_1.name);
    constructor(request, supabaseService, rabbitmqService) {
        this.request = request;
        this.supabaseService = supabaseService;
        this.rabbitmqService = rabbitmqService;
    }
    async decrementStock(items) {
        const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:4002';
        const authHeader = this.request.headers.authorization;
        await Promise.allSettled(items.map(async (item) => {
            if (!item.product_id)
                return;
            try {
                const response = await fetch(`${inventoryServiceUrl}/stock/adjust`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authHeader ? { Authorization: authHeader } : {}),
                    },
                    body: JSON.stringify({
                        sku: item.product_id,
                        amount: -Math.abs(Number(item.quantity) || 1),
                        reason: 'POS Sale'
                    }),
                });
                if (!response.ok) {
                    const errText = await response.text();
                    this.logger.error(`Stock adjustment failed for ${item.product_id}: ${response.status} ${errText}`);
                }
                else {
                    this.logger.log(`Stock adjusted for product ${item.product_id} by -${item.quantity}`);
                }
            }
            catch (err) {
                this.logger.error(`Error adjusting stock for product ${item.product_id}:`, err);
            }
        }));
    }
};
exports.TransactionService = TransactionService;
exports.TransactionService = TransactionService = TransactionService_1 = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(0, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [Object, supabase_service_1.SupabaseService,
        rabbitmq_service_1.RabbitMQService])
], TransactionService);
//# sourceMappingURL=transaction.service.js.map