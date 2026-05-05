import { z } from 'zod';

export const TransactionItemSchema = z.object({
  product_id: z.union([z.string(), z.number()]).optional(),
  name: z.string().max(200),
  category: z.string().max(100).nullable().optional(),
  unit_price: z.number().min(0),
  quantity: z.number().int().min(1),
});

export const CreateTransactionSchema = z.object({
  vat: z.number().min(0).max(1_000_000).optional(),
  subtotal: z.number().min(0).max(10_000_000).optional(),
  totalAmount: z.number().min(0).max(10_000_000),
  paymentMethod: z.string().max(50),
  itemsCount: z.number().int().min(1),
  items: z.array(z.any()).min(1, 'At least one item is required'),
  discountType: z.string().max(50).optional(),
  discountAmount: z.number().min(0).max(10_000_000).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const CompleteTransactionSchema = z.object({
  transactionId: z.string().min(1, 'Invalid transactionId'),
  vat: z.number().min(0).max(1_000_000).optional(),
  subtotal: z.number().min(0).max(10_000_000).optional(),
  totalAmount: z.number().min(0).max(10_000_000),
  amountPaid: z.number().min(0).max(10_000_000).optional(),
  paymentMethod: z.string().max(50),
  itemsCount: z.number().int().min(1),
  items: z.array(z.any()).min(1, 'At least one item is required'),
  discountType: z.string().max(50).optional(),
  discountAmount: z.number().min(0).max(10_000_000).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const CancelTransactionSchema = z.object({
  transactionId: z.string().min(1, 'Invalid transactionId'),
});

export const UpdateNotesSchema = z.object({
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const HoldTransactionSchema = z.object({
  label: z.string().max(200).optional(),
  total: z.number().min(0).max(10_000_000),
  items: z.array(TransactionItemSchema).min(1, 'At least one item is required'),
});

export const RefundSchema = z.object({
  originalTransactionId: z.string().uuid('Invalid originalTransactionId'),
  items: z.array(TransactionItemSchema).min(1, 'At least one item is required'),
  refundSubtotal: z.number().min(0).max(10_000_000),
  refundTax: z.number().min(0).max(1_000_000),
  refundTotal: z.number().min(0).max(10_000_000),
  reason: z.string().max(500).optional(),
});

export const DiscountValidateSchema = z.object({
  code: z.string().min(1, 'Discount code is required').max(50),
  cartTotal: z.number().min(0, 'Cart total must be non-negative').max(10_000_000),
  cashierId: z.string().uuid('Invalid cashierId').optional(),
});
