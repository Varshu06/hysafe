import "../src/i18n";
import { loadSavedLanguage } from "../src/i18n";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlashScreen } from "../src/components/FlashScreen";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { CartProvider } from "../src/context/CartContext";
import { OrderProvider } from "../src/context/OrderContext";
import { ProductProvider } from "../src/context/ProductContext";

function RootStack() {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const pathnameRef = useRef(pathname);
  const segmentsRef = useRef(segments);
  pathnameRef.current = pathname;
  segmentsRef.current = segments;
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const onSplashComplete = useCallback(() => setSplashAnimationComplete(true), []);

  useEffect(() => {
    if (isLoading || !splashAnimationComplete) return;

    if (user) {
      const targetGroup = user.role === "customer" ? "(customer)" : user.role === "staff" ? "(staff)" : null;
      if (targetGroup && segmentsRef.current[0] === targetGroup) return;

      try {
        if (user.role === "customer") router.replace("/(customer)");
        else if (user.role === "staff") router.replace("/(staff)");
        else router.replace("/(auth)/login");
      } catch (error) {
        console.error("Navigation error:", error);
      }
    } else if (pathnameRef.current !== "/login" && !pathnameRef.current.endsWith("/login")) {
      try {
        router.replace("/(auth)/login");
      } catch (error) {
        console.error("Navigation to login error:", error);
      }
    }
  }, [isLoading, splashAnimationComplete, user, router]);

  if (isLoading || !splashAnimationComplete) {
    return <FlashScreen onComplete={onSplashComplete} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(staff)" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    loadSavedLanguage();
  }, []);
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
