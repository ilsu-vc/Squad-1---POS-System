import { authFetch } from '../utils/authFetch';
/**
 * receiptApi.ts
 * Frontend client for receipt-service (port 4006).
 */

const BASE = '/api/receipts';

export const receiptApi = {
  async printReceipt(data: {
    receiptNumber?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    vatable?: number;
    vatAmount?: number;
    total?: number;
    splitPayments?: Array<{
      method: string;
      amount: string;
      refNo?: string;
      cardLast4?: string;
      mobileProvider?: string;
    }>;
  }) {
    const res = await authFetch(`${BASE}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getReceipt(transactionId: string): Promise<{ receipt: any }> {
    const res = await authFetch(`${BASE}/receipt/${transactionId}`);
    return res.json();
  },
};
