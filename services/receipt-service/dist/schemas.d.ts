import { z } from 'zod';
export declare const PrintReceiptSchema: z.ZodObject<{
    receiptNumber: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
    }, z.core.$strip>>;
    vatable: z.ZodOptional<z.ZodNumber>;
    vatAmount: z.ZodOptional<z.ZodNumber>;
    total: z.ZodNumber;
    splitPayments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        method: z.ZodString;
        amount: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        refNo: z.ZodOptional<z.ZodString>;
        cardLast4: z.ZodOptional<z.ZodString>;
        mobileProvider: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
