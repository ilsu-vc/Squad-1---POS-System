import { SupabaseService } from '../supabase.service';
import { RabbitMQService } from '../rabbitmq.service';
import { TransactionService } from './transaction.service';
export declare class TransactionController {
    private readonly supabase;
    private readonly rabbitmq;
    private readonly txService;
    constructor(supabase: SupabaseService, rabbitmq: RabbitMQService, txService: TransactionService);
    createTransaction(body: any): Promise<{
        transactionId: any;
        receiptNumber: any;
    }>;
    getTransactions(): Promise<{
        transactions: any[];
    }>;
    getTransaction(id: string): Promise<{
        transaction: {
            id: any;
            status: any;
            totalAmount: any;
            vat: any;
            subtotal: any;
            paymentMethod: any;
            itemsCount: any;
            discountType: any;
            discountAmount: any;
            notes: any;
            tags: any;
            createdAt: any;
            receiptNumber: any;
            items: any;
        };
    }>;
    getReceipt(id: string): Promise<{
        receipt: any;
    }>;
    holdTransaction(body: any): Promise<{
        holdId: any;
        message: string;
    }>;
    resumeTransaction(id: string): Promise<{
        message: string;
        items: any;
        total: any;
        label: any;
    }>;
    refundTransaction(body: any): Promise<{
        refundTransactionId: any;
        originalTransactionId: any;
        refundTotal: number;
        message: string;
    }>;
    initiateTransaction(): Promise<{
        transactionId: any;
    }>;
    completeTransaction(body: any): Promise<{
        receiptNumber: any;
        transactionId: any;
        changeAmount: number;
    }>;
    cancelTransaction(body: any): Promise<{
        success: boolean;
    }>;
    updateNotes(id: string, body: any): Promise<{
        success: boolean;
    }>;
}
