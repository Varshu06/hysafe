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
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'New Orders',
          tabBarLabel: 'New Orders',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ongoing"
        options={{
          title: 'Ongoing',
          tabBarLabel: 'Ongoing',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerShown: false,
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



