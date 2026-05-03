/**
 * Reports Screen — Sales reports and analytics
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportingApi } from '../services/reportingApi';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface DailySummary {
  totalSales?: number; transactionCount?: number;
  averageTransaction?: number; topProduct?: string;
}

export default function ReportsScreen() {
  const [summary, setSummary] = useState<DailySummary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reportingApi.getDailySummary();
      setSummary(data || {});
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const StatCard = ({ icon, label, value, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={28} color={color} />
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
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700' },
  sectionTitle: {
    color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.lg,
  },
  statsGrid: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 180, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  statIcon: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.xs },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
});
