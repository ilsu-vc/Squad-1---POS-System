import { supabase } from '../supabaseClient';
import { UserProfile } from '../types/auth';

interface LogActivityParams {
  profile: UserProfile | null;
  actionType: string;
  actionDetails: string;
  entityType: string;
  entityId: string | null;
}

/**
 * Log a user activity to the Supabase `activity_logs` table.
 * Silently catches errors so it never blocks the calling operation.
 */
export async function logUserActivity(params: LogActivityParams): Promise<void> {
  const { profile, actionType, actionDetails, entityType, entityId } = params;

  if (!profile) return;

  try {
    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: profile.id,
      user_email: profile.email,
      action_type: actionType,
      action_details: actionDetails,
      entity_type: entityType,
      entity_id: entityId,
    });

    if (error) {
      console.error('Failed to log activity:', error.message);
    }
  } catch (err) {
    console.error('Activity logger error:', err);
  }
}
