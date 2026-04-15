"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVED_STATUSES = exports.StockTransferSchema = exports.StockAdjustSchema = exports.DecrementStockSchema = exports.UpdateTransferSchema = exports.CreateTransferSchema = exports.UpdateProductSchema = void 0;
const zod_1 = require("zod");
exports.UpdateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    price: zod_1.z.number().min(0).max(1_000_000).optional(),
    stock: zod_1.z.number().int().min(0).optional(),
    category: zod_1.z.string().max(100).optional(),
    low_stock_threshold: zod_1.z.number().int().min(0).optional(),
});
exports.CreateTransferSchema = zod_1.z.object({
    product_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    product_name: zod_1.z.string().optional(),
    quantity_transfer: zod_1.z.number().int().min(1, 'Quantity must be at least 1'),
    transfer_status: zod_1.z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
    requested_by: zod_1.z.string().optional(),
    destination_branch_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    destination_branch_name: zod_1.z.string().optional(),
});
exports.UpdateTransferSchema = zod_1.z.object({
    transfer_status: zod_1.z.enum(['Pending', 'Approved', 'In-Transit', 'Completed', 'Rejected']).optional(),
    quantity_transfer: zod_1.z.number().int().min(1).optional(),
});
exports.DecrementStockSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(1, 'Quantity must be at least 1'),
});
exports.StockAdjustSchema = zod_1.z.object({
    sku: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    amount: zod_1.z.number().int(),
    reason: zod_1.z.string().optional(),
});
exports.StockTransferSchema = exports.CreateTransferSchema;
exports.RESERVED_STATUSES = ['Pending', 'Approved', 'In-Transit'];
//# sourceMappingURL=schemas.js.map