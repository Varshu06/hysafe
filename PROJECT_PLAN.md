# Hy-Safe Water Delivery App - Project Plan (Updated)

## 📋 Overview
A water delivery management app with 3 user roles (Admin, Staff, Customer) built with React Native (Expo) + TypeScript frontend and Node.js + Express + MongoDB backend. Includes real-time order acceptance flow for staff (similar to Rapido/Uber).

---

## 🗂️ Updated Project Structure

```
Hysafe/
├── client-user/                      # Customer-facing React Native App
│   ├── app/                          # Expo Router screens
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (tabs)/                   # Customer tab navigator
│   │   │   ├── index.tsx            # Home/Dashboard
│   │   │   ├── orders.tsx           # Order history
│   │   │   ├── profile.tsx           # Customer profile
│   │   │   └── order-details/[id].tsx
│   │   └── _layout.tsx
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── OrderStatusBadge.tsx
│   │   │   └── forms/
│   │   │       └── OrderForm.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── OrderContext.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── order.service.ts
│   │   │   └── socket.service.ts     # Socket.io client
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── order.types.ts
│   │   │   └── common.types.ts
│   │   └── utils/
│   │       ├── constants.ts
│   │       └── storage.ts
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── client-staff/                     # Staff-facing React Native App
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            # Home: New Orders + Online Toggle
│   │   │   ├── ongoing.tsx           # Ongoing Orders
│   │   │   └── profile.tsx
│   │   └── _layout.tsx
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── OrderCard.tsx    # Order card with Accept/Reject
│   │   │   └── modals/
│   │   │       └── OrderDetailModal.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── OrderContext.tsx
│   │   │   └── SocketContext.tsx    # Socket.io real-time updates
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── staff.service.ts
│   │   │   └── socket.service.ts    # Socket.io client
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── order.types.ts
│   │   │   └── common.types.ts
│   │   └── utils/
│   │       └── constants.ts
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── client-admin/                     # Admin Panel (Mobile + Web)
│   ├── mobile/                       # React Native Admin App
│   │   └── (similar structure to client-user)
│   └── web/                          # React Web Admin Panel (optional)
│       └── (React + Vite structure)
│
├── backend/                          # Node.js + Express Backend
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.model.ts
│   │   │   ├── Staff.model.ts        # Staff-specific fields
│   │   │   ├── Order.model.ts
│   │   │   ├── CustomerProfile.model.ts
│   │   │   ├── Payment.model.ts
│   │   │   └── Inventory.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── order.routes.ts
│   │   │   ├── customer.routes.ts
│   │   │   ├── staff.routes.ts       # Staff-specific routes
│   │   │   ├── admin.routes.ts
│   │   │   └── payment.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── order.controller.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── staff.controller.ts   # Staff acceptance logic
│   │   │   ├── admin.controller.ts
│   │   │   └── payment.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── notification.service.ts  # FCM
│   │   │   ├── socket.service.ts        # Socket.io server
│   │   │   └── payment.service.ts
│   │   ├── utils/
│   │   │   ├── jwt.util.ts
│   │   │   ├── bcrypt.util.ts
│   │   │   └── logger.util.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── firebase.ts
│   │   │   ├── socket.io.ts           # Socket.io config
│   │   │   └── cloudinary.ts          # Cloudinary config
│   │   └── app.ts
│   ├── server.ts                      # Entry point with Socket.io
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── README.md
```

---

## 🆕 New Staff App Features (Rapido/Uber-style)

### Staff App Flow
1. **Login**: Phone/Email + Password
2. **Active/Offline Toggle**: Staff can go online/offline
3. **New Orders Screen**:
   - Real-time order notifications via Socket.io
   - Order cards with:
     - Pickup address
     - Delivery address
     - Order notes
     - Payment type (COD/Online)
     - Quantity
   - **Accept** / **Reject** buttons
4. **Ongoing Orders**:
   - List of accepted orders
   - Status update buttons:
     - Order Picked
     - In Transit
     - Delivered
5. **Real-time Updates**: All status changes reflect instantly in Customer App

---

## 🔌 Updated Backend API Endpoints

### Staff Routes (`/api/staff`)
- `POST /api/staff/login` - Staff login
- `GET /api/staff/profile` - Get staff profile
- `PUT /api/staff/status` - Toggle online/offline status
- `GET /api/staff/available-orders` - Get pending orders (not assigned)
- `POST /api/staff/accept-order/:id` - Accept an order
- `POST /api/staff/reject-order/:id` - Reject an order
- `GET /api/staff/ongoing-orders` - Get accepted/ongoing orders
- `PUT /api/staff/update-status/:id` - Update order status (picked, transit, delivered)
- `PUT /api/staff/orders/:id/price` - Set delivery price
- `PUT /api/staff/orders/:id/payment` - Mark payment collected

### Socket.io Events
- **Server → Staff**: 
  - `new-order` - New order available
  - `order-accepted` - Order accepted by another staff
  - `order-rejected` - Order rejected
- **Server → Customer**:
  - `order-status-updated` - Status change notification
- **Staff → Server**:
  - `staff-online` - Staff goes online
  - `staff-offline` - Staff goes offline
  - `accept-order` - Accept order
  - `reject-order` - Reject order

---

## 🗄️ Updated Database Schema

### User Model
```typescript
{
  _id: ObjectId
  email: string (unique)
  phone: string (unique)
  password: string (hashed)
  role: 'admin' | 'staff' | 'customer'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Staff Model (extends User or separate)
```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User)
  name: string
  phone: string
  isOnline: boolean
  currentLocation: { lat: number, lng: number }  // GPS for auto-assignment
  vehicleType: string (optional)
  fcmToken: string (for push notifications)
  createdAt: Date
  updatedAt: Date
}
```

### Order Model (Updated)
```typescript
{
  _id: ObjectId
  customerId: ObjectId (ref: User)
  customerProfileId: ObjectId (ref: CustomerProfile)
  quantity: number (20L cans)
  pickupAddress: string
  deliveryAddress: string
  deliverySlot: Date (optional)
  status: 'pending' | 'accepted' | 'picked' | 'transit' | 'delivered' | 'missed' | 'cancelled'
  assignedStaffId: ObjectId (ref: User, optional)  // Set when accepted
  price: number (set by staff)
  paymentMethod: 'online' | 'offline' (COD)
  paymentStatus: 'pending' | 'paid' | 'failed'
  notes: string (optional)
  location: { lat: number, lng: number }  // GPS coordinates
  createdAt: Date
  updatedAt: Date
  acceptedAt: Date (optional)
  deliveredAt: Date (optional)
}
```

---

## 🛠️ Tech Stack

### Frontend (Both Apps)
- React Native + Expo
- TypeScript
- React Navigation (Stack + Tabs)
- NativeWind (Tailwind CSS)
- Socket.io-client (real-time)
- Axios (HTTP client)
- AsyncStorage (local storage)
- Expo Notifications (FCM)

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT (authentication)
- Socket.io (real-time)
- Firebase Admin SDK (FCM)
- Cloudinary (file uploads)
- Bcrypt (password hashing)

---

## 🚀 Implementation Priority

1. **Backend Setup**: Models, routes, Socket.io server
2. **Staff App**: Login, online toggle, order acceptance flow
3. **Customer App**: Order placement, real-time status updates
4. **Admin Panel**: Dashboard, order management
5. **Notifications**: FCM integration
6. **GPS Integration**: Location-based auto-assignment

---

## 📝 Key Features

- ✅ Real-time order notifications (Socket.io)
- ✅ Staff order acceptance/rejection
- ✅ GPS-based auto-assignment (future)
- ✅ Push notifications (FCM)
- ✅ Image/receipt uploads (Cloudinary)
- ✅ Role-based access control
- ✅ JWT authentication
