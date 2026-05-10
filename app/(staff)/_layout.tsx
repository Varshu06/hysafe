import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/utils/constants';

export default function StaffLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
          backgroundColor: COLORS.secondary,
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'New Orders',
          tabBarLabel: 'New Orders',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Feather name="inbox" color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="ongoing"
        options={{
          title: 'Ongoing',
          tabBarLabel: 'Ongoing',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Feather name="truck" color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size ?? 20} />,
        }}
      />
      <Tabs.Screen
        name="order-details/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}



