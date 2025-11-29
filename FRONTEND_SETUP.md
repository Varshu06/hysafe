# Frontend Setup Guide - Hy-Safe Apps

## ✅ Setup Complete!

Both frontend apps have been set up with all dependencies installed.

## 📱 Apps Overview

1. **Customer App** (`client-user`) - For customers to place orders
2. **Staff App** (`client-staff`) - For staff to accept and manage orders

## 🚀 Starting the Apps

### Option 1: Start Customer App

```bash
cd client-user
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator  
- Scan QR code with Expo Go app on your phone

### Option 2: Start Staff App

```bash
cd client-staff
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

## 📋 Prerequisites

1. **Expo CLI** (if not installed):
   ```bash
   npm install -g expo-cli
   ```

2. **Expo Go App** (for physical device testing):
   - iOS: Download from App Store
   - Android: Download from Google Play Store

3. **Simulator/Emulator** (optional):
   - iOS: Xcode (Mac only)
   - Android: Android Studio with Android Emulator

## 🔧 Configuration

### API URLs

Both apps are configured to connect to:
- **API Base URL**: `http://localhost:5000/api` (development)
- **Socket URL**: `http://localhost:5000` (development)

**To change these URLs**, edit:
- `client-user/src/utils/constants.ts`
- `client-staff/src/utils/constants.ts`

### For Physical Device Testing

If testing on a physical device, you need to use your computer's IP address:

1. Find your computer's IP:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig | grep inet`

2. Update constants.ts in both apps:
   ```typescript
   export const API_BASE_URL = 'http://192.168.1.100:5000/api'; // Your IP
   export const SOCKET_URL = 'http://192.168.1.100:5000'; // Your IP
   ```

3. Make sure your phone and computer are on the same WiFi network

## 📂 App Structure

### Customer App (`client-user/`)
```
app/
├── (auth)/          # Login, Signup screens
└── (tabs)/          # Home, Orders, Profile tabs
src/
├── components/      # Reusable UI components
├── context/         # Auth & Order state management
├── services/        # API & Socket.io services
├── types/           # TypeScript types
└── utils/           # Constants, storage helpers
```

### Staff App (`client-staff/`)
```
app/
├── (auth)/          # Login screen
└── (tabs)/          # New Orders, Ongoing, Profile tabs
src/
├── components/      # Reusable UI components
├── context/         # Auth & Order state management
├── services/        # API & Socket.io services
├── types/           # TypeScript types
└── utils/           # Constants, storage helpers
```

## 🎨 Features Implemented

### Customer App
- ✅ Login & Signup screens
- ✅ Order placement form
- ✅ Order history
- ✅ Real-time order status updates (via Socket.io)
- ✅ Order details view
- ✅ Profile management

### Staff App
- ✅ Login screen
- ✅ Online/Offline toggle
- ✅ Real-time new order notifications
- ✅ Order acceptance/rejection
- ✅ Order status updates (Picked → Transit → Delivered)
- ✅ Ongoing orders tracking

## 🐛 Troubleshooting

### App won't start
```bash
# Clear cache and restart
expo start -c
```

### Dependencies issues
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Metro bundler errors
```bash
# Reset Metro cache
expo start --clear
```

### Can't connect to backend
- Make sure backend is running on port 5000
- Check API_BASE_URL in constants.ts
- For physical device: Use your computer's IP, not localhost
- Ensure phone and computer are on same network

### Socket.io connection issues
- Check SOCKET_URL in constants.ts
- Ensure backend Socket.io server is running
- Check firewall settings

## 📝 Next Steps

1. **Start the apps** using the commands above
2. **Test the UI** - Navigate through screens
3. **Connect to backend** (when ready) - Update API URLs if needed
4. **Test real-time features** - Order placement and status updates

## 🎯 Development Tips

- Use **Expo Go** app for fastest development cycle
- **Hot reload** is enabled by default
- Check **Expo DevTools** in browser for logs
- Use **React Native Debugger** for advanced debugging

## 📞 Need Help?

- Check `README.md` for full documentation
- Check `QUICK_START.md` for quick reference
- Review error messages in terminal/Expo DevTools

---

**Happy Coding! 🎉**




