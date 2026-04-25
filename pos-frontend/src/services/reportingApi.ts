import { authFetch } from '../utils/authFetch';
/**
 * reportingApi.ts
 * Frontend client for reporting-service (port 4004).
 */

const BASE = '/api/reporting';

export const reportingApi = {
  async getActivityLogs(): Promise<{ logs: any[] }> {
    const res = await authFetch(`${BASE}/activity-logs`);
    return res.json();
  },

  async logActivity(payload: {
    userId: string;
    userEmail: string;
    actionType: string;
    actionDetails: string;
    entityType: string;
    entityId: string | null;
  }) {
    const res = await authFetch(`${BASE}/activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getShiftRecords(): Promise<{ records: any[] }> {
    const res = await authFetch(`${BASE}/shift-records`);
    return res.json();
  },
};
