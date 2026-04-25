import { UserProfile } from '../types/auth';
import { hasPermission } from './permissions';

interface PermissionResult {
  allowed: boolean;
  message?: string;
}

/**
 * Check if a user profile has the required permission.
 * Returns { allowed, message } for use in handler functions.
 */
export function requirePermission(
  profile: UserProfile | null,
  permission: string,
  deniedMessage: string = 'You do not have permission to perform this action.'
): PermissionResult {
  if (!profile) {
    return { allowed: false, message: 'No user profile found.' };
  }

  if (!hasPermission(profile.role, permission)) {
    return { allowed: false, message: deniedMessage };
  }

  return { allowed: true };
}
