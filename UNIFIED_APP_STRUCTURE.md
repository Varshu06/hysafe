# Unified App Structure - Single App with Role-Based Navigation

## ✅ What's Been Created

I'm consolidating all three apps (customer, staff, admin) into a **single unified app** with role-based authentication and navigation.

## 📱 App Structure

```
mobile/
├── app/
│   ├── _layout.tsx              # Root layout with AuthProvider
│   ├── (auth)/                  # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx            # Unified login (all roles)
│   │   └── signup.tsx            # Unified signup (role selection)
│   ├── (customer)/              # Customer screens (after login)
│   │   ├── _layout.tsx          # Customer tab navigator
│   │   ├── index.tsx            # Home - Place Order
│   │   ├── orders.tsx           # Order History
│   │   ├── order-details/[id].tsx
│   │   └── profile.tsx          # Customer Profile
│   ├── (staff)/                 # Staff screens (after login)
│   │   ├── _layout.tsx          # Staff tab navigator
│   │   ├── index.tsx            # New Orders (Accept/Reject)
│   │   ├── ongoing.tsx          # Ongoing Orders
│   │   └── profile.tsx          # Staff Profile
│   └── (admin)/                 # Admin screens (after login)
│       ├── _layout.tsx          # Admin tab navigator
│       ├── index.tsx            # Dashboard
│       ├── orders.tsx           # All Orders
│       ├── staff.tsx            # Staff Management
│       ├── inventory.tsx        # Inventory
│       └── payments.tsx         # Payments
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx      # Unified auth (all roles)
│   │   └── OrderContext.tsx     # Order state management
│   ├── services/
│   │   ├── api.ts               # Axios instance
│   │   ├── auth.service.ts      # Unified auth service
│   │   ├── order.service.ts
│   │   └── socket.service.ts
│   ├── types/
│   │   ├── user.types.ts        # User, Customer, Staff types
│   │   └── order.types.ts
│   └── utils/
│       ├── constants.ts
│       └── storage.ts
```

## 🔄 Authentication Flow

1. **User opens app** → Sees login screen
2. **User logs in** → AuthContext receives user with role
3. **Auto-navigation** → Based on role:
   - `customer` → `/(customer)` tabs
   - `staff` → `/(staff)` tabs
   - `admin` → `/(admin)` tabs
4. **User logs out** → Returns to `/(auth)/login`

## 🎯 Key Features

### Unified Authentication
- Single login screen for all roles
- Single signup screen with role selection
- AuthContext automatically routes based on role

### Role-Based Navigation
- Each role has its own tab navigator
- Screens are isolated per role
- Protected routes based on authentication

### Shared Components
- All UI components in one place
- Shared services (API, Socket.io)
- Shared types and utilities

## 📋 Next Steps

1. ✅ Created unified auth screens
2. ✅ Created unified AuthContext
3. ⏳ Create customer screens/tabs
4. ⏳ Create staff screens/tabs
5. ⏳ Create admin screens/tabs
6. ⏳ Copy components from existing apps
7. ⏳ Create package.json and config files
8. ⏳ Test role-based navigation

## 🚀 Benefits

- **Single codebase** - Easier to maintain
- **Shared components** - No duplication
- **Unified auth** - One authentication flow
- **Role-based routing** - Automatic navigation
- **Better UX** - Users see only their relevant screens

---

**Status**: In Progress - Creating role-based screen groups...




