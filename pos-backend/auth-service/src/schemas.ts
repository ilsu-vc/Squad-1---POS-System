import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const ClockInSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
});

export const ClockOutSchema = z.object({
  shiftId: z.union([z.string(), z.number()]),
  userId: z.string().uuid('Invalid userId format'),
  clockOutAt: z.string().datetime({ offset: true, message: 'Invalid dateTime format' }),
  totalHours: z.number().min(0).max(1000).nullable().optional(),
  handoverNotes: z.string().max(2000).nullable().optional(),
  cashDiscrepancies: z.string().max(1000).nullable().optional(),
  issues: z.string().max(1000).nullable().optional(),
  pendingItems: z.string().max(1000).nullable().optional(),
});

export const ChangePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
