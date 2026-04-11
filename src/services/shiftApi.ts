import { authFetch } from '../utils/authFetch';

/**
 * shiftApi.ts
 * POS-S4-009: Shift and Clock API Integration
 * T1: Wire clock-in and clock-out to API with session state
 * T2: Implement break tracking API calls
 */

const BASE = '/api/auth';

export interface ShiftSession {
  shiftId: number;
  userId: string;
  clockInAt: string;
  clockOutAt?: string | null;
  totalHours?: number | null;
  isOnBreak: boolean;
  currentBreakStart?: string | null;
  breaks: BreakRecord[];
  error?: string;
}

export interface BreakRecord {
  id?: number;
  shiftId: number;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  type: 'short' | 'lunch' | 'other';
}

export const shiftApi = {
  /**
   * T1: Clock in via API and return the session state.
   * Wraps the existing auth-service clock-in endpoint with additional session management.
   */
  async clockIn(userId: string): Promise<ShiftSession> {
    try {
      const res = await authFetch(`${BASE}/shift/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Clock-in failed (${res.status})`);
      }

      const data = await res.json();
      const shift = data.shift || data;

      const session: ShiftSession = {
        shiftId: shift.id,
        userId,
        clockInAt: shift.clock_in_at || new Date().toISOString(),
        clockOutAt: null,
        totalHours: null,
        isOnBreak: false,
        currentBreakStart: null,
        breaks: [],
      };

      // Persist session state to localStorage for offline recovery (T3)
      persistSession(session);
      return session;
    } catch (err: any) {
      console.error('Clock-in API error:', err);
      return {
        shiftId: 0,
        userId,
        clockInAt: '',
        isOnBreak: false,
        breaks: [],
        error: err.message || 'Failed to clock in.',
      };
    }
  },

  /**
   * T1: Clock out via API with session state.
   */
  async clockOut(payload: {
    shiftId: number;
    userId: string;
    clockOutAt: string;
    totalHours: number;
    handoverNotes?: string | null;
    cashDiscrepancies?: string | null;
    issues?: string | null;
    pendingItems?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await authFetch(`${BASE}/shift/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Clock-out failed (${res.status})`);
      }

      // Clear persisted session
      clearPersistedSession();
      return { success: true };
    } catch (err: any) {
      console.error('Clock-out API error:', err);
      return { success: false, error: err.message || 'Failed to clock out.' };
    }
  },

  /**
   * T1: Get active shift session state from API.
   */
  async getActiveSession(userId: string): Promise<ShiftSession | null> {
    try {
      const res = await authFetch(`${BASE}/shift/active/${userId}`);
      if (!res.ok) return null;

      const data = await res.json();
      const shift = data.shift;
      if (!shift) return null;

      const session: ShiftSession = {
        shiftId: shift.id,
        userId,
        clockInAt: shift.clock_in_at,
        clockOutAt: shift.clock_out_at,
        totalHours: shift.total_hours,
        isOnBreak: false,
        currentBreakStart: null,
        breaks: [],
      };

      // Try to merge local break data
      const persisted = getPersistedSession();
      if (persisted && persisted.shiftId === shift.id) {
        session.isOnBreak = persisted.isOnBreak;
        session.currentBreakStart = persisted.currentBreakStart;
        session.breaks = persisted.breaks || [];
      }

      persistSession(session);
      return session;
    } catch (err) {
      console.error('Get active session error:', err);
      // T3/Offline: return persisted session if API is down
      return getPersistedSession();
    }
  },

  /**
   * T2: Start a break for the current shift.
   */
  async startBreak(shiftId: number, type: 'short' | 'lunch' | 'other' = 'short'): Promise<BreakRecord> {
    const now = new Date().toISOString();
    const breakRecord: BreakRecord = {
      shiftId,
      startedAt: now,
      type,
    };

    try {
      const res = await authFetch(`${BASE}/shift/${shiftId}/break/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const data = await res.json();
        breakRecord.id = data.id || data.breakId;
      }
    } catch (err) {
      console.warn('Break start API unavailable, tracking locally:', err);
    }

    // Update persisted session with break state
    const session = getPersistedSession();
    if (session) {
      session.isOnBreak = true;
      session.currentBreakStart = now;
      session.breaks.push(breakRecord);
      persistSession(session);
    }

    return breakRecord;
  },

  /**
   * T2: End the current break for the shift.
   */
  async endBreak(shiftId: number): Promise<BreakRecord | null> {
    const session = getPersistedSession();
    if (!session || !session.isOnBreak || !session.currentBreakStart) {
      return null;
    }

    const now = new Date().toISOString();
    const startMs = new Date(session.currentBreakStart).getTime();
    const durationMinutes = Math.round((Date.now() - startMs) / 60000 * 100) / 100;

    // Find the active break record
    const activeBreak = session.breaks.find(
      (b) => b.startedAt === session.currentBreakStart && !b.endedAt
    );

    if (activeBreak) {
      activeBreak.endedAt = now;
      activeBreak.durationMinutes = durationMinutes;
    }

    try {
      await authFetch(`${BASE}/shift/${shiftId}/break/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakId: activeBreak?.id }),
      });
    } catch (err) {
      console.warn('Break end API unavailable, tracked locally:', err);
    }

    session.isOnBreak = false;
    session.currentBreakStart = null;
    persistSession(session);

    return activeBreak || null;
  },

  /**
   * T2: Get break history for a shift.
   */
  async getBreakHistory(shiftId: number): Promise<BreakRecord[]> {
    try {
      const res = await authFetch(`${BASE}/shift/${shiftId}/breaks`);
      if (res.ok) {
        const data = await res.json();
        return data.breaks || [];
      }
    } catch (err) {
      console.warn('Break history API unavailable, using local:', err);
    }

    // Fallback to persisted data
    const session = getPersistedSession();
    if (session && session.shiftId === shiftId) {
      return session.breaks;
    }
    return [];
  },

  /**
   * T2: Get total break time in minutes for current shift.
   */
  getTotalBreakMinutes(breaks: BreakRecord[]): number {
    return breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  },
};

// ── Session Persistence Helpers (T1 session state + T3 offline support) ──

const SESSION_KEY = 'pharma_shift_session';

function persistSession(session: ShiftSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable (SSR)
  }
}

function getPersistedSession(): ShiftSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPersistedSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // localStorage unavailable
  }
}
