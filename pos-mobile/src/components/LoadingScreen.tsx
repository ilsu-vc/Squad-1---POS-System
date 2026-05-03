/**
 * Loading Screen — shown while checking auth state
 */
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, fontSizes } from '../theme/tokens';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Loading PharmaCare POS...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
});
