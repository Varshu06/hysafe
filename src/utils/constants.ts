// For emulator/simulator, use localhost. For physical device, use your machine's IP
// To find your IP: Windows: ipconfig | findstr IPv4
// For Android emulator, you might need to use '10.0.2.2' instead of 'localhost'
// For iOS simulator, use 'localhost'
// For physical device, use your computer's IP
import Constants from "expo-constants";

const getLocalIp = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  return hostUri?.split(":")[0];
};

const LOCAL_IP = getLocalIp() || "10.124.20.116";

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
  error: "#EF4444",
  border: "#BAE6FD", // Sky 200
  overlay: "#0000004D", // For modal
  grey: "#ddd",
};

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

// Google Maps API Key
//
// To get your Google Maps API Key:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select an existing one
// 3. Enable the following APIs:
//    - Maps JavaScript API
//    - Geocoding API (optional, for address search)
//    - Places API (optional, for place search)
// 4. Go to "Credentials" and create a new API Key
// 5. (Recommended) Restrict the API key to only the APIs you need
// 6. Copy the API key and paste it below
//
// IMPORTANT: For production, use environment variables instead of hardcoding the key!
// In Expo, you can use: Constants.expoConfig?.extra?.googleMapsApiKey
//
export const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE";

// Google OAuth Client IDs
//
// To get your Google OAuth Client IDs:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select an existing one
// 3. Enable "Google Identity Services API" or "Google+ API"
// 4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
//
// For Web Application (development/Expo Go):
// 5. Select "Web application" as the application type
// 6. Add these Authorized redirect URIs:
//    - http://localhost:8081
//    (Check the console log when testing to see the exact redirect URI)
// 7. Click "Create" and copy the Client ID
//
// For Android Application:
// 5. Select "Android" as the application type
// 6. Enter Package name: com.hysafe.mobile
// 7. Enter SHA-1 certificate fingerprint (get from keytool or EAS)
// 8. Click "Create" and copy the Client ID
//
// IMPORTANT:
// - For production, use environment variables instead of hardcoding!
// - Make sure to PUBLISH your app in OAuth consent screen (not just Testing mode)
//
export const GOOGLE_CLIENT_ID_WEB =
  "983159745644-ch9jhanqpjbucuq4nlo87erlnkckangi.apps.googleusercontent.com";
export const GOOGLE_CLIENT_ID_ANDROID =
  "983159745644-0ue4ckrh12h0r506v3f3lalk0ciqcap9.apps.googleusercontent.com";
