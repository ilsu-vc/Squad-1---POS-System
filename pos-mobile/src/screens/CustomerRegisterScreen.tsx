/**
 * Customer Register Screen — Register new customer from transaction flow
 */
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

export default function CustomerRegisterScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleRegister = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Customer name is required');
      return;
    }
    Alert.alert('Success', `Customer "${name}" registered successfully.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const InputField = ({ label, icon, value, onChangeText, placeholder, keyboard }: any) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input} value={value} onChangeText={onChangeText}
          placeholder={placeholder} placeholderTextColor={colors.textMuted}
          keyboardType={keyboard || 'default'}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Register Customer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <InputField label="FULL NAME" icon="person-outline" value={name}
            onChangeText={setName} placeholder="Enter customer name" />
          <InputField label="EMAIL" icon="mail-outline" value={email}
            onChangeText={setEmail} placeholder="Enter email (optional)" keyboard="email-address" />
          <InputField label="PHONE" icon="call-outline" value={phone}
            onChangeText={setPhone} placeholder="Enter phone (optional)" keyboard="phone-pad" />

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={20} color={colors.white} />
            <Text style={styles.registerBtnText}>Register Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  formCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl,
    borderWidth: 1, borderColor: colors.border, maxWidth: 500, ...shadows.card,
  },
  fieldGroup: { marginBottom: spacing.xl },
  label: {
    color: colors.textSecondary, fontSize: fontSizes.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm, paddingHorizontal: spacing.lg, height: 48,
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.md },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.md, height: 52, marginTop: spacing.md,
  },
  registerBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '600' },
});
