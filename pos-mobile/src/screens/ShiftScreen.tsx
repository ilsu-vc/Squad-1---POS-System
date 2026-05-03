/**
 * Shift Screen — Shift dashboard for cashiers
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

export default function ShiftScreen() {
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email || '');
    });
  }, []);

  const toggleShift = () => {
    if (shiftActive) {
      setShiftActive(false);
      setShiftStart(null);
    } else {
      setShiftActive(true);
      setShiftStart(new Date().toLocaleTimeString());
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Shift Dashboard</Text>
        <Text style={styles.subtitle}>{userEmail}</Text>
      </View>

      {/* Shift Status Card */}
      <View style={[styles.statusCard, shiftActive && styles.statusActive]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, shiftActive && styles.dotActive]} />
          <Text style={styles.statusLabel}>
            {shiftActive ? 'Shift Active' : 'No Active Shift'}
          </Text>
        </View>
        {shiftActive && shiftStart && (
          <Text style={styles.shiftTime}>Started at {shiftStart}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity
            style={[styles.shiftButton, shiftActive && styles.shiftEndButton, { flex: 1 }]}
            onPress={toggleShift} activeOpacity={0.8}
          >
            <Ionicons
              name={shiftActive ? 'stop-circle-outline' : 'play-circle-outline'}
              size={22} color={colors.white}
            />
            <Text style={styles.shiftButtonText}>
              {shiftActive ? 'End Shift' : 'Start Shift'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shiftButton, { backgroundColor: colors.surfaceHover, paddingHorizontal: spacing.xl }]}
            onPress={() => supabase.auth.signOut()}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Shift Stats */}
      <Text style={styles.sectionTitle}>Current Shift Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="receipt-outline" size={28} color={colors.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={28} color={colors.success} />
          <Text style={styles.statValue}>₱0.00</Text>
          <Text style={styles.statLabel}>Total Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="card-outline" size={28} color={colors.info} />
          <Text style={styles.statValue}>₱0.00</Text>
          <Text style={styles.statLabel}>Cash in Drawer</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginBottom: spacing.xxl },
  title: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.xs },
  statusCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xxl, ...shadows.card,
  },
  statusActive: { borderColor: colors.success },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  statusDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textMuted,
  },
  dotActive: { backgroundColor: colors.success },
  statusLabel: { color: colors.textPrimary, fontSize: fontSizes.lg, fontWeight: '600' },
  shiftTime: { color: colors.textMuted, fontSize: fontSizes.sm, marginBottom: spacing.lg },
  shiftButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, borderRadius: borderRadius.md, height: 48, ...shadows.card,
  },
  shiftEndButton: { backgroundColor: colors.error },
  shiftButtonText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '600' },
  sectionTitle: {
    color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg,
  },
  statsGrid: { flexDirection: 'row', gap: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  statValue: {
    color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '700', marginTop: spacing.md,
  },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.xs },
});
