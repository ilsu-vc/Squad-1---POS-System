/**
 * Barcode Scanner Component
 *
 * SCRUM 394: Barcode/SKU scanner integration.
 *
 * Provides a manual SKU entry screen for Expo Go environments.
 * When built as a standalone APK with expo-camera native module,
 * camera scanning can be added.
 *
 * NOTE: Uses absolute-positioned overlay instead of Modal to avoid
 * the iOS Modal rendering crash in Expo Go.
 *
 * Supports: QR, Code128, EAN-13, EAN-8, UPC-A, UPC-E, Code39
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (sku: string) => void;
}

export default function BarcodeScanner({ visible, onClose, onScanned }: BarcodeScannerProps) {
  const [lastScanned, setLastScanned] = useState('');
  const [manualSku, setManualSku] = useState('');

  useEffect(() => {
    if (visible) {
      setLastScanned('');
      setManualSku('');
    }
  }, [visible]);

  const handleManualSubmit = () => {
    const sku = manualSku.trim();
    if (sku.length < 1) return;
    setLastScanned(sku);
    onScanned(sku);
    setManualSku('');
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.scannerHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
              <Text style={styles.scannerTitle}>Scan Barcode / Enter SKU</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Input section - at the top so it's always visible */}
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              <TextInput
                style={styles.skuInput}
                value={manualSku}
                onChangeText={setManualSku}
                placeholder="Enter product ID or barcode..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                onSubmitEditing={handleManualSubmit}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.submitBtn, !manualSku.trim() && { opacity: 0.4 }]}
                onPress={handleManualSubmit}
                disabled={!manualSku.trim()}
              >
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputHint}>
              Enter a product ID (e.g. 1, 2, 3) and press Search to add it to the cart
            </Text>
          </View>

          {/* Last scanned result */}
          {lastScanned ? (
            <View style={styles.resultBar}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.resultText}>Added: {lastScanned}</Text>
              <TouchableOpacity onPress={() => setLastScanned('')}>
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Supported formats */}
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Supported formats:</Text>
            <View style={styles.badgeRow}>
              <View style={styles.formatBadge}><Text style={styles.formatText}>QR</Text></View>
              <View style={styles.formatBadge}><Text style={styles.formatText}>Code128</Text></View>
              <View style={styles.formatBadge}><Text style={styles.formatText}>EAN-13</Text></View>
              <View style={styles.formatBadge}><Text style={styles.formatText}>UPC-A</Text></View>
            </View>
            <Text style={styles.footerNote}>
              Camera scanning available in production builds
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay, zIndex: 999,
    justifyContent: 'center', alignItems: 'center',
  },
  keyboardAvoid: {
    width: '100%', justifyContent: 'center', alignItems: 'center',
  },
  scannerContainer: {
    width: 480, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.elevated,
  },
  scannerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scannerTitle: { color: colors.textPrimary, fontSize: fontSizes.lg, fontWeight: '700' },
  closeBtn: { padding: spacing.sm },
  // Input section
  inputSection: { padding: spacing.xl },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  skuInput: {
    flex: 1, height: 52, color: colors.textPrimary,
    fontSize: fontSizes.lg, fontWeight: '500',
  },
  submitBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  inputHint: {
    color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.sm,
    textAlign: 'center',
  },
  // Result bar
  resultBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, marginHorizontal: spacing.xl,
    borderRadius: borderRadius.sm, backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  resultText: { flex: 1, color: colors.success, fontSize: fontSizes.md, fontWeight: '600' },
  // Footer
  footer: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  footerLabel: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  formatBadge: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  formatText: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: '600' },
  footerNote: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic' },
});
