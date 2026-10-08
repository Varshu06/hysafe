import "../src/i18n";
import { loadSavedLanguage } from "../src/i18n";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FlashScreen } from "../src/components/FlashScreen";
import { WebAppShell } from "../src/components/web/WebAppShell";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { COLORS } from "../src/utils/constants";
import { CartProvider } from "../src/context/CartContext";
import { OrderProvider } from "../src/context/OrderContext";
import { ProductProvider } from "../src/context/ProductContext";

function SessionRetry() {
  const { retrySession, logout } = useAuth();
  return (
    <View style={sessionStyles.screen}>
      <Text style={sessionStyles.title}>Can't reach HySafe</Text>
      <Text style={sessionStyles.body}>
        The connection failed while checking your session. Your account was not signed out.
      </Text>
      <TouchableOpacity style={sessionStyles.primary} onPress={retrySession}>
        <Text style={sessionStyles.primaryText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sessionStyles.secondary} onPress={() => void logout()}>
        <Text style={sessionStyles.secondaryText}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

function RootStack() {
  const { isLoading, sessionError, user } = useAuth();
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
    if (isLoading || !splashAnimationComplete || sessionError) return;

    const path = pathnameRef.current || "/";
    const onAuthScreen = ["/login", "/signup", "/forgot-password", "/otp"].some(
      (authPath) => path === authPath || path.endsWith(authPath),
    );

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
    } else if (!onAuthScreen) {
      try {
        router.replace("/(auth)/login");
      } catch (error) {
        console.error("Navigation to login error:", error);
      }
    }
  }, [isLoading, splashAnimationComplete, sessionError, user, router]);

  if (isLoading || !splashAnimationComplete) {
    return <FlashScreen onComplete={onSplashComplete} />;
  }

  if (sessionError) {
    return <SessionRetry />;
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
              <WebAppShell>
                <RootStack />
              </WebAppShell>
            </ProductProvider>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const sessionStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondary: {
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  secondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
