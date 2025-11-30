import { Stack } from 'expo-router';
import { FlashScreen } from '../src/components/FlashScreen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OrderProvider } from '../src/context/OrderContext';

function RootStack() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <FlashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <RootStack />
      </OrderProvider>
    </AuthProvider>
  );
}
