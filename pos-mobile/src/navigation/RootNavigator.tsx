/**
 * Root Navigator
 *
 * SCRUM 379: Extracts user role from JWT claims for role-based tab visibility
 * SCRUM 380: Auth stack (Login → PIN) is separate from the main app navigator
 *
 * Checks Supabase auth state and renders Auth or Main flow.
 */
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import LoadingScreen from '../components/LoadingScreen';
import { colors } from '../theme/tokens';

import { apiFetch } from '../services/apiClient';

/**
 * Extract user role from Supabase JWT claims or our roles microservice.
 * Falls back to 'cashier' if no role is found.
 */
async function getUserRole(session: Session | null): Promise<string> {
  if (!session?.user) return 'cashier';

  // 1. Check user app_metadata (set by Supabase admin)
  const appRole = session.user.app_metadata?.role;
  if (appRole) return appRole;

  // 2. Check user_metadata (set during sign-up or profile update)
  const userRole = session.user.user_metadata?.role;
  if (userRole) return userRole;

  // 3. Fetch from our backend roles microservice via API Gateway
  try {
    const data = await apiFetch(`/api/roles/users/${session.user.id}`);
    if (data?.user?.role) return data.user.role;
  } catch (err) {
    console.log('[RootNavigator] Failed to fetch role from API:', err);
  }

  return 'cashier';
}

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('cashier');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const role = await getUserRole(session);
        console.log('[RootNavigator] Detected User Role on Load:', role);
        setUserRole(role);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const role = await getUserRole(session);
        console.log('[RootNavigator] Detected User Role on Auth Change:', role);
        setUserRole(role);
      } else {
        setUserRole('cashier');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.error,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {/* SCRUM 380: Auth stack is completely separate from the main app */}
      {session ? <MainTabs userRole={userRole} /> : <AuthStack />}
    </NavigationContainer>
  );
}
