/**
 * Main Tab Navigator
 *
 * SCRUM 378: Bottom tab navigator with Transaction, Customers, Shift, Reports tabs
 * SCRUM 379: Conditional "Admin" tab — hidden for cashier role, visible for manager role
 *
 * Tab icons use design token colors with active/inactive states.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TransactionStack from './TransactionStack';
import CustomersScreen from '../screens/CustomersScreen';
import ShiftScreen from '../screens/ShiftScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ManagerScreen from '../screens/ManagerScreen';
import { colors, fontSizes, spacing } from '../theme/tokens';

export type MainTabParamList = {
  Transaction: undefined;
  Customers: undefined;
  Shift: undefined;
  Reports: undefined;
  Admin: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabsProps {
  /** User role extracted from JWT claims (e.g. 'manager', 'admin', 'cashier') */
  userRole: string;
}

export default function MainTabs({ userRole }: MainTabsProps) {
  const isManager = userRole === 'manager' || userRole === 'admin' || userRole === 'superadmin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'cart';

          switch (route.name) {
            case 'Transaction':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Shift':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Reports':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Admin':
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // Active/inactive colors from design tokens
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.sm,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Transaction"
        component={TransactionStack}
        options={{ title: 'Transaction' }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{ title: 'Customers' }}
      />
      <Tab.Screen
        name="Shift"
        component={ShiftScreen}
        options={{ title: 'Shift' }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />

      {/* SCRUM 379: Admin tab — only visible for manager/admin roles */}
      {isManager && (
        <Tab.Screen
          name="Admin"
          component={ManagerScreen}
          options={{ title: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  );
}
