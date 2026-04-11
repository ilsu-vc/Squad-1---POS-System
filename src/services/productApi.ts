import { authFetch } from '../utils/authFetch';
/**
 * productApi.ts
 * Frontend client for product-service (port 4002).
 */

const BASE = '/api/products';

export const productApi = {
  async getProducts(): Promise<{ products: any[]; transfers: any[] }> {
    const res = await authFetch(`${BASE}/products`);
    return res.json();
  },

  async updateProduct(id: number | string, updates: Record<string, any>) {
    const res = await authFetch(`${BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async getBranches(): Promise<any[]> {
    const res = await authFetch(`${BASE}/branches`);
    const data = await res.json();
    return data.branches || [];
  },

  async getTransfers(): Promise<{ transfers: any[] }> {
    const res = await authFetch(`${BASE}/transfers`);
    return res.json();
  },

  async createTransfer(payload: Record<string, any>) {
    const res = await authFetch(`${BASE}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateTransfer(id: number | string, updates: Record<string, any>) {
    const res = await authFetch(`${BASE}/transfers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },
};
