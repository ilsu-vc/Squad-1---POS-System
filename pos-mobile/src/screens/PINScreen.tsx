/**
 * PIN Login Screen — Numeric keypad authentication
 * Mirrors the web app's PINLoginForm.tsx
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { reportingApi } from '../services/reportingApi';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';
import type { AuthStackParamList } from '../navigation/AuthStack';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'PIN'>;

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export default function PINScreen() {
  const navigation = useNavigation<NavProp>();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState('');

  // Load lockout state
  useEffect(() => {
    const loadLockoutState = async () => {
      const storedEnd = await SecureStore.getItemAsync('pin_lockout_end');
      const storedAttempts = await SecureStore.getItemAsync('pin_failed_attempts');

      if (storedEnd) {
        const lockoutEnd = parseInt(storedEnd, 10);
        if (Date.now() < lockoutEnd) {
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
        } else {
          await SecureStore.deleteItemAsync('pin_lockout_end');
          await SecureStore.deleteItemAsync('pin_failed_attempts');
        }
      }
      if (storedAttempts) {
        setFailedAttempts(parseInt(storedAttempts, 10));
      }
    };
    loadLockoutState();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;
    const interval = setInterval(() => {
      const remaining = lockoutEndTime - Date.now();
      if (remaining <= 0) {
        setIsLocked(false);
        setLockoutEndTime(null);
        setFailedAttempts(0);
        setRemainingTime('');
        SecureStore.deleteItemAsync('pin_lockout_end');
        SecureStore.deleteItemAsync('pin_failed_attempts');
      } else {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        setRemainingTime(`${min}:${sec.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime]);

  const handleNumberPress = (num: string) => {
    if (isLocked || loading) return;
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    if (isLocked || loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (isLocked || loading) return;
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (isLocked) {
      setError(`Account locked. Try again in ${remainingTime}`);
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: `cashier${pin}@pos.local`,
        password: pin,
      });

      if (authError) {
        Vibration.vibrate(200);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        await SecureStore.setItemAsync('pin_failed_attempts', newAttempts.toString());

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
          await SecureStore.setItemAsync('pin_lockout_end', lockoutEnd.toString());
          setError('Too many failed attempts. Account locked for 15 minutes.');
        } else {
          setError(`Invalid PIN. ${MAX_FAILED_ATTEMPTS - newAttempts} attempts remaining.`);
        }
        setPin('');
        setLoading(false);
        return;
      }

      // Success
      setFailedAttempts(0);
      await SecureStore.deleteItemAsync('pin_failed_attempts');
      await SecureStore.deleteItemAsync('pin_lockout_end');

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await reportingApi.logActivity({
            userId: sessionData.session.user.id,
            userEmail: sessionData.session.user.email || '',
            actionType: 'LOGIN',
            actionDetails: 'User signed in via PIN on mobile app',
            entityType: 'user',
            entityId: sessionData.session.user.id,
          });
        }
      } catch {
        // Don't block login
      }
    } catch {
      setError('Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const renderKey = (value: string, isAction = false) => (
    <TouchableOpacity
      key={value}
      style={[styles.key, isAction && styles.keyAction]}
      onPress={() => {
        if (value === '⌫') handleBackspace();
        else if (value === 'C') handleClear();
        else handleNumberPress(value);
      }}
      disabled={loading || isLocked}
      activeOpacity={0.6}
    >
      {value === '⌫' ? (
        <Ionicons name="backspace-outline" size={28} color={colors.textPrimary} />
      ) : (
        <Text style={[styles.keyText, isAction && styles.keyActionText]}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Left branding */}
      <View style={styles.brandPanel}>
        <View style={styles.brandContent}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart-half" size={48} color={colors.white} />
          </View>
          <Text style={styles.brandTitle}>PharmaCare</Text>
          <Text style={styles.brandSubtitle}>Quick PIN Access</Text>
        </View>
      </View>

      {/* Right PIN pad */}
      <View style={styles.pinPanel}>
        <View style={styles.pinCard}>
          <Text style={styles.title}>Enter PIN</Text>

          {/* PIN dots */}
          <View style={styles.dotRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  isLocked && styles.dotLocked,
                ]}
              >
                {i < pin.length && (
                  <Ionicons name="lock-closed" size={14} color={colors.white} />
                )}
              </View>
            ))}
          </View>

          {/* Error / Lockout */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLocked && (
            <View style={styles.lockoutBox}>
              <Ionicons name="lock-closed" size={20} color={colors.warning} />
              <View>
                <Text style={styles.lockoutTitle}>Account Locked</Text>
                <Text style={styles.lockoutTime}>Time remaining: {remainingTime}</Text>
              </View>
            </View>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keyRow}>
              {renderKey('1')}
              {renderKey('2')}
              {renderKey('3')}
            </View>
            <View style={styles.keyRow}>
              {renderKey('4')}
              {renderKey('5')}
              {renderKey('6')}
            </View>
            <View style={styles.keyRow}>
              {renderKey('7')}
              {renderKey('8')}
              {renderKey('9')}
            </View>
            <View style={styles.keyRow}>
              {renderKey('C', true)}
              {renderKey('0')}
              {renderKey('⌫', true)}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, (loading || pin.length < 4 || isLocked) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading || pin.length < 4 || isLocked}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="log-in-outline" size={22} color={colors.white} />
            )}
            <Text style={styles.submitText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          {/* Back to email login */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backLinkText}>Back to email login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  brandPanel: {
    flex: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  brandContent: { alignItems: 'center' },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.elevated,
  },
  brandTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  brandSubtitle: {
    fontSize: fontSizes.lg,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  pinPanel: {
    flex: 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCard: {
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
  },
  dotRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  dotLocked: {
    borderColor: colors.error,
    opacity: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    flex: 1,
  },
  lockoutBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    width: '100%',
  },
  lockoutTitle: {
    color: colors.warning,
    fontWeight: '600',
    fontSize: fontSizes.md,
  },
  lockoutTime: {
    color: colors.warningLight,
    fontSize: fontSizes.sm,
  },
  keypad: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  keyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  key: {
    width: 80,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyAction: {
    backgroundColor: colors.surfaceHover,
  },
  keyText: {
    fontSize: fontSizes.xxl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  keyActionText: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    gap: spacing.sm,
    width: '100%',
    ...shadows.card,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
});
