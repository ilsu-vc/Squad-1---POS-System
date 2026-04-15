"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountValidateSchema = exports.RefundSchema = exports.HoldTransactionSchema = exports.UpdateNotesSchema = exports.CancelTransactionSchema = exports.CompleteTransactionSchema = exports.CreateTransactionSchema = exports.TransactionItemSchema = void 0;
const zod_1 = require("zod");
exports.TransactionItemSchema = zod_1.z.object({
    product_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    name: zod_1.z.string().max(200),
    category: zod_1.z.string().max(100).nullable().optional(),
    unit_price: zod_1.z.number().min(0),
    quantity: zod_1.z.number().int().min(1),
});
exports.CreateTransactionSchema = zod_1.z.object({
    vat: zod_1.z.number().min(0).max(1_000_000).optional(),
    subtotal: zod_1.z.number().min(0).max(10_000_000).optional(),
    totalAmount: zod_1.z.number().min(0).max(10_000_000),
    paymentMethod: zod_1.z.string().max(50),
    itemsCount: zod_1.z.number().int().min(1),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required'),
    discountType: zod_1.z.string().max(50).optional(),
    discountAmount: zod_1.z.number().min(0).max(10_000_000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
exports.CompleteTransactionSchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid('Invalid transactionId'),
    vat: zod_1.z.number().min(0).max(1_000_000).optional(),
    subtotal: zod_1.z.number().min(0).max(10_000_000).optional(),
    totalAmount: zod_1.z.number().min(0).max(10_000_000),
    amountPaid: zod_1.z.number().min(0).max(10_000_000).optional(),
    paymentMethod: zod_1.z.string().max(50),
    itemsCount: zod_1.z.number().int().min(1),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required'),
    discountType: zod_1.z.string().max(50).optional(),
    discountAmount: zod_1.z.number().min(0).max(10_000_000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
exports.CancelTransactionSchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid('Invalid transactionId'),
});
exports.UpdateNotesSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
exports.HoldTransactionSchema = zod_1.z.object({
    label: zod_1.z.string().max(200).optional(),
    total: zod_1.z.number().min(0).max(10_000_000),
    items: zod_1.z.array(exports.TransactionItemSchema).min(1, 'At least one item is required'),
});
exports.RefundSchema = zod_1.z.object({
    originalTransactionId: zod_1.z.string().uuid('Invalid originalTransactionId'),
    items: zod_1.z.array(exports.TransactionItemSchema).min(1, 'At least one item is required'),
    refundSubtotal: zod_1.z.number().min(0).max(10_000_000),
    refundTax: zod_1.z.number().min(0).max(1_000_000),
    refundTotal: zod_1.z.number().min(0).max(10_000_000),
    reason: zod_1.z.string().max(500).optional(),
});
exports.DiscountValidateSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Discount code is required').max(50),
    cartTotal: zod_1.z.number().min(0, 'Cart total must be non-negative').max(10_000_000),
    cashierId: zod_1.z.string().uuid('Invalid cashierId').optional(),
});
//# sourceMappingURL=schemas.js.map