import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderProvider } from '../src/context/OrderContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </OrderProvider>
    </AuthProvider>
  );
}

