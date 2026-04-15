import { z } from 'zod';
export declare const CreateActivityLogSchema: z.ZodObject<{
    userId: z.ZodString;
    userEmail: z.ZodOptional<z.ZodString>;
    actionType: z.ZodEnum<{
        SALE: "SALE";
        LOGIN: "LOGIN";
        LOGOUT: "LOGOUT";
        REFUND: "REFUND";
        PRODUCT_UPDATE: "PRODUCT_UPDATE";
        ROLE_CHANGE: "ROLE_CHANGE";
        SHIFT_CLOCK_IN: "SHIFT_CLOCK_IN";
        SHIFT_CLOCK_OUT: "SHIFT_CLOCK_OUT";
        PASSWORD_CHANGE: "PASSWORD_CHANGE";
        USER_DEACTIVATED: "USER_DEACTIVATED";
        USER_ACTIVATED: "USER_ACTIVATED";
        TRANSFER_REQUEST: "TRANSFER_REQUEST";
        TRANSFER_STATUS_UPDATE: "TRANSFER_STATUS_UPDATE";
        ERROR: "ERROR";
        ORDER_HELD: "ORDER_HELD";
        ORDER_RESUMED: "ORDER_RESUMED";
        ORDER_DELETED: "ORDER_DELETED";
        DISCOUNT_APPLIED: "DISCOUNT_APPLIED";
        EXPORT: "EXPORT";
    }>;
    actionDetails: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
}, z.core.$strip>;
