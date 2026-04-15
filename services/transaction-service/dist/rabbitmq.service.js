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
var RabbitMQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
const common_1 = require("@nestjs/common");
const amqp = __importStar(require("amqplib"));
let RabbitMQService = RabbitMQService_1 = class RabbitMQService {
    logger = new common_1.Logger(RabbitMQService_1.name);
    connection = null;
    channel = null;
    RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    EXCHANGE_NAME = 'transaction_events';
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
                this.logger.log('✅ [TransactionService] Connected to RabbitMQ');
                this.connection.on('error', (err) => {
                    this.logger.error(`[TransactionService] RabbitMQ connection error: ${err.message}`);
                    this.channel = null;
                });
                this.connection.on('close', () => {
                    this.logger.warn('[TransactionService] RabbitMQ connection closed. Reconnecting...');
                    this.channel = null;
                    setTimeout(() => this.connect(5), 5000);
                });
                return;
            }
            catch (err) {
                this.logger.warn(`[TransactionService] RabbitMQ connection attempt ${i + 1}/${retries} failed: ${err.message}`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        this.logger.error('[TransactionService] Could not connect to RabbitMQ. Events will not be published.');
    }
    publishTransactionCompleted(payload) {
        if (!this.channel) {
            this.logger.warn('[TransactionService] RabbitMQ channel not available — skipping event publish');
            return;
        }
        try {
            const message = Buffer.from(JSON.stringify({
                event: 'transaction.completed',
                data: payload,
                timestamp: new Date().toISOString(),
            }));
            this.channel.publish(this.EXCHANGE_NAME, '', message, { persistent: true });
            this.logger.log('[TransactionService] Published transaction.completed event');
        }
        catch (err) {
            this.logger.error(`[TransactionService] Failed to publish event: ${err.message}`);
        }
    }
    isConnected() {
        return this.channel !== null;
    }
};
exports.RabbitMQService = RabbitMQService;
exports.RabbitMQService = RabbitMQService = RabbitMQService_1 = __decorate([
    (0, common_1.Injectable)()
], RabbitMQService);
//# sourceMappingURL=rabbitmq.service.js.map