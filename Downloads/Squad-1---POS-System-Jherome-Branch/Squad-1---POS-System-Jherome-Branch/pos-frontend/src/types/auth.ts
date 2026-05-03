export type UserRole = 'cashier' | 'supervisor' | 'manager' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  role_id?: number | null;
  is_active: boolean;
}
