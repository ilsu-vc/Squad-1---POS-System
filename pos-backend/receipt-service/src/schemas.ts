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
  discount: z.number().min(0).optional(),
  discountType: z.string().max(50).optional(),
  total: z.number().min(0),
  paymentMethod: z.string().max(50).optional(),
  amountPaid: z.number().min(0).optional(),
  change: z.number().min(0).optional(),
  cashier: z.string().max(100).optional(),
  date: z.string().optional(),
  storeName: z.string().max(100).optional(),
  storeAddress: z.string().max(200).optional(),
  storeTin: z.string().max(50).optional(),
  splitPayments: z.array(
    z.object({
      method: z.string().max(50),
      amount: z.union([z.string(), z.number()]),
      refNo: z.string().max(100).optional(),
      cardLast4: z.string().max(4).optional(),
      mobileProvider: z.string().max(50).optional(),
    })
  ).optional(),
  // ── Receipt type flags ───────────────────────────────────────────────────
  isReprint: z.boolean().optional(),
  orFields: z.object({
    name: z.string().max(200),
    tin: z.string().max(50),
    address: z.string().max(500),
  }).optional(),
});
