import { Tabs } from 'expo-router';
import { COLORS } from '../../src/utils/constants';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.secondary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'All Orders',
          tabBarLabel: 'Orders',
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarLabel: 'Staff',
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarLabel: 'Inventory',
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarLabel: 'Payments',
        }}
      />
      <Tabs.Screen
        name="add-user"
        options={{
          title: 'Add User',
          href: null, // Hides from tab bar
          tabBarStyle: { display: 'none' }, // Hides tab bar on this screen
        }}
      />
    </Tabs>
  );
}



