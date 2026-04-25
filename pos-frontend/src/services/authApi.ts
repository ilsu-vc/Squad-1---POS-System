import { authFetch } from '../utils/authFetch';
/**
 * authApi.ts
 * Frontend client for auth-service (port 4001).
 * All direct supabase.auth.* and shift_records calls in App.tsx
 * are replaced with calls to these functions.
 */

const BASE = '/api/auth';

export const authApi = {
  async login(email: string, password: string) {
    const res = await authFetch(`${BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async logout() {
    const res = await authFetch(`${BASE}/logout`, { method: 'POST' });
    return res.json();
  },

  async getSession() {
    const res = await authFetch(`${BASE}/session`);
    return res.json();
  },

  async getProfile(userId: string) {
    const res = await authFetch(`${BASE}/profile/${userId}`);
    return res.json();
  },

  async clockIn(userId: string) {
    const res = await authFetch(`${BASE}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async clockOut(payload: {
    shiftId: number;
    userId: string;
    clockOutAt: string;
    totalHours: number;
    handoverNotes?: string;
    cashDiscrepancies?: string;
    issues?: string;
    pendingItems?: string;
  }) {
    const res = await authFetch(`${BASE}/shift/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getActiveShift(userId: string) {
    const res = await authFetch(`${BASE}/shift/active/${userId}`);
    return res.json();
  },

  async getLatestHandover() {
    const res = await authFetch(`${BASE}/shift/latest-handover`);
    return res.json();
  },

  async changePassword(newPassword: string) {
    const res = await authFetch(`${BASE}/password/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });
    return res.json();
  },
};
