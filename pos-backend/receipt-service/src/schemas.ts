import { z } from 'zod';

export const PrintReceiptSchema = z.object({
  receiptNumber: z.union([z.string().max(50), z.number()]).optional(),
  items: z.array(
    z.object({
      name: z.string().max(200),
      quantity: z.number().int().min(1),
      price: z.number().min(0),
    })
  ).min(1, 'At least one item is required'),
  vatable: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0),
  splitPayments: z.array(
    z.object({
      method: z.string().max(50),
      amount: z.union([z.string(), z.number()]),
      refNo: z.string().max(100).optional(),
      cardLast4: z.string().max(4).optional(),
      mobileProvider: z.string().max(50).optional(),
    })
  ).optional(),
});
