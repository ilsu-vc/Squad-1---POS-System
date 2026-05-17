import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
import { InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';

describe('TransactionController (Unit)', () => {
  let controller: TransactionController;
  let txService: jest.Mocked<TransactionService>;
  let supabaseService: jest.Mocked<SupabaseService>;
  let rabbitmqService: jest.Mocked<RabbitMQService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: {
            decrementStock: jest.fn(),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn(),
          },
        },
        {
          provide: RabbitMQService,
          useValue: {
            publishTransactionCompleted: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    txService = module.get(TransactionService);
    supabaseService = module.get(SupabaseService);
    rabbitmqService = module.get(RabbitMQService);
  });

  describe('VAT and change calculation edge cases (SCRUM-316)', () => {
    it('should calculate correct change amount even with large fractional payments', async () => {
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: [{ o_receipt_number: 'REC-123' }], error: null }),
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({ eq: jest.fn() }),
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      // We pass amountPaid to completeTransaction
      const body = {
        transactionId: 'uuid',
        vat: 10.555,
        subtotal: 100,
        totalAmount: 110.55,
        amountPaid: 150.75, // Edge case fractional payment
        paymentMethod: 'cash',
        itemsCount: 1,
        items: [],
      };

      const res = await controller.completeTransaction(body);
      
      // change = amountPaid - totalAmount
      // 150.75 - 110.55 = 40.20
      expect(res.changeAmount).toBeCloseTo(40.20);
      expect(res.receiptNumber).toBe('REC-123');
    });

    it('should return 0 change if amountPaid is exactly equal to totalAmount', async () => {
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: [{ o_receipt_number: 'REC-124' }], error: null }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      const body = {
        transactionId: 'uuid',
        vat: 12,
        subtotal: 100,
        totalAmount: 112,
        amountPaid: 112,
        paymentMethod: 'cash',
        itemsCount: 1,
        items: [],
      };

      const res = await controller.completeTransaction(body);
      expect(res.changeAmount).toBe(0);
    });

    it('should gracefully handle 0 VAT transactions (e.g. VAT exempt)', async () => {
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: [{ o_receipt_number: 'REC-125' }], error: null }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      const body = {
        transactionId: 'uuid',
        vat: 0,
        subtotal: 100,
        totalAmount: 100,
        amountPaid: 200,
        paymentMethod: 'cash',
        itemsCount: 1,
        items: [],
      };

      const res = await controller.completeTransaction(body);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'confirm_payment_and_issue_receipt',
        expect.objectContaining({ p_vat: 0, p_total_amount: 100 })
      );
      expect(res.changeAmount).toBe(100);
    });
  });

  describe('Hold/Resume, Split Payment, and Partial Refund logic (SCRUM-315)', () => {
    it('should successfully hold a transaction', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 999 }, error: null }),
            }),
          }),
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      await controller.holdTransaction({ label: 'Customer A', total: 100, items: [] }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ holdId: 999, message: 'Transaction held successfully' });
    });

    it('should resume a held transaction successfully', async () => {
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'held_transactions') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: 999, items: [], total: 100, label: 'Customer A' }, error: null })
                })
              }),
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            };
          }
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      const res = await controller.resumeTransaction('999');
      expect(res).toEqual({ message: 'Held transaction resumed', items: [], total: 100, label: 'Customer A' });
    });

    it('should throw NotFoundException if trying to resume non-existent hold', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not Found' } })
            })
          })
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      await expect(controller.resumeTransaction('123')).rejects.toThrow(NotFoundException);
    });

    it('should process a partial refund logic correctly', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'transactions') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValueOnce({ data: { id: 'orig', status: 'paid' }, error: null }) // Original tx
                })
              }),
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValueOnce({ data: { id: 'refund-tx' }, error: null }) // Refund tx
                })
              })
            };
          }
          if (table === 'transaction_items') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null })
            };
          }
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      const refundBody = {
        originalTransactionId: 'orig',
        items: [{ product_id: 'prod1', name: 'Product 1', unit_price: 50, quantity: 1 }],
        refundSubtotal: 45,
        refundTax: 5,
        refundTotal: 50,
        reason: 'Defective item'
      };

      await controller.refundTransaction(refundBody, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        refundTransactionId: 'refund-tx',
        originalTransactionId: 'orig',
        message: 'Refund processed successfully'
      });
    });

    it('should support logic for split payments edge cases (mock simulation)', async () => {
      // Split payments aren't directly modeled via a separate endpoint but we can test the structure
      // of totalAmount vs multiple components if we were to process them.
      // This test ensures our payload can gracefully accommodate split concepts conceptually if passed.
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({ data: [{ o_receipt_number: 'REC-SPLIT' }], error: null }),
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({ eq: jest.fn() }),
        }),
      };
      supabaseService.getClient.mockReturnValue(mockSupabase as any);

      const splitBody = {
        transactionId: 'uuid',
        vat: 10,
        subtotal: 90,
        totalAmount: 100,
        amountPaid: 100, // 50 cash + 50 card aggregated
        paymentMethod: 'split', // Using split as string
        itemsCount: 1,
        items: [],
      };

      const res = await controller.completeTransaction(splitBody);
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'confirm_payment_and_issue_receipt',
        expect.objectContaining({ p_payment_method: 'split' })
      );
      expect(res.receiptNumber).toBe('REC-SPLIT');
    });
  });
});
