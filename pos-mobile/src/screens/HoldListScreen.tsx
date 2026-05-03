/**
 * Hold List Screen — View and resume held transactions
 */
import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface HeldTransaction {
  id: string; itemCount: number; total: number; heldAt: string;
}

export default function HoldListScreen() {
  const navigation = useNavigation();
  const [heldTransactions] = useState<HeldTransaction[]>([]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Held Transactions</Text>
      </View>

      <FlatList
        data={heldTransactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <Ionicons name="pause-circle-outline" size={24} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.itemCount} items — ₱{item.total.toFixed(2)}</Text>
              <Text style={styles.cardDetail}>Held at {item.heldAt}</Text>
            </View>
            <Ionicons name="play-circle-outline" size={28} color={colors.success} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pause-circle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No held transactions</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.sm },
  title: { color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.lg, ...shadows.card,
  },
  cardTitle: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600' },
  cardDetail: { color: colors.textMuted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.lg },
});
