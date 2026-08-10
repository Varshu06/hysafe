import "../src/i18n";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlashScreen } from "../src/components/FlashScreen";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { CartProvider } from "../src/context/CartContext";
import { OrderProvider } from "../src/context/OrderContext";
import { ProductProvider } from "../src/context/ProductContext";

function RootStack() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <FlashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            <ProductProvider>
              <RootStack />
            </ProductProvider>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
