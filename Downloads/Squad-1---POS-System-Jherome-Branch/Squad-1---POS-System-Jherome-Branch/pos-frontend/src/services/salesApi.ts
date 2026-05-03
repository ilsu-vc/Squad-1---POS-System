import { authFetch } from '../utils/authFetch';
/**
 * salesApi.ts
 * Frontend client for transaction-service (port 4007).
 * Transaction processing logic is now owned by transaction-service.
 */

const BASE = '/api/transactions';

export const salesApi = {
  async initiateTransaction(): Promise<{ transactionId: string }> {
    const res = await authFetch(`${BASE}/transactions/initiate`, { method: 'POST' });
    return res.json();
  },

  async completePayment(payload: {
    transactionId: string;
    vat: number;
    subtotal: number;
    totalAmount: number;
    paymentMethod: string;
    itemsCount: number;
    items: Array<{ name: string; category: string | null; unit_price: number; quantity: number }>;
    discountType: string;
    discountAmount: number;
    notes?: string;
    tags?: string[];
  }): Promise<{ receiptNumber: string | null; transactionId: string }> {
    const res = await authFetch(`${BASE}/transactions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async cancelTransaction(transactionId: string) {
    const res = await authFetch(`${BASE}/transactions/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    return res.json();
  },

  async updateNotes(transactionId: string, notes: string, tags: string[]) {
    const res = await authFetch(`${BASE}/transactions/${transactionId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, tags }),
    });
    return res.json();
  },
  async fetchTransactions(): Promise<{ transactions: any[] }> {
    const res = await authFetch(`${BASE}/transactions`);
    return res.json();
  },
};
