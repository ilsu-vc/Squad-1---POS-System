import { authFetch } from './authFetch';
/**
 * activityLogger.ts
 * Logs user activity via the reporting-service API instead of calling Supabase directly.
 * This keeps the same public interface so all existing callers (App.tsx, components) need no changes.
 */
import { UserProfile } from '../types/auth';

interface LogActivityParams {
  profile: UserProfile | null;
  actionType: string;
  actionDetails: string;
  entityType: string;
  entityId: string | null;
}

export async function logUserActivity(params: LogActivityParams): Promise<void> {
  const { profile, actionType, actionDetails, entityType, entityId } = params;
  if (!profile) return;

  try {
    await authFetch('/api/reporting/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profile.id,
        userEmail: profile.email,
        actionType,
        actionDetails,
        entityType,
        entityId,
      }),
    });
  } catch (err) {
    console.error('Activity logger error:', err);
  }
}
