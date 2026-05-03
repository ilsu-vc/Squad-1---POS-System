/**
 * Refund Screen — Process transaction refunds
 */
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

export default function RefundScreen() {
  const navigation = useNavigation();
  const [receiptNumber, setReceiptNumber] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Process Refund</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchCard}>
          <Text style={styles.label}>RECEIPT NUMBER</Text>
          <View style={styles.inputRow}>
            <Ionicons name="receipt-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input} value={receiptNumber} onChangeText={setReceiptNumber}
              placeholder="Enter receipt number..." placeholderTextColor={colors.textMuted}
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8}>
            <Ionicons name="search" size={20} color={colors.white} />
            <Text style={styles.searchBtnText}>Look Up Transaction</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.empty}>
          <Ionicons name="return-down-back-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Enter a receipt number to begin refund</Text>
        </View>
      </View>
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
  content: { padding: spacing.lg },
  searchCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  label: {
    color: colors.textSecondary, fontSize: fontSizes.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, height: 48,
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  input: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.md },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.md, height: 48,
  },
  searchBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.md, marginTop: spacing.lg },
});
