# 📱 Unified App Structure Review

## 🎯 Overview

This is a **single React Native app** that handles all three user roles (Customer, Staff, Admin) with automatic role-based navigation after login.

---

## 📂 Current File Structure

```
mobile/
├── app/
│   ├── _layout.tsx                    ✅ Root layout (wraps everything)
│   ├── (auth)/                        ✅ Authentication screens
│   │   ├── _layout.tsx               ✅ Auth stack navigator
│   │   ├── login.tsx                 ✅ Unified login (all roles)
│   │   └── signup.tsx                ✅ Unified signup (role selection)
│   ├── (customer)/                    ⏳ TO BE CREATED
│   │   ├── _layout.tsx               ⏳ Customer tab navigator
│   │   ├── index.tsx                 ⏳ Home - Place Order
│   │   ├── orders.tsx                ⏳ Order History
│   │   ├── order-details/[id].tsx     ⏳ Order Details
│   │   └── profile.tsx               ⏳ Customer Profile
│   ├── (staff)/                       ⏳ TO BE CREATED
│   │   ├── _layout.tsx               ⏳ Staff tab navigator
│   │   ├── index.tsx                 ⏳ New Orders (Accept/Reject)
│   │   ├── ongoing.tsx               ⏳ Ongoing Orders
│   │   └── profile.tsx                ⏳ Staff Profile
│   └── (admin)/                       ⏳ TO BE CREATED
│       ├── _layout.tsx               ⏳ Admin tab navigator
│       ├── index.tsx                 ⏳ Dashboard
│       ├── orders.tsx                ⏳ All Orders
│       ├── staff.tsx                 ⏳ Staff Management
│       ├── inventory.tsx             ⏳ Inventory
│       └── payments.tsx              ⏳ Payments
│
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx           ✅ Unified auth (all roles)
│   │   └── OrderContext.tsx          ⏳ TO BE CREATED
│   ├── services/
│   │   ├── api.ts                    ✅ Axios instance
│   │   ├── auth.service.ts           ✅ Unified auth service
│   │   ├── order.service.ts           ⏳ TO BE CREATED
│   │   ├── staff.service.ts          ⏳ TO BE CREATED
│   │   ├── admin.service.ts           ⏳ TO BE CREATED
│   │   └── socket.service.ts         ⏳ TO BE CREATED
│   ├── components/                   ⏳ TO BE CREATED
│   │   └── ui/                       ⏳ UI components
│   ├── types/
│   │   ├── user.types.ts             ✅ User, Customer, Staff types
│   │   └── order.types.ts             ⏳ TO BE CREATED
│   └── utils/
│       ├── constants.ts              ✅ Colors, API URLs
│       └── storage.ts                ✅ AsyncStorage helpers
│
├── package.json                       ✅ Dependencies
├── app.json                          ✅ Expo config
├── tsconfig.json                     ✅ TypeScript config
└── babel.config.js                   ✅ Babel config
```

**Legend:**
- ✅ = Created and ready
- ⏳ = Needs to be created/copied

---

## 🔄 Authentication & Navigation Flow

### Flow Diagram:

```
┌─────────────────────────────────────────────────────────┐
│                    App Starts                           │
│              mobile/app/_layout.tsx                      │
│         (Wraps with AuthProvider & OrderProvider)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Check Auth State    │
         │  (AuthContext)       │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   Not Authenticated  Authenticated
        │                 │
        ▼                 ▼
┌───────────────┐   ┌──────────────────┐
│  Login Screen │   │  Check User Role │
│  (auth)/login │   │  (from JWT)      │
└───────┬───────┘   └────────┬─────────┘
        │                    │
        │                    ├─── customer → (customer)/ tabs
        │                    ├─── staff    → (staff)/ tabs
        │                    └─── admin   → (admin)/ tabs
        │
        ▼
┌───────────────┐
│ Signup Screen │
│(auth)/signup  │
│(role picker)  │
└───────────────┘
```

### Step-by-Step Flow:

1. **App Launch**
   - `_layout.tsx` wraps app with `AuthProvider`
   - `AuthContext` checks for stored token/user

2. **Not Authenticated**
   - User sees `/(auth)/login`
   - Can navigate to `/(auth)/signup`

3. **Login/Signup**
   - User enters credentials
   - API returns: `{ token, user: { id, email, phone, role } }`
   - Token stored in AsyncStorage
   - User object stored in AsyncStorage
   - `AuthContext` updates `user` state

4. **Auto-Navigation (Automatic)**
   ```typescript
   useEffect(() => {
     if (user) {
       switch (user.role) {
         case 'customer': router.replace('/(customer)');
         case 'staff': router.replace('/(staff)');
         case 'admin': router.replace('/(admin)');
       }
     }
   }, [user]);
   ```

5. **Role-Based Screens**
   - Each role sees only their relevant tabs
   - Screens are isolated per role
   - No mixing of role-specific features

6. **Logout**
   - Clears token and user from storage
   - Sets `user` to `null`
   - Automatically redirects to `/(auth)/login`

---

## 🎨 Key Features

### ✅ What's Working:

1. **Unified Authentication**
   - Single login screen for all roles
   - Single signup with role selection
   - Same API endpoints (`/api/auth/login`, `/api/auth/register`)

2. **Automatic Role-Based Routing**
   - No manual navigation needed
   - AuthContext automatically routes after login
   - Prevents wrong role access

3. **Shared Infrastructure**
   - Single API client (`api.ts`)
   - Single storage utility
   - Single constants file
   - Shared types

### ⏳ What Needs to Be Done:

1. **Create Role-Based Screen Groups**
   - Copy customer screens from `client-user/app/(tabs)/`
   - Copy staff screens from `client-staff/app/(tabs)/`
   - Create admin screens

2. **Create Shared Components**
   - Copy UI components (Button, Input, Card, etc.)
   - Create role-specific components if needed

3. **Create Services**
   - Copy `order.service.ts`
   - Copy `staff.service.ts`
   - Create `admin.service.ts`
   - Copy/update `socket.service.ts`

4. **Create Contexts**
   - Copy/update `OrderContext.tsx`
   - May need role-specific logic

5. **Copy Types**
   - Copy `order.types.ts`
   - Any other shared types

---

## 🔐 Authentication Details

### Login Flow:
```typescript
// User enters credentials
login({ email/phone, password })
  ↓
// API call to /api/auth/login
POST /api/auth/login
  ↓
// Backend returns
{ token: "jwt_token", user: { id, email, phone, role } }
  ↓
// AuthContext stores token & user
storage.setToken(token)
storage.setUser(user)
setUser(user) // Updates state
  ↓
// useEffect detects user change
useEffect(() => {
  if (user) navigateToRoleScreen(user.role)
}, [user])
  ↓
// Automatic navigation
router.replace('/(customer)') // or staff/admin
```

### Signup Flow:
```typescript
// User selects role and enters details
register({ name, email, phone, password, role, address })
  ↓
// API call to /api/auth/register
POST /api/auth/register
  ↓
// Backend creates user with selected role
// Returns token & user
  ↓
// Same auto-navigation as login
```

---

## 📱 Screen Groups Structure

### Customer Screens (`(customer)/`):
- **Home** (`index.tsx`): Place new order
- **Orders** (`orders.tsx`): Order history list
- **Order Details** (`order-details/[id].tsx`): Single order view
- **Profile** (`profile.tsx`): Customer profile & settings

### Staff Screens (`(staff)/`):
- **New Orders** (`index.tsx`): Pending orders (Accept/Reject)
- **Ongoing** (`ongoing.tsx`): Accepted orders (Update status)
- **Profile** (`profile.tsx`): Staff profile & settings

### Admin Screens (`(admin)/`):
- **Dashboard** (`index.tsx`): Stats overview
- **Orders** (`orders.tsx`): All orders management
- **Staff** (`staff.tsx`): Staff management
- **Inventory** (`inventory.tsx`): Stock management
- **Payments** (`payments.tsx`): Payment tracking

---

## 🛠️ Technical Details

### AuthContext Auto-Navigation:
```typescript
// In AuthContext.tsx
useEffect(() => {
  if (!isLoading && user) {
    navigateToRoleScreen(user.role);
  } else if (!isLoading && !user) {
    router.replace('/(auth)/login');
  }
}, [user, isLoading]);
```

### Protected Routes:
- Each role group `(customer)`, `(staff)`, `(admin)` is protected
- If user tries to access wrong role screen, AuthContext redirects
- All screens can access `user` from `useAuth()` hook

### Storage Keys:
- Token: `@hysafe_token`
- User: `@hysafe_user`
- Single storage for all roles (unified)

---

## ✅ Benefits of This Structure

1. **Single Codebase**: One app to maintain instead of three
2. **Shared Components**: No duplication of UI components
3. **Unified Auth**: One authentication flow for all roles
4. **Automatic Routing**: No manual navigation logic needed
5. **Type Safety**: Shared TypeScript types
6. **Easier Updates**: Update once, works for all roles
7. **Better UX**: Users only see relevant screens

---

## 🚀 Next Steps

1. Review this structure
2. Copy customer screens from `client-user/`
3. Copy staff screens from `client-staff/`
4. Create admin screens
5. Copy shared components
6. Copy services and contexts
7. Test authentication flow
8. Test role-based navigation

---

**Status**: Foundation complete ✅ | Screens pending ⏳




