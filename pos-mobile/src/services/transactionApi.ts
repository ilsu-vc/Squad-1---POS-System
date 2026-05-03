/**
 * Transaction API service
 */
import { apiFetch, authFetch } from './apiClient';

export const transactionApi = {
  startTransaction: async (userId: string) => {
    return apiFetch('/api/transactions/transactions/start', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  completeTransaction: async (payload: {
    transactionId: string;
    vat: number;
    subtotal: number;
    totalAmount: number;
    amountPaid: number;
    paymentMethod: string;
    itemsCount: number;
    items: any[];
    discountType?: string;
    discountAmount?: number;
  }) => {
    return apiFetch('/api/transactions/transactions/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelTransaction: async (transactionId: string) => {
    return apiFetch('/api/transactions/transactions/cancel', {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    });
  },

  getTransactionHistory: async () => {
    return apiFetch('/api/transactions/transactions');
  },

  getReceipt: async (transactionId: string) => {
    return apiFetch(`/api/transactions/transactions/${transactionId}/receipt`);
  },
};
