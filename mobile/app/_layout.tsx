import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderProvider } from '../src/context/OrderContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(staff)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </OrderProvider>
    </AuthProvider>
  );
}




