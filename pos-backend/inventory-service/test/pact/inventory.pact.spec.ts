import { Verifier } from '@pact-foundation/pact';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as path from 'path';

// Mocks for external dependencies
jest.mock('../../src/supabase.service');
jest.mock('../../src/rabbitmq.service');

describe('Inventory Service Pact Verification', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('SupabaseService')
      .useValue({
        getClient: () => ({
          from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found', code: 'PGRST116' } }) }), order: () => ({ data: [], error: null }) }),
            insert: () => ({ select: () => ({ single: async () => ({ data: { id: 1 }, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) }),
            delete: () => ({ eq: async () => ({ error: null }) }),
          }),
        }),
      })
      .overrideProvider('RabbitMQService')
      .useValue({ publishStockLow: jest.fn(), publishTransactionCompleted: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    const server: any = app.getHttpServer();
    port = server.address().port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should verify the pacts from the broker', async () => {
    const verifier = new Verifier({
      providerBaseUrl: `http://127.0.0.1:${port}`,
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL || 'http://localhost:9292',
      pactBrokerUsername: process.env.PACT_BROKER_USERNAME || 'pact_user',
      pactBrokerPassword: process.env.PACT_BROKER_PASSWORD || 'pact_pass',
      provider: 'InventoryService',
      publishVerificationResult: true,
      providerVersion: process.env.GIT_COMMIT || 'local-v3',
      providerVersionBranch: process.env.GIT_BRANCH || 'main',
      consumerVersionSelectors: [{ mainBranch: true }, { latest: true }],
      logLevel: 'warn',
    });

    const result = await verifier.verifyProvider();
    console.log('Pact Verification Complete!');
    console.log('finished:', result);
  }, 60000);
});
