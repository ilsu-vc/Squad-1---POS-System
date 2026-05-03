/**
 * Reporting API service
 */
import { apiFetch } from './apiClient';

export const reportingApi = {
  logActivity: async (payload: {
    userId: string;
    userEmail: string;
    actionType: string;
    actionDetails: string;
    entityType: string;
    entityId: string;
  }) => {
    return apiFetch('/api/reporting/activity', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDailySummary: async () => {
    return apiFetch('/api/reporting/summary/daily');
  },

  getActivityLog: async (params?: { userId?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return apiFetch(`/api/reporting/activity${qs ? `?${qs}` : ''}`);
  },
};
