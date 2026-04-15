"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateActivityLogSchema = void 0;
const zod_1 = require("zod");
const ALLOWED_ACTION_TYPES = [
    'LOGIN', 'LOGOUT', 'SALE', 'REFUND', 'PRODUCT_UPDATE', 'ROLE_CHANGE',
    'SHIFT_CLOCK_IN', 'SHIFT_CLOCK_OUT', 'PASSWORD_CHANGE', 'USER_DEACTIVATED',
    'USER_ACTIVATED', 'TRANSFER_REQUEST', 'TRANSFER_STATUS_UPDATE', 'ERROR',
    'ORDER_HELD', 'ORDER_RESUMED', 'ORDER_DELETED', 'DISCOUNT_APPLIED', 'EXPORT',
];
exports.CreateActivityLogSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid userId format'),
    userEmail: zod_1.z.string().email('Invalid email format').max(255).optional(),
    actionType: zod_1.z.enum(ALLOWED_ACTION_TYPES, { error: 'Invalid action type' }),
    actionDetails: zod_1.z.string().max(2000).optional(),
    entityType: zod_1.z.string().max(100).optional(),
    entityId: zod_1.z.union([zod_1.z.string().max(100), zod_1.z.number()]).optional(),
});
//# sourceMappingURL=schemas.js.map