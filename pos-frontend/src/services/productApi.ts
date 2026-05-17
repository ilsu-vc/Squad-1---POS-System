import { authFetch } from '../utils/authFetch';
import { getCached, setCache } from '../utils/productCache';
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

  /**
   * T1: Search products via API with 60-second cache.
   * Returns matching products for the given query string.
   * Falls back to an empty array on failure (T4).
   */
  async searchProducts(query: string): Promise<{ products: any[]; error?: string }> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return { products: [] };
    }

    const cacheKey = `search:${trimmed}`;
    const cached = getCached<{ products: any[] }>(cacheKey);
    if (cached) return cached;

    try {
      const res = await authFetch(`${BASE}/products?search=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(`Search API returned ${res.status}`);
      }
      const data = await res.json();
      const result = { products: data.products || [] };
      setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      console.error('Product search API error:', err);
      return { products: [], error: err.message || 'Search failed' };
    }
  },

  /**
   * T2: Fetch live stock level for a single product by ID.
   * Cached for 60 seconds to reduce redundant calls.
   * Falls back gracefully on failure (T4).
   */
  async getStockLevel(productId: number | string): Promise<{
    stock: number | null;
    available_stock: number | null;
    reserved_transfer_qty: number;
    low_stock_threshold: number;
    error?: string;
  }> {
    const cacheKey = `stock:${productId}`;
    const cached = getCached<{
      stock: number | null;
      available_stock: number | null;
      reserved_transfer_qty: number;
      low_stock_threshold: number;
    }>(cacheKey);
    if (cached) return cached;

    try {
      const res = await authFetch(`${BASE}/products/${productId}`);
      if (!res.ok) {
        throw new Error(`Stock API returned ${res.status}`);
      }
      const data = await res.json();
      // Handle nested responses: { product: {...} } or flat {...}
      const p = data.product || data;
      // Map all possible field name conventions from the inventory service
      const stock = p.stock ?? p.total_stock ?? null;
      const available = p.available_stock ?? p.available ?? stock;
      const reserved = p.reserved_transfer_qty ?? p.on_hold ?? p.reserved ?? 0;
      const threshold = p.low_stock_threshold ?? p.threshold ?? 0;

      const result = {
        stock: stock !== null ? Number(stock) : null,
        available_stock: available !== null ? Number(available) : null,
        reserved_transfer_qty: Number(reserved),
        low_stock_threshold: Number(threshold),
      };
      setCache(cacheKey, result);
      return result;
    } catch (err: any) {
      console.error('Stock level API error:', err);
      return {
        stock: null,
        available_stock: null,
        reserved_transfer_qty: 0,
        low_stock_threshold: 0,
        error: err.message || 'Failed to fetch stock level',
      };
    }
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
