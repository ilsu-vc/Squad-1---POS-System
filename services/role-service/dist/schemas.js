"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordSchema = exports.ToggleActiveSchema = exports.UpdateRoleSchema = void 0;
const zod_1 = require("zod");
const ALLOWED_ROLES = ['admin', 'manager', 'cashier', 'staff'];
exports.UpdateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(ALLOWED_ROLES, { error: 'Invalid role value' }),
});
exports.ToggleActiveSchema = zod_1.z.object({
    is_active: zod_1.z.boolean(),
});
exports.ResetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').max(255),
});
//# sourceMappingURL=schemas.js.map