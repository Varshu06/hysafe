# Quick Start Guide - Hy-Safe App

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator / Android Emulator / Expo Go app on phone

### Step 1: Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example and update)
cp .env.example .env

# Edit .env with your MongoDB URI and JWT secret
# MONGODB_URI=mongodb://localhost:27017/hysafe
# JWT_SECRET=your-secret-key

# Start MongoDB (if local)
mongod

# Start backend server
npm run dev
```

Backend should be running on `http://localhost:5000`

### Step 2: Staff App Setup

```bash
# Open new terminal
cd client-staff

# Install dependencies
npm install

# Update API URL if needed (src/utils/constants.ts)
# API_BASE_URL=http://localhost:5000/api
# SOCKET_URL=http://localhost:5000

# Start Expo
npm start

# Press 'i' for iOS, 'a' for Android, or scan QR code
```

### Step 3: Customer App Setup

```bash
# Open new terminal
cd client-user

# Install dependencies
npm install

# Update API URL if needed (src/utils/constants.ts)

# Start Expo
npm start

# Press 'i' for iOS, 'a' for Android, or scan QR code
```

## 🧪 Testing the Flow

### 1. Create Test Users

**Option A: Via API (using Postman/curl)**

```bash
# Register Customer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "phone": "1234567890",
    "password": "password123",
    "role": "customer",
    "name": "Test Customer",
    "address": "123 Test Street"
  }'

# Register Staff
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@test.com",
    "phone": "0987654321",
    "password": "password123",
    "role": "staff",
    "name": "Test Staff"
  }'
```

**Option B: Via Apps**
- Open customer app → Sign up
- Open staff app → Login (staff account must be created first via API)

### 2. Test Order Flow

1. **Customer App:**
   - Login with customer credentials
   - Go to Home tab
   - Fill order form (quantity, address, payment method)
   - Click "Place Order"

2. **Staff App:**
   - Login with staff credentials
   - Toggle "Go Online" button
   - New order should appear in "New Orders" tab
   - Click "ACCEPT" on the order

3. **Customer App:**
   - Go to "Orders" tab
   - See order status updated to "Accepted"

4. **Staff App:**
   - Go to "Ongoing" tab
   - See accepted order
   - Click status buttons: "Order Picked" → "In Transit" → "Mark Delivered"

5. **Customer App:**
   - Check "Orders" tab
   - Status should update in real-time: "Accepted" → "Picked Up" → "On The Way" → "Delivered"

## 📱 App Features

### Customer App
- ✅ Sign up / Login
- ✅ Place orders (quantity, address, payment method)
- ✅ View order history
- ✅ Real-time order status updates
- ✅ Order details view

### Staff App
- ✅ Login
- ✅ Online/Offline toggle
- ✅ Real-time new order notifications
- ✅ Accept/Reject orders
- ✅ Update order status (Picked → Transit → Delivered)
- ✅ View ongoing orders

## 🔧 Troubleshooting

### Backend Issues
- **MongoDB connection error**: Check MongoDB is running and URI is correct
- **Port already in use**: Change PORT in .env or kill process on port 5000
- **JWT errors**: Ensure JWT_SECRET is set in .env

### App Issues
- **Cannot connect to backend**: 
  - Check API_BASE_URL in constants.ts
  - For physical device, use your computer's IP: `http://192.168.x.x:5000/api`
  - Ensure backend CORS allows your app origin
- **Socket.io not connecting**:
  - Check SOCKET_URL matches backend URL
  - Ensure backend is running
- **Expo errors**:
  - Clear cache: `expo start -c`
  - Reinstall: `rm -rf node_modules && npm install`

### Network Issues (Physical Device)
If testing on physical device:

1. Find your computer's IP:
   - Mac/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`

2. Update constants.ts:
   ```typescript
   export const API_BASE_URL = 'http://192.168.1.100:5000/api';
   export const SOCKET_URL = 'http://192.168.1.100:5000';
   ```

3. Update backend CORS in `.env`:
   ```
   CORS_ORIGIN=*
   ```

## 📝 Next Steps

- Complete admin panel
- Add FCM push notifications
- Implement payment gateway
- Add GPS-based auto-assignment
- Add image uploads for receipts

---

**Happy Coding! 🎉**

