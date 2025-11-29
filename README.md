# Hy-Safe Water Delivery App

A comprehensive water delivery management system with real-time order acceptance flow (similar to Rapido/Uber) for staff members.

## 📋 Project Overview

Hy-Safe is a water delivery app with three user roles:
- **Customer**: Place orders, track deliveries, view history
- **Staff**: Accept/reject orders in real-time, update delivery status
- **Admin**: Manage orders, staff, inventory, and payments

## 🏗️ Architecture

```
Hysafe/
├── backend/          # Node.js + Express + MongoDB + Socket.io
├── client-user/     # Customer-facing React Native app
├── client-staff/    # Staff-facing React Native app (with order acceptance)
└── client-admin/    # Admin panel (mobile + web - to be implemented)
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Notifications**: Firebase Cloud Messaging (FCM)
- **File Upload**: Cloudinary

### Frontend (Both Apps)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Styling**: NativeWind (Tailwind CSS)
- **State Management**: Context API
- **Real-time**: Socket.io Client
- **Storage**: AsyncStorage

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator / Physical device

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/hysafe
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000,http://localhost:8081
   
   # Firebase (optional for now)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   
   # Cloudinary (optional for now)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

5. **Run the backend**:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

### Staff App Setup

1. **Navigate to staff app directory**:
   ```bash
   cd client-staff
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update API URL** (if needed):
   - Edit `src/utils/constants.ts`
   - Change `API_BASE_URL` and `SOCKET_URL` to match your backend

4. **Start the app**:
   ```bash
   npm start
   ```

5. **Run on device/simulator**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

### Customer App Setup

1. **Navigate to customer app directory**:
   ```bash
   cd client-user
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update API URL** (if needed):
   - Edit `src/utils/constants.ts`

4. **Start the app**:
   ```bash
   npm start
   ```

## 📱 Features

### Staff App Features
- ✅ **Login**: Phone/Email + Password
- ✅ **Online/Offline Toggle**: Staff can go online to receive orders
- ✅ **Real-time Order Notifications**: New orders appear instantly via Socket.io
- ✅ **Order Acceptance**: Accept or reject orders with one tap
- ✅ **Ongoing Orders**: Track accepted orders
- ✅ **Status Updates**: Update order status (Picked → In Transit → Delivered)
- ✅ **GPS Integration**: Location tracking for auto-assignment (ready for implementation)

### Customer App Features
- ✅ Authentication (Login, Signup)
- ✅ Order placement with quantity, address, payment method
- ✅ Order history and tracking
- ✅ Real-time status updates via Socket.io
- ✅ Order details view
- ✅ Profile management

### Backend Features
- ✅ User authentication (JWT)
- ✅ Role-based access control (Admin, Staff, Customer)
- ✅ Order CRUD operations
- ✅ Staff order acceptance flow (real-time)
- ✅ Real-time Socket.io events
- ✅ MongoDB models and schemas
- ✅ FCM push notifications (service ready, requires Firebase setup)
- ✅ Cloudinary file uploads (structure ready)
- ✅ Customer profile management
- ✅ Admin dashboard and management APIs
- ✅ Payment tracking and management
- ✅ Inventory management APIs

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Orders
- `POST /api/orders` - Create order (customer)
- `GET /api/orders` - Get orders (role-based)
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Customers
- `GET /api/customers/profile` - Get customer profile
- `PUT /api/customers/profile` - Update customer profile
- `GET /api/customers/orders` - Get customer orders
- `GET /api/customers/orders/:id` - Get order details

### Staff
- `POST /api/staff/login` - Staff login
- `PUT /api/staff/status` - Toggle online/offline
- `GET /api/staff/available-orders` - Get pending orders
- `POST /api/staff/accept-order/:id` - Accept order
- `POST /api/staff/reject-order/:id` - Reject order
- `GET /api/staff/ongoing-orders` - Get ongoing orders
- `PUT /api/staff/update-status/:id` - Update order status

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/orders` - Get all orders (with filters)
- `POST /api/admin/orders/:id/assign` - Manually assign order to staff
- `GET /api/admin/staff` - Get all staff
- `POST /api/admin/staff` - Create staff account
- `GET /api/admin/inventory` - Get inventory
- `POST /api/admin/inventory` - Update inventory
- `GET /api/admin/payments` - Get payment summary
- `GET /api/admin/customers` - Get all customers

### Payments
- `POST /api/payments` - Create payment record
- `GET /api/payments` - Get payments (role-based)
- `PUT /api/payments/:id` - Update payment status
- `POST /api/payments/verify` - Verify online payment (stub)

## 🔔 Socket.io Events

### Server → Staff
- `new-order` - New order available
- `order-accepted` - Order accepted by another staff
- `order-rejected` - Order rejected

### Server → Customer
- `order-status-updated` - Order status changed

### Staff → Server
- `staff-online` - Staff goes online
- `staff-offline` - Staff goes offline
- `accept-order` - Accept order
- `reject-order` - Reject order

## 📁 Project Structure

### Backend
```
backend/
├── src/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── services/        # Business logic
│   ├── utils/           # Utilities (JWT, bcrypt)
│   ├── config/          # Database, Socket.io, env
│   └── types/           # TypeScript types
└── server.ts            # Entry point
```

### Staff App
```
client-staff/
├── app/
│   ├── (auth)/          # Login screen
│   └── (tabs)/          # Tab navigation
│       ├── index.tsx    # New Orders
│       ├── ongoing.tsx   # Ongoing Orders
│       └── profile.tsx   # Profile
├── src/
│   ├── components/      # UI components
│   ├── context/         # Auth & Order contexts
│   ├── services/        # API & Socket services
│   ├── types/           # TypeScript types
│   └── utils/           # Constants, storage
```

### Customer App
```
client-user/
├── app/
│   ├── (auth)/          # Login, Signup
│   └── (tabs)/          # Tab navigation
├── src/
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   └── utils/           # Constants, storage
```

## 🗄️ Database Models

- **User**: Authentication and roles
- **Staff**: Staff-specific data (online status, location, FCM token)
- **CustomerProfile**: Customer details (address, payment terms)
- **Order**: Order information (status, addresses, assigned staff)
- **Payment**: Payment records
- **Inventory**: Stock management

## 🔐 Authentication Flow

1. User registers/logs in
2. Backend generates JWT token
3. Token stored in AsyncStorage
4. Token sent in Authorization header for API calls
5. Middleware validates token on protected routes

## 🔄 Real-time Order Flow

1. **Customer places order** → Backend creates order with status `pending`
2. **Backend emits `new-order`** → All online staff receive notification
3. **Staff accepts order** → Order status → `accepted`, assigned to staff
4. **Backend emits `order-accepted`** → Other staff see order removed
5. **Staff updates status** → `picked` → `transit` → `delivered`
6. **Customer receives updates** → Via Socket.io `order-status-updated`

## 🧪 Testing

### Test Staff Flow
1. Start backend server
2. Register a staff user via API or create manually in MongoDB
3. Open staff app and login
4. Toggle "Go Online"
5. Create an order via customer app or API
6. See order appear in staff app
7. Accept order
8. Update status through delivery

## 🚧 Next Steps / TODO

- [ ] Complete customer app screens (order placement, tracking, history)
- [ ] Implement FCM push notifications
- [ ] Add Cloudinary image upload for receipts
- [ ] Implement GPS-based auto-assignment algorithm
- [ ] Add admin panel (mobile + web)
- [ ] Add payment gateway integration (Razorpay/Cashfree)
- [ ] Add unit and integration tests
- [ ] Add error boundaries and better error handling
- [ ] Add loading states and skeletons
- [ ] Optimize Socket.io reconnection logic
- [ ] Add order cancellation flow
- [ ] Add customer rating/review system

## 📝 Environment Variables

See `.env.example` in backend directory for all required environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`
- For MongoDB Atlas, ensure IP is whitelisted

### Socket.io Connection Issues
- Check `SOCKET_URL` in app constants
- Ensure backend CORS allows your app origin
- Check firewall/network settings

### Expo Issues
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Expo Go app version matches Expo SDK version

## 📞 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for efficient water delivery management**

