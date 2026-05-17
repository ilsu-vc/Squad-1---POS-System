import { z } from 'zod';

const ALLOWED_ROLES = ['admin', 'manager', 'cashier', 'staff'] as const;

export const UpdateRoleSchema = z.object({
  role: z.enum(ALLOWED_ROLES, { error: 'Invalid role value' }),
});

export const ToggleActiveSchema = z.object({
  is_active: z.boolean(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
});
