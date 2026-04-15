import { z } from 'zod';
export declare const UpdateRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        admin: "admin";
        manager: "manager";
        cashier: "cashier";
        staff: "staff";
    }>;
}, z.core.$strip>;
export declare const ToggleActiveSchema: z.ZodObject<{
    is_active: z.ZodBoolean;
}, z.core.$strip>;
export declare const ResetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
