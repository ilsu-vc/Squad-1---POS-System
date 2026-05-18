import { authFetch } from '../utils/authFetch';
import { getCached, setCache } from '../utils/productCache';

/**
 * discountApi.ts
 * POS-S4-008: Discount and Promo API Integration
 * T1: Wire discount code validation to API with error display
 * T2: Implement approval request + polling flow for manual discounts
 */

const BASE = '/api/transactions';

export interface DiscountValidationResult {
  valid: boolean;
  discountType?: string;
  discountPercent?: number;
  description?: string;
  error?: string;
}

export interface DiscountApprovalRequest {
  id?: string;
  status: 'pending' | 'approved' | 'rejected';
  discountType: string;
  discountPercent: number;
  requestedBy: string;
  approvedBy?: string;
  reason?: string;
  error?: string;
}

export const discountApi = {
  /**
   * T1: Validate a discount code against the API.
   * Returns whether the code is valid and the discount details.
   * Falls back gracefully on API failure (T3 of 008).
   */
  async validateDiscountCode(code: string, cartTotal?: number): Promise<DiscountValidationResult> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      return { valid: false, error: 'Discount code cannot be empty.' };
    }

    const cacheKey = `discount:${trimmed}`;
    const cached = getCached<DiscountValidationResult>(cacheKey);
    if (cached) return cached;

    try {
      const res = await authFetch(`${BASE}/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, cartTotal: cartTotal ?? 0 }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Validation failed (${res.status})`;
        return { valid: false, error: errorMsg };
      }

      const data = await res.json();
      const result: DiscountValidationResult = {
        valid: data.valid ?? false,
        discountType: data.discountType || data.discount?.code || 'Promo Code',
        discountPercent: data.discountPercent ?? data.discount?.value ?? 0,
        description: data.description || data.discount?.description,
        error: data.valid ? undefined : (data.error || 'Invalid discount code.'),
      };

      // Only cache valid results
      if (result.valid) {
        setCache(cacheKey, result);
      }
      return result;
    } catch (err: any) {
      console.error('Discount validation API error:', err);
      return { valid: false, error: 'Discount service unavailable. Please try again.' };
    }
  },

  /**
   * T2: Submit a manual discount approval request.
   * Used when a cashier needs supervisor/manager approval for a manual discount.
   */
  async requestDiscountApproval(payload: {
    transactionId?: string;
    discountType: string;
    discountPercent: number;
    requestedBy: string;
    reason: string;
  }): Promise<DiscountApprovalRequest> {
    try {
      const res = await authFetch(`${BASE}/discounts/approval/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          status: 'rejected',
          discountType: payload.discountType,
          discountPercent: payload.discountPercent,
          requestedBy: payload.requestedBy,
          error: errorData.error || 'Failed to submit approval request.',
        };
      }

      const data = await res.json();
      return {
        id: data.id || data.requestId,
        status: data.status || 'pending',
        discountType: payload.discountType,
        discountPercent: payload.discountPercent,
        requestedBy: payload.requestedBy,
        approvedBy: data.approvedBy,
      };
    } catch (err: any) {
      console.error('Discount approval request error:', err);
      return {
        status: 'rejected',
        discountType: payload.discountType,
        discountPercent: payload.discountPercent,
        requestedBy: payload.requestedBy,
        error: 'Approval service unavailable.',
      };
    }
  },

  /**
   * T2: Poll the status of a discount approval request.
   * Polls every `intervalMs` until approved, rejected, or timeout.
   */
  async pollApprovalStatus(
    requestId: string,
    options: { intervalMs?: number; timeoutMs?: number; onStatusChange?: (status: string) => void } = {}
  ): Promise<DiscountApprovalRequest> {
    const { intervalMs = 3000, timeoutMs = 120000, onStatusChange } = options;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const poll = async () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve({
            id: requestId,
            status: 'rejected',
            discountType: '',
            discountPercent: 0,
            requestedBy: '',
            error: 'Approval request timed out.',
          });
          return;
        }

        try {
          const res = await authFetch(`${BASE}/discounts/approval/${requestId}`);
          if (res.ok) {
            const data = await res.json();
            const status = data.status || 'pending';
            onStatusChange?.(status);

            if (status === 'approved' || status === 'rejected') {
              resolve({
                id: requestId,
                status,
                discountType: data.discountType || '',
                discountPercent: data.discountPercent || 0,
                requestedBy: data.requestedBy || '',
                approvedBy: data.approvedBy,
                reason: data.reason,
              });
              return;
            }
          }
        } catch (err) {
          console.warn('Polling error, retrying...', err);
        }

        setTimeout(poll, intervalMs);
      };

      poll();
    });
  },
};
