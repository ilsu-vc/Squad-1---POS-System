"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangePasswordSchema = exports.ClockOutSchema = exports.ClockInSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').max(255),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').max(128),
});
exports.ClockInSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid userId format'),
});
exports.ClockOutSchema = zod_1.z.object({
    shiftId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    userId: zod_1.z.string().uuid('Invalid userId format'),
    clockOutAt: zod_1.z.string().datetime({ offset: true, message: 'Invalid dateTime format' }),
    totalHours: zod_1.z.number().min(0).max(1000).optional(),
    handoverNotes: zod_1.z.string().max(2000).optional(),
    cashDiscrepancies: zod_1.z.string().max(1000).optional(),
    issues: zod_1.z.string().max(1000).optional(),
    pendingItems: zod_1.z.string().max(1000).optional(),
});
exports.ChangePasswordSchema = zod_1.z.object({
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128),
});
//# sourceMappingURL=schemas.js.map