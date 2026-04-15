import { z } from 'zod';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const ClockInSchema: z.ZodObject<{
    userId: z.ZodString;
}, z.core.$strip>;
export declare const ClockOutSchema: z.ZodObject<{
    shiftId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    userId: z.ZodString;
    clockOutAt: z.ZodString;
    totalHours: z.ZodOptional<z.ZodNumber>;
    handoverNotes: z.ZodOptional<z.ZodString>;
    cashDiscrepancies: z.ZodOptional<z.ZodString>;
    issues: z.ZodOptional<z.ZodString>;
    pendingItems: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ChangePasswordSchema: z.ZodObject<{
    newPassword: z.ZodString;
}, z.core.$strip>;
