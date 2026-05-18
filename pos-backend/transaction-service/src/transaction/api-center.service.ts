import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TribeClient } from '@implementsprint/sdk';

@Injectable()
export class ApiCenterService implements OnModuleInit {
  private readonly logger = new Logger(ApiCenterService.name);
  private client: TribeClient | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const gatewayUrl = this.config.get<string>('APICENTER_URL');
    const tribeId = this.config.get<string>('APICENTER_TRIBE_ID');
    const secret = this.config.get<string>('APICENTER_TRIBE_SECRET');

    if (!gatewayUrl || !tribeId || !secret) {
      this.logger.warn('⚠️ API Center configuration is missing. SDK operations will be bypassed or fail.');
      return;
    }

    try {
      this.client = new TribeClient({
        gatewayUrl,
        tribeId,
        secret,
      });

      await this.client.authenticate();
      this.logger.log('✅ API Center SDK client successfully authenticated with gateway.');
    } catch (err: any) {
      this.logger.error(`❌ Failed to initialize/authenticate API Center SDK on startup: ${err.message}`);
    }
  }

  async createCheckoutSession(params: {
    referenceId: string;
    idempotencyKey?: string;
    successUrl: string;
    cancelUrl: string;
    paymentMethods?: string[];
    lineItems: Array<{
      name: string;
      quantity: number;
      amount: { value: number; currency: string };
    }>;
  }): Promise<any> {
    const activeClient = this.ensureClientReady();
    return activeClient.paymentCreateCheckoutSession(params as any);
  }

  async getCheckoutStatus(checkoutId: string) {
    const activeClient = this.ensureClientReady();
    return activeClient.paymentGetCheckoutStatus(checkoutId);
  }

  async createRefund(paymentId: string, params: { amount: { value: number; currency: string }; reason: string }) {
    const activeClient = this.ensureClientReady();
    return activeClient.paymentCreateRefund(paymentId, params);
  }

  private ensureClientReady(): TribeClient {
    if (!this.client) {
      throw new InternalServerErrorException('API Center SDK Client is not initialized. Please verify your environment variables.');
    }
    return this.client;
  }
}
