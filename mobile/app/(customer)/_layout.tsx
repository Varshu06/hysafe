import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/ui/CustomTabBar';
import { COLORS } from '../../src/utils/constants';

export default function CustomerLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#94A3B8',
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
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Products',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/payment-methods"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/privacy-security"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/change-password"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/app-lock"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/login-activity"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/privacy-policy"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile/delete-account"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="order-details/[id]"
        options={{
          href: null, // Hide from tab bar
          title: 'Order Details',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="address/search"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="address/add"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="checkout/index"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="checkout/payment-methods"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="recurring-delivery/setup"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </Tabs>
  );
}



