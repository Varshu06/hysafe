# Migration Guide: Unified App Structure

## ✅ What's Done

I've started creating a **unified single app** (`mobile/`) that handles all three roles (customer, staff, admin) with role-based navigation.

### Created Files:
- ✅ `mobile/app/_layout.tsx` - Root layout
- ✅ `mobile/app/(auth)/login.tsx` - Unified login
- ✅ `mobile/app/(auth)/signup.tsx` - Unified signup with role selection
- ✅ `mobile/src/context/AuthContext.tsx` - Unified auth context (auto-routes by role)
- ✅ `mobile/src/services/auth.service.ts` - Unified auth service
- ✅ `mobile/src/services/api.ts` - API client
- ✅ `mobile/src/utils/` - Storage, constants
- ✅ `mobile/src/types/user.types.ts` - User types
- ✅ `mobile/package.json` - Dependencies
- ✅ `mobile/app.json` - Expo config
- ✅ `mobile/tsconfig.json` - TypeScript config

## 📋 What Needs to Be Done

### 1. Copy Customer Screens
From `client-user/app/(tabs)/` to `mobile/app/(customer)/`:
- `index.tsx` → Home/Place Order screen
- `orders.tsx` → Order history
- `order-details/[id].tsx` → Order details
- `profile.tsx` → Customer profile
- `_layout.tsx` → Customer tab navigator

### 2. Copy Staff Screens
From `client-staff/app/(tabs)/` to `mobile/app/(staff)/`:
- `index.tsx` → New Orders (Accept/Reject)
- `ongoing.tsx` → Ongoing orders
- `profile.tsx` → Staff profile
- `_layout.tsx` → Staff tab navigator

### 3. Create Admin Screens
Create `mobile/app/(admin)/`:
- `index.tsx` → Dashboard
- `orders.tsx` → All orders
- `staff.tsx` → Staff management
- `inventory.tsx` → Inventory
- `payments.tsx` → Payments
- `_layout.tsx` → Admin tab navigator

### 4. Copy Components
From existing apps to `mobile/src/components/`:
- UI components (Button, Input, Card, etc.)
- Order components
- Status badges

### 5. Copy Services
- `order.service.ts` from client-user
- `staff.service.ts` from client-staff
- `socket.service.ts` (unified)
- Create `admin.service.ts`

### 6. Copy Contexts
- `OrderContext.tsx` (may need role-specific logic)

### 7. Copy Types
- `order.types.ts`
- Any other shared types

## 🔄 How It Works

### Authentication Flow:
1. User opens app → `/(auth)/login`
2. User logs in → AuthContext receives user with `role`
3. **Auto-navigation** based on role:
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

### Role-Based Screens:
- **Customer**: Sees only customer tabs (Home, Orders, Profile)
- **Staff**: Sees only staff tabs (New Orders, Ongoing, Profile)
- **Admin**: Sees only admin tabs (Dashboard, Orders, Staff, Inventory, Payments)

## 🚀 Quick Start (After Migration)

```bash
cd mobile
npm install
npm start
```

## 📝 Notes

- All three roles use the **same authentication endpoints**
- Navigation is **automatic** based on user role
- Each role has **isolated screens** - no mixing
- **Shared components** in `src/components/`
- **Shared services** in `src/services/`

## ⚠️ Important

- Update all import paths to use `mobile/src/`
- Remove role-specific auth logic (now unified)
- Ensure screens check user role if needed
- Test navigation flow for each role

---

**Next Step**: Copy screens from existing apps to `mobile/app/(customer)`, `mobile/app/(staff)`, and create `mobile/app/(admin)` screens.




