import { UserRole } from '../types/auth';

/**
 * Permission matrix defining which roles have access to which actions.
 */
const PERMISSION_MAP: Record<string, UserRole[]> = {
  'sales.process': ['cashier', 'supervisor', 'manager', 'admin'],
  'reports.view': ['supervisor', 'manager', 'admin'],
  'history.view': ['supervisor', 'manager', 'admin'],
  'roles.manage': ['admin'],
  'discount.approve': ['cashier', 'supervisor', 'manager', 'admin'],

  'inventory.view': ['supervisor', 'manager', 'admin'],
  'inventory.edit': ['manager', 'admin', 'supervisor'],
};

/**
 * Check whether a given role has the specified permission.
 */
export function hasPermission(role: string, permission: string): boolean {
  const allowedRoles = PERMISSION_MAP[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as UserRole);
}