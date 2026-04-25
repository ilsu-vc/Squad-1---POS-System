import { authFetch } from '../utils/authFetch';
/**
 * roleApi.ts
 * Frontend client for role-service (port 4005).
 */

const BASE = '/api/roles';

export const roleApi = {
  async getUsers(): Promise<{ users: any[] }> {
    const res = await authFetch(`${BASE}/users`);
    return res.json();
  },

  async getUser(id: string): Promise<{ user: any }> {
    const res = await authFetch(`${BASE}/users/${id}`);
    return res.json();
  },

  async updateRole(userId: string, role: string) {
    const res = await authFetch(`${BASE}/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  async toggleActive(userId: string, is_active: boolean) {
    const res = await authFetch(`${BASE}/users/${userId}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    return res.json();
  },

  async resetPassword(email: string) {
    const res = await authFetch(`${BASE}/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },
};
