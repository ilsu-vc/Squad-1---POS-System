/**
 * Customers Screen — Customer lookup and management
 */
import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface Customer {
  id: string; name: string; email: string; phone: string; totalPurchases: number;
}

const PLACEHOLDER_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Walk-in Customer', email: 'N/A', phone: 'N/A', totalPurchases: 0 },
];

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [customers] = useState<Customer[]>(PLACEHOLDER_CUSTOMERS);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search customers..." placeholderTextColor={colors.textMuted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.email} • {item.phone}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.totalPurchases} orders</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, height: 44,
    gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.lg, ...shadows.card,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(79,140,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  name: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  badge: {
    backgroundColor: 'rgba(79,140,255,0.15)', borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.primary, fontSize: fontSizes.xs, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.lg },
});
