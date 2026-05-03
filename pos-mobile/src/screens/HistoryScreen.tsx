/**
 * History Screen — Transaction history with expandable details
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { transactionApi } from '../services/transactionApi';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface Transaction {
  id: string; totalAmount: number; paymentMethod: string;
  createdAt: string; status: string; itemsCount: number;
  items?: any[]; receiptNumber?: string;
}

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await transactionApi.getTransactionHistory();
      const list = Array.isArray(data) ? data : data?.transactions || data?.data || [];
      setTransactions(list);
    } catch { /* silent */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.txnCard} activeOpacity={0.8}
        onPress={() => setExpandedId(expanded ? null : item.id)}
      >
        <View style={styles.txnHeader}>
          <View style={styles.txnLeft}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <View>
              <Text style={styles.txnId}>#{item.receiptNumber || item.id.slice(0, 8)}</Text>
              <Text style={styles.txnDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.txnRight}>
            <Text style={styles.txnTotal}>₱{item.totalAmount?.toFixed(2)}</Text>
            <View style={[styles.badge, item.status === 'completed' ? styles.badgeSuccess : styles.badgeWarn]}>
              <Text style={styles.badgeText}>{item.status || 'completed'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.txnMeta}>
          <Text style={styles.metaText}>
            <Ionicons name="card-outline" size={14} color={colors.textMuted} />{' '}
            {item.paymentMethod?.toUpperCase() || 'N/A'}
          </Text>
          <Text style={styles.metaText}>
            <Ionicons name="cube-outline" size={14} color={colors.textMuted} />{' '}
            {item.itemsCount || 0} items
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
        {expanded && item.items && item.items.length > 0 && (
          <View style={styles.itemsSection}>
            {item.items.map((li: any, i: number) => (
              <View key={i} style={styles.lineItem}>
                <Text style={styles.liName}>{li.productName}</Text>
                <Text style={styles.liQty}>x{li.quantity}</Text>
                <Text style={styles.liPrice}>₱{li.totalPrice?.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={transactions} renderItem={renderItem} keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '700' },
  txnCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  txnLeft: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  txnRight: { alignItems: 'flex-end' },
  txnId: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600' },
  txnDate: { color: colors.textMuted, fontSize: fontSizes.xs },
  txnTotal: { color: colors.primary, fontSize: fontSizes.lg, fontWeight: '700' },
  badge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  badgeSuccess: { backgroundColor: 'rgba(34,197,94,0.2)' },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.2)' },
  badgeText: { fontSize: fontSizes.xs, fontWeight: '600', color: colors.success, textTransform: 'uppercase' },
  txnMeta: {
    flexDirection: 'row', gap: spacing.xl, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  metaText: { color: colors.textMuted, fontSize: fontSizes.sm },
  itemsSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  liName: { color: colors.textPrimary, fontSize: fontSizes.sm, flex: 1 },
  liQty: { color: colors.textMuted, fontSize: fontSizes.sm, marginHorizontal: spacing.md },
  liPrice: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.lg },
});
