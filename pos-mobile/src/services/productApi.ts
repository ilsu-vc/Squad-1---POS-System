/**
 * Product / Inventory API service
 */
import { apiFetch } from './apiClient';

export const productApi = {
  getProducts: async () => {
    return apiFetch('/api/products/products');
  },

  getProductById: async (id: string) => {
    return apiFetch(`/api/products/products/${id}`);
  },

  /**
   * SCRUM 396: Look up a product by SKU (barcode value)
   */
  getProductBySku: async (sku: string) => {
    return apiFetch(`/api/products/products/${sku}`);
  },

  /**
   * SCRUM 396: Get stock level for a product by SKU
   */
  getProductStock: async (sku: string) => {
    return apiFetch(`/api/products/products/${sku}/stock`);
  },
};
