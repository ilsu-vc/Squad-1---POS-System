import { z } from 'zod';

const ALLOWED_ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'SALE', 'REFUND', 'PRODUCT_UPDATE', 'ROLE_CHANGE',
  'SHIFT_CLOCK_IN', 'SHIFT_CLOCK_OUT', 'PASSWORD_CHANGE', 'USER_DEACTIVATED',
  'USER_ACTIVATED', 'TRANSFER_REQUEST', 'TRANSFER_STATUS_UPDATE', 'ERROR',
  'ORDER_HELD', 'ORDER_RESUMED', 'ORDER_DELETED', 'DISCOUNT_APPLIED', 'EXPORT',
] as const;

export const CreateActivityLogSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  userEmail: z.string().email('Invalid email format').max(255).optional(),
  actionType: z.enum(ALLOWED_ACTION_TYPES, { error: 'Invalid action type' }),
  actionDetails: z.string().max(2000).optional(),
  entityType: z.string().max(100).optional(),
  entityId: z.union([z.string().max(100), z.number()]).optional(),
});
