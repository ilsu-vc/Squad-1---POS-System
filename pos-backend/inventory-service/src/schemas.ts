import { z } from 'zod';

export const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  category: z.string().max(100).optional(),
  low_stock_threshold: z.coerce.number().int().min(0).optional(),
});

export const CreateTransferSchema = z.object({
  product_id: z.union([z.string(), z.number()]),
  product_name: z.string().optional(),
  quantity_transfer: z.number().int().min(1, 'Quantity must be at least 1'),
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Received', 'Cancelled']).optional(),
  requested_by: z.string().optional(),
  destination_branch_id: z.union([z.string(), z.number()]).optional(),
  destination_branch_name: z.string().optional(),
});

export const UpdateTransferSchema = z.object({
  transfer_status: z.enum(['Pending', 'Approved', 'In-Transit', 'Received', 'Cancelled']).optional(),
  quantity_transfer: z.number().int().min(1).optional(),
}).passthrough();

export const DecrementStockSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const StockAdjustSchema = z.object({
  sku: z.union([z.string(), z.number()]),
  amount: z.number().int(),
  reason: z.string().optional(),
});

export const StockTransferSchema = CreateTransferSchema;

export const RESERVED_STATUSES = ['Pending', 'Approved', 'In-Transit'];
