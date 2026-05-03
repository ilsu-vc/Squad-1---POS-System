import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { StockController } from '../src/stock/stock.controller';
import { SupabaseService } from '../src/supabase.service';
import { RabbitMQService } from '../src/rabbitmq.service';



describe('Inventory stock.low event emission (integration)', () => {
  let app: INestApplication;
  const rabbitMQService = { publishStockLow: jest.fn(), isConnected: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const product = { id: 1, name: 'Coffee', stock: 8, low_stock_threshold: 5 };
    const updatedProduct = { id: 1, stock: 5 };

    const mockSupabaseClient = {
      from: jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: product, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: updatedProduct, error: null }),
              }),
            }),
          }),
        }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        { provide: SupabaseService, useValue: { getClient: jest.fn().mockReturnValue(mockSupabaseClient) } },
        { provide: RabbitMQService, useValue: rabbitMQService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('publishes stock.low when decrement reaches low stock threshold', async () => {
    await request(app.getHttpServer())
      .post('/stock/adjust')
      .send({ sku: 1, amount: -3 }) // negative = decrement
      .expect(201)
      .expect({
        success: true,
        sku: 1,
        newStock: 5,
      });

    expect(rabbitMQService.publishStockLow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      5,
    ); 
  });
});



/*
HOW TO RUN TESTS

1. Open terminal
2. Navigate to this folder:
   cd "C:\Users\Kisha\Downloads\Squad-1---POS-System-Jherome-Branch (1)\Squad-1---POS-System-Jherome-Branch\pos-backend\inventory-service"

3. Install dependencies (first time only):
   npm install

4. Run all tests:
   npm run test:all

OR run separately:
   npm test          // unit tests
   npm run test:e2e  // integration tests */