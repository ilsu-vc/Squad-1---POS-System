"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintReceiptSchema = void 0;
const zod_1 = require("zod");
exports.PrintReceiptSchema = zod_1.z.object({
    receiptNumber: zod_1.z.union([zod_1.z.string().max(50), zod_1.z.number()]).optional(),
    items: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().max(200),
        quantity: zod_1.z.number().int().min(1),
        price: zod_1.z.number().min(0),
    })).min(1, 'At least one item is required'),
    vatable: zod_1.z.number().min(0).optional(),
    vatAmount: zod_1.z.number().min(0).optional(),
    total: zod_1.z.number().min(0),
    splitPayments: zod_1.z.array(zod_1.z.object({
        method: zod_1.z.string().max(50),
        amount: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
        refNo: zod_1.z.string().max(100).optional(),
        cardLast4: zod_1.z.string().max(4).optional(),
        mobileProvider: zod_1.z.string().max(50).optional(),
    })).optional(),
});
//# sourceMappingURL=schemas.js.map