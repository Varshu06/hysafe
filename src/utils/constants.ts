// For emulator/simulator, use localhost. For physical device, use your machine's IP
// To find your IP: Windows: ipconfig | findstr IPv4
// For Android emulator, you might need to use '10.0.2.2' instead of 'localhost'
// For iOS simulator, use 'localhost'
// For physical device, use your computer's IP
const LOCAL_IP = '10.124.22.95'; // Your machine's IP address

export const API_BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:5000/api`
  : 'https://your-production-api.com/api';

export const SOCKET_URL = __DEV__
  ? `http://${LOCAL_IP}:5000`
  : 'https://your-production-api.com';

export const COLORS = {
  primary: '#0284C7', // Ocean Blue (Sky 600)
  primaryDark: '#0C4A6E', // Deep Ocean (Sky 900)
  primaryLight: '#38BDF8', // Light Blue (Sky 400)
  secondary: '#FFFFFF',
  accent: '#F0F9FF', // Sky 50 - Very light water background
  surface: '#E0F2FE', // Sky 100 - Card backgrounds
  text: '#0F172A', // Slate 900 - Deep dark blue-grey for text
  textLight: '#64748B', // Slate 500
  success: '#0EA5E9', // Sky 500 - Success (keeping it blue-ish green or just blue)
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#BAE6FD', // Sky 200
};

// Factory/Pickup location coordinates (for 5km radius validation)
// TODO: Update with actual factory location coordinates
export const FACTORY_LOCATION = {
  lat: 13.0827, // Example: Chennai coordinates
  lng: 80.2707,
};

// Service radius in kilometers
export const SERVICE_RADIUS_KM = 5;

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
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
