import { z } from 'zod';
export declare const TransactionItemSchema: z.ZodObject<{
    product_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    name: z.ZodString;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unit_price: z.ZodNumber;
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const CreateTransactionSchema: z.ZodObject<{
    vat: z.ZodOptional<z.ZodNumber>;
    subtotal: z.ZodOptional<z.ZodNumber>;
    totalAmount: z.ZodNumber;
    paymentMethod: z.ZodString;
    itemsCount: z.ZodNumber;
    items: z.ZodArray<z.ZodAny>;
    discountType: z.ZodOptional<z.ZodString>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const CompleteTransactionSchema: z.ZodObject<{
    transactionId: z.ZodString;
    vat: z.ZodOptional<z.ZodNumber>;
    subtotal: z.ZodOptional<z.ZodNumber>;
    totalAmount: z.ZodNumber;
    amountPaid: z.ZodOptional<z.ZodNumber>;
    paymentMethod: z.ZodString;
    itemsCount: z.ZodNumber;
    items: z.ZodArray<z.ZodAny>;
    discountType: z.ZodOptional<z.ZodString>;
    discountAmount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const CancelTransactionSchema: z.ZodObject<{
    transactionId: z.ZodString;
}, z.core.$strip>;
export declare const UpdateNotesSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const HoldTransactionSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    total: z.ZodNumber;
    items: z.ZodArray<z.ZodObject<{
        product_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        name: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit_price: z.ZodNumber;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const RefundSchema: z.ZodObject<{
    originalTransactionId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        product_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        name: z.ZodString;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit_price: z.ZodNumber;
        quantity: z.ZodNumber;
    }, z.core.$strip>>;
    refundSubtotal: z.ZodNumber;
    refundTax: z.ZodNumber;
    refundTotal: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DiscountValidateSchema: z.ZodObject<{
    code: z.ZodString;
    cartTotal: z.ZodNumber;
    cashierId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
