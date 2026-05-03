/**
 * Manager Screen — Dashboard with sales summary and logout
 */
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { reportingApi } from '../services/reportingApi';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface DailySummary {
  totalSales?: number; transactionCount?: number;
  averageTransaction?: number; topProduct?: string;
}

export default function ManagerScreen() {
  const [summary, setSummary] = useState<DailySummary>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      setUserEmail(sess.session?.user?.email || '');
      const data = await reportingApi.getDailySummary();
      setSummary(data || {});
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            const { data: sess } = await supabase.auth.getSession();
            if (sess.session?.user) {
              await reportingApi.logActivity({
                userId: sess.session.user.id, userEmail: sess.session.user.email || '',
                actionType: 'LOGOUT', actionDetails: 'User signed out from mobile app',
                entityType: 'user', entityId: sess.session.user.id,
              });
            }
          } catch { /* silent */ }
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{userEmail}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Today's Summary</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="cash-outline" label="Total Sales"
          value={`₱${(summary.totalSales || 0).toFixed(2)}`} color={colors.success} />
        <StatCard icon="receipt-outline" label="Transactions"
          value={`${summary.transactionCount || 0}`} color={colors.primary} />
        <StatCard icon="trending-up-outline" label="Avg Transaction"
          value={`₱${(summary.averageTransaction || 0).toFixed(2)}`} color={colors.warning} />
        <StatCard icon="star-outline" label="Top Product"
          value={summary.topProduct || 'N/A'} color={colors.info} />
      </View>

      {/* App info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>PharmaCare POS Mobile</Text>
        <Text style={styles.infoText}>Version 1.0.0 • Squad-1 POS System</Text>
        <Text style={styles.infoText}>Landscape tablet mode • Local network</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl,
  },
  title: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  refreshBtn: { padding: spacing.sm },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: fontSizes.sm },
  sectionTitle: {
    color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg,
  },
  statsGrid: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xxxl, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 180, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  statIcon: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  statValue: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.xs },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  infoTitle: { color: colors.textPrimary, fontSize: fontSizes.lg, fontWeight: '600', marginBottom: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: fontSizes.sm },
});
