/**
 * Transaction Stack Navigator
 * Main → Hold List → Refund → Customer Register
 *
 * SCRUM 378: Stack navigator inside Transaction tab
 * SCRUM 381: Back navigation disabled on main transaction screen
 */
import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import POSScreen from '../screens/POSScreen';
import HoldListScreen from '../screens/HoldListScreen';
import RefundScreen from '../screens/RefundScreen';
import CustomerRegisterScreen from '../screens/CustomerRegisterScreen';
import { colors } from '../theme/tokens';

export type TransactionStackParamList = {
  POSMain: undefined;
  HoldList: undefined;
  Refund: undefined;
  CustomerRegister: undefined;
};

const Stack = createNativeStackNavigator<TransactionStackParamList>();

/**
 * Wrapper around POSScreen that disables back navigation
 * SCRUM 381: Lock back navigation on main transaction screen
 */
function POSMainWrapper() {
  const navigation = useNavigation();

  useEffect(() => {
    // Disable Android hardware back button on the main transaction screen
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Returning true prevents the default back behavior
      return true;
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    // Disable gesture-based back navigation (swipe back)
    navigation.getParent()?.setOptions({
      gestureEnabled: false,
    });

    return () => {
      navigation.getParent()?.setOptions({
        gestureEnabled: true,
      });
    };
  }, [navigation]);

  return <POSScreen />;
}

export default function TransactionStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        // Disable swipe-back gesture on all screens in this stack by default
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="POSMain"
        component={POSMainWrapper}
        options={{
          // SCRUM 381: Prevent back navigation on this screen
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="HoldList"
        component={HoldListScreen}
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen
        name="Refund"
        component={RefundScreen}
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen
        name="CustomerRegister"
        component={CustomerRegisterScreen}
        options={{ gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
