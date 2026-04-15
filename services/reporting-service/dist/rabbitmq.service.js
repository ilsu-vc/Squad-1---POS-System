"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RabbitMQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
const common_1 = require("@nestjs/common");
const amqp = __importStar(require("amqplib"));
const supabase_service_1 = require("./supabase.service");
let RabbitMQService = RabbitMQService_1 = class RabbitMQService {
    supabaseAdmin;
    logger = new common_1.Logger(RabbitMQService_1.name);
    connection = null;
    channel = null;
    RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    EXCHANGE_NAME = 'transaction_events';
    QUEUE_NAME = 'reporting_queue';
    constructor(supabaseAdmin) {
        this.supabaseAdmin = supabaseAdmin;
    }
    async onModuleInit() {
        await this.connect(5);
    }
    async onModuleDestroy() {
        if (this.channel)
            await this.channel.close();
        if (this.connection)
            await this.connection.close();
    }
    async connect(retries) {
        for (let i = 0; i < retries; i++) {
            try {
                this.connection = await amqp.connect(this.RABBITMQ_URL);
                this.channel = await this.connection.createChannel();
                await this.channel.assertExchange(this.EXCHANGE_NAME, 'fanout', { durable: true });
                await this.channel.assertQueue(this.QUEUE_NAME, { durable: true });
                await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, '');
                await this.channel.prefetch(1);
                this.logger.log(`✅ [ReportingService] Connected to RabbitMQ — consuming from "${this.QUEUE_NAME}"`);
                this.channel.consume(this.QUEUE_NAME, async (msg) => {
                    if (!msg)
                        return;
                    try {
                        const envelope = JSON.parse(msg.content.toString());
                        this.logger.log(`Received event: ${envelope.event}`);
                        if (envelope.event === 'transaction.completed') {
                            const { transactionId, receiptNumber, totalAmount, paymentMethod, itemsCount, items } = envelope.data;
                            const itemsSummary = Array.isArray(items)
                                ? items.map((i) => `${i.name || i.item_name} x${i.quantity}`).join(', ')
                                : `${itemsCount} item(s)`;
                            const details = `Sale completed — Receipt: ${receiptNumber || 'N/A'}, Total: ₱${Number(totalAmount ?? 0).toFixed(2)}, Method: ${paymentMethod}, Items: ${itemsSummary}`;
                            const supabase = this.supabaseAdmin.getClient();
                            const { error } = await supabase.from('user_activity_logs').insert({
                                user_id: null,
                                user_email: null,
                                action_type: 'SALE',
                                action_details: details,
                                entity_type: 'transaction',
                                entity_id: transactionId,
                            });
                            if (error) {
                                this.logger.error(`Failed to log SALE activity: ${error.message}`);
                            }
                            else {
                                this.logger.log(`SALE activity logged for transaction ${transactionId}`);
                            }
                        }
                        this.channel.ack(msg);
                    }
                    catch (err) {
                        this.logger.error(`Error processing message: ${err.message}`);
                        this.channel.nack(msg, false, true);
                    }
                });
                this.connection.on('error', (err) => {
                    this.logger.error(`RabbitMQ connection error: ${err.message}`);
                    this.channel = null;
                });
                this.connection.on('close', () => {
                    this.logger.warn('RabbitMQ connection closed. Reconnecting...');
                    this.channel = null;
                    setTimeout(() => this.connect(5), 5000);
                });
                return;
            }
            catch (err) {
                this.logger.warn(`RabbitMQ connection attempt ${i + 1}/${retries} failed: ${err.message}`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        this.logger.error('Could not connect to RabbitMQ after all retries.');
    }
    isConnected() {
        return this.channel !== null;
    }
};
exports.RabbitMQService = RabbitMQService;
exports.RabbitMQService = RabbitMQService = RabbitMQService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseServiceAdmin])
], RabbitMQService);
//# sourceMappingURL=rabbitmq.service.js.map