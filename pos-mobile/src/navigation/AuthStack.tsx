/**
 * Auth Stack Navigator
 * Login → PIN authentication flow
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import PINScreen from '../screens/PINScreen';
import { colors } from '../theme/tokens';

export type AuthStackParamList = {
  Login: undefined;
  PIN: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PIN" component={PINScreen} />
    </Stack.Navigator>
  );
}
