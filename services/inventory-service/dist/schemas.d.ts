import { z } from 'zod';
export declare const UpdateProductSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodOptional<z.ZodNumber>;
    category: z.ZodOptional<z.ZodString>;
    low_stock_threshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const CreateTransferSchema: z.ZodObject<{
    product_id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    product_name: z.ZodOptional<z.ZodString>;
    quantity_transfer: z.ZodNumber;
    transfer_status: z.ZodOptional<z.ZodEnum<{
        Pending: "Pending";
        Approved: "Approved";
        "In-Transit": "In-Transit";
        Completed: "Completed";
        Rejected: "Rejected";
    }>>;
    requested_by: z.ZodOptional<z.ZodString>;
    destination_branch_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    destination_branch_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UpdateTransferSchema: z.ZodObject<{
    transfer_status: z.ZodOptional<z.ZodEnum<{
        Pending: "Pending";
        Approved: "Approved";
        "In-Transit": "In-Transit";
        Completed: "Completed";
        Rejected: "Rejected";
    }>>;
    quantity_transfer: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const DecrementStockSchema: z.ZodObject<{
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const StockAdjustSchema: z.ZodObject<{
    sku: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    amount: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const StockTransferSchema: z.ZodObject<{
    product_id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    product_name: z.ZodOptional<z.ZodString>;
    quantity_transfer: z.ZodNumber;
    transfer_status: z.ZodOptional<z.ZodEnum<{
        Pending: "Pending";
        Approved: "Approved";
        "In-Transit": "In-Transit";
        Completed: "Completed";
        Rejected: "Rejected";
    }>>;
    requested_by: z.ZodOptional<z.ZodString>;
    destination_branch_id: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    destination_branch_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RESERVED_STATUSES: string[];
