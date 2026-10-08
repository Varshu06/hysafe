// For emulator/simulator, use localhost. For physical device, use your machine's IP
// To find your IP: Windows: ipconfig | findstr IPv4
// For Android emulator, you might need to use '10.0.2.2' instead of 'localhost'
// For iOS simulator, use 'localhost'
// For physical device, use your computer's IP
import Constants from "expo-constants";
import { Platform } from "react-native";

const getLocalIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  return hostUri?.split(":")[0];
};

const LOCAL_IP = getLocalIp() || "192.168.1.13";

// Resolve API base URL:
// 1. Explicit EXPO_PUBLIC_API_URL or Constants.expoConfig.extra.apiUrl (dev or prod)
// 2. In __DEV__: fallback to local machine IP (http://${LOCAL_IP}:5000/api)
// 3. In production: empty string if not supplied, with warning (no fake placeholder)
const resolveApiBaseUrl = (): string => {
  const envApiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra?.apiUrl as string | undefined);

  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.trim();
  }

  if (__DEV__) {
    // Expo Web runs in the browser, so localhost points to this computer.
    if (Platform.OS === "web") {
      return "http://localhost:5000/api";
    }

    // Native emulator/device uses the detected machine IP.
    return `http://${LOCAL_IP}:5000/api`;
  }

  console.warn(
    "[HySafe] Production API_BASE_URL is not configured! Please supply EXPO_PUBLIC_API_URL or extra.apiUrl in your environment."
  );
  return "";
};
export const API_BASE_URL = resolveApiBaseUrl();

// Resolve Socket URL:
// 1. Explicit EXPO_PUBLIC_SOCKET_URL or Constants.expoConfig.extra.socketUrl
// 2. Derived backend origin from API_BASE_URL (removes trailing /api)
// 3. In __DEV__: fallback to http://${LOCAL_IP}:5000
// 4. In production: empty string if not configured (no fake placeholder)
const resolveSocketUrl = (): string => {
  const envSocketUrl =
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    (Constants.expoConfig?.extra?.socketUrl as string | undefined);

  if (envSocketUrl && envSocketUrl.trim()) {
    return envSocketUrl.trim();
  }

  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }

  if (__DEV__) {
    if (Platform.OS === "web") {
      return "http://localhost:5000";
    }
    return `http://${LOCAL_IP}:5000`;
  }

  return "";
};

export const SOCKET_URL = resolveSocketUrl();


export const COLORS = {
  primary: "#0284C7", // Ocean Blue (Sky 600)
  primaryDark: "#0C4A6E", // Deep Ocean (Sky 900)
  primaryLight: "#38BDF8", // Light Blue (Sky 400)
  secondary: "#FFFFFF",
  accent: "#F0F9FF", // Sky 50 - Very light water background
  surface: "#E0F2FE", // Sky 100 - Card backgrounds
  text: "#0F172A", // Slate 900 - Deep dark blue-grey for text
  textLight: "#64748B", // Slate 500
  success: "#0EA5E9", // Sky 500 - Success (keeping it blue-ish green or just blue)
  warning: "#F59E0B",
  statusPending: "#F59E0B",
  statusPendingBackground: "#FEF3C7",
  statusAccepted: "#3B82F6",
  statusAcceptedBackground: "#DBEAFE",
  statusDelivered: "#22C55E",
  statusDeliveredBackground: "#DCFCE7",
  error: "#EF4444",
  border: "#BAE6FD", // Sky 200
  overlay: "#0000004D", // For modal
  grey: "#ddd",
};

export const BUSINESS_PHONE = "8778170446";
export const BUSINESS_EMAIL = "hygieneandsafe@gmail.com";
export const BUSINESS_ADDRESS =
  "SLO-44-A, Mahiladi, Thirukarankudi, Nanguneri (TK), Tirunelveli District - 627115";
export const SERVICE_LOCATION_ADDRESS = "8A, T.B Road, Valliyur - 627117";

// Factory/Pickup location coordinates (for service radius validation)
// Can be customized via EXPO_PUBLIC_FACTORY_LAT and EXPO_PUBLIC_FACTORY_LNG
export const FACTORY_LOCATION = {
  lat: Number(process.env.EXPO_PUBLIC_FACTORY_LAT || 13.0827),
  lng: Number(process.env.EXPO_PUBLIC_FACTORY_LNG || 80.2707),
};

// Service radius in kilometers (can be overridden via EXPO_PUBLIC_SERVICE_RADIUS_KM)
export const SERVICE_RADIUS_KM = Number(
  process.env.EXPO_PUBLIC_SERVICE_RADIUS_KM || 5
);

// Google Maps JavaScript API key for the interactive address map in the WebView.
// This is bundled in the mobile app; restrict it to Maps JavaScript API and the
// app's allowed origins/restrictions in Google Cloud. Never put a server key here.
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

// Public Google OAuth client IDs. These identify the app; they are not secrets.
// Android native sign-in uses the Web client as the ID token audience.
// It does not send a custom-scheme redirect_uri.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "";
export const GOOGLE_WEB_REDIRECT_URI = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim() || "";
