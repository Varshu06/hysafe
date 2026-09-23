# Admin Dashboard Setup Guide

Complete setup and deployment guide for the HySafe Admin Dashboard.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 16+ (check: `node --version`)
- npm 7+ (check: `npm --version`)
- Backend API running on `http://localhost:5000`

### Step 1: Install Dependencies

```bash
cd admin-dashboard
npm install
```

⏱️ ~2 minutes on first install

### Step 2: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Verify the .env file:
cat .env
```

Should show:
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=HySafe Admin Dashboard
```

### Step 3: Start Development Server

```bash
npm run dev
```

✅ Dashboard opens at: `http://localhost:3000`

### Step 4: Login

Use your backend admin credentials:
- Email: `admin@example.com`
- Password: `your-admin-password`

---

## 📁 Project Structure Explained

```
admin-dashboard/
│
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx       # Button component (primary, secondary, etc)
│   │   ├── Card.tsx         # Card container components
│   │   ├── Layout.tsx       # Sidebar + Navbar
│   │   ├── StatCard.tsx     # Statistics display
│   │   ├── DataTable.tsx    # Reusable data table
│   │   └── Common.tsx       # Loading, Badge, EmptyState
│   │
│   ├── pages/               # Page components (one per route)
│   │   ├── LoginPage.tsx    # Authentication page
│   │   ├── DashboardPage.tsx # Main dashboard
│   │   ├── OrdersPage.tsx   # Orders management
│   │   ├── CustomersPage.tsx # Customer profiles
│   │   ├── StaffPage.tsx    # Staff management
│   │   └── InventoryPage.tsx # Inventory tracking
│   │
│   ├── services/            # API communication layer
│   │   ├── auth.service.ts  # Login, logout
│   │   ├── order.service.ts # Order API calls
│   │   ├── customer.service.ts
│   │   ├── staff.service.ts (ALSO inventory.service.ts)
│   │   └── dashboard.service.ts
│   │
│   ├── context/             # React Context for state
│   │   └── AuthContext.tsx  # Global auth state
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── useLoading.ts    # Loading & fetch hooks
│   │
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # All type interfaces
│   │
│   ├── utils/               # Utility functions
│   │   ├── api.ts           # Axios instance + interceptors
│   │   ├── storage.ts       # localStorage helpers
│   │   ├── formatting.ts    # Format currency, date, etc
│   │   └── constants.ts     # Colors, storage keys
│   │
│   ├── layouts/             # Layout wrappers
│   │   └── MainLayout.tsx   # Dashboard layout
│   │
│   ├── App.tsx              # Main app component with routing
│   ├── main.tsx             # React entry point
│   └── index.css            # Global Tailwind styles
│
├── public/                  # Static files
├── vite.config.ts           # Vite build config
├── tailwind.config.ts       # Tailwind CSS config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies
├── .env                     # Environment variables (Git ignored)
├── .env.example             # Example env (for reference)
├── README.md                # Project README
└── SETUP_GUIDE.md          # This file
```

---

## 🔧 Development Workflow

### Running the dev server with Hot Module Reload (HMR)

```bash
npm run dev
```

- Changes automatically reload in browser
- TypeScript errors shown in terminal
- Port: `http://localhost:3000`

### Building for production

```bash
npm run build
```

Creates optimized build in `dist/` folder:
- Minified JavaScript (~50KB gzipped)
- CSS bundled
- Assets optimized

### Preview production build

```bash
npm run preview
```

Tests the production build locally.

### Type checking

```bash
npm run type-check
```

Validate TypeScript without compiling (useful in CI/CD).

### Linting

```bash
npm run lint
```

Find code style issues.

---

## 🔐 Authentication Flow

### Login Process

1. User enters email + password in **LoginPage**
2. `AuthContext.login()` calls `authService.login()`
3. API returns JWT token + user data
4. Token stored in localStorage + state
5. User redirected to dashboard

### Protected Routes

```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

- Checks if user is authenticated
- Shows loading state while checking
- Redirects to `/login` if not authenticated

### Automatic Token Injection

Every API request automatically includes the JWT token:

```typescript
// In api.ts interceptor
api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Auto Logout on 401

```typescript
// In api.ts response interceptor
if (error.response?.status === 401) {
  storage.clearAll();
  window.location.href = '/login';
}
```

---

## 📡 API Integration

### Base Configuration

```typescript
// In .env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Service Layer Pattern

Each domain has its own service file:

```typescript
// src/services/order.service.ts
export const orderService = {
  getAllOrders: async (params) => { },
  getOrderById: async (id) => { },
  updateOrderStatus: async (id, status) => { },
  // ... more methods
};
```

### Usage in Components

```typescript
const { data, loading, error } = useFetch(
  () => orderService.getAllOrders(),
  []
);
```

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | Admin login |
| `/orders` | GET | List orders |
| `/orders/:id/status` | PUT | Update order status |
| `/customers` | GET | List customers |
| `/staff` | GET | List staff |
| `/staff` | POST | Create staff |
| `/staff/:id` | DELETE | Delete staff |
| `/inventory` | GET | List items |

---

## 🎨 Styling System

### Colors

All colors are defined in `src/utils/constants.ts` and matched to Tailwind config:

```typescript
export const COLORS = {
  primary: '#0284C7',      // Main blue
  primaryDark: '#0C4A6E',  // Dark blue
  primaryLight: '#38BDF8', // Light blue
  success: '#0EA5E9',      // Green
  warning: '#F59E0B',      // Orange
  error: '#EF4444',        // Red
};
```

### Using Colors in Components

#### Tailwind Classes (Preferred)

```tsx
<div className="bg-primary text-white">Primary Button</div>
<div className="bg-success text-white">Success</div>
<div className="border border-border rounded">Card</div>
```

#### CSS Variables (Alternative)

```css
.my-element {
  background-color: var(--color-primary);
  border-color: var(--color-border);
}
```

### Tailwind Configuration

See `tailwind.config.ts` for custom theme:

```typescript
theme: {
  extend: {
    colors: {
      primary: '#0284C7',
      'primary-dark': '#0C4A6E',
      // ... more colors
    }
  }
}
```

---

## 🧩 Reusable Components

### Button

```tsx
<Button variant="primary" size="md" isLoading={false} fullWidth>
  Click Me
</Button>
```

**Variants**: `primary`, `secondary`, `danger`, `success`  
**Sizes**: `sm`, `md`, `lg`

### Card

```tsx
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

### StatCard

```tsx
<StatCard
  icon={<Package />}
  label="Total Orders"
  value={123}
  change={5}
  trend="up"
/>
```

### DataTable

```tsx
<DataTable
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' }
  ]}
  data={items}
  isLoading={loading}
  error={error}
  onRowClick={(row) => console.log(row)}
/>
```

### Badge

```tsx
<Badge variant="success">In Stock</Badge>
<Badge variant="danger">Low Stock</Badge>
```

---

## 📱 Responsive Design

The dashboard is mobile-first with Tailwind breakpoints:

```
sm: 640px    (mobile)
md: 768px    (tablet)
lg: 1024px   (desktop)
xl: 1280px   (large desktop)
```

### Example Responsive Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 1 col on mobile, 2 on tablet, 4 on desktop */}
</div>
```

### Mobile-Specific Features

- Collapsible sidebar (toggles on mobile)
- Hamburger menu icon
- Touch-friendly buttons
- Full-width cards on small screens

---

## 🔍 Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Application tab for localStorage

### Common Issues

| Issue | Solution |
|-------|----------|
| **API 404 errors** | Ensure backend runs on port 5000 |
| **CORS errors** | Check backend CORS configuration |
| **Token not persisting** | Check localStorage in DevTools |
| **Page blank after login** | Check console for TypeScript errors |
| **Sidebar not responding** | Clear browser cache, reload page |

### Useful Console Commands

```javascript
// Check stored token
localStorage.getItem('admin_auth_token')

// Check user data
JSON.parse(localStorage.getItem('admin_user'))

// Clear all storage
localStorage.clear()

// Make test API call
fetch('http://localhost:5000/api/orders', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('admin_auth_token')}`
  }
}).then(r => r.json()).then(console.log)
```

---

## 📦 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized `dist/` folder.

### Deployment Options

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Option 3: Traditional Server

```bash
# Build
npm run build

# Upload dist/ folder to your server
# Configure web server to serve index.html for all routes
```

### Environment Variables for Production

Create `.env.production` with production API URL:

```
VITE_API_BASE_URL=https://api.hysafe.com/api
VITE_APP_NAME=HySafe Admin Dashboard
```

---

## 🚨 Error Handling

### API Errors

All API calls handle errors automatically:

```typescript
try {
  const orders = await orderService.getAllOrders();
} catch (error) {
  console.error('Failed to fetch orders:', error.message);
  // User sees error in UI
}
```

### Form Validation

```typescript
const [error, setError] = useState('');

if (!email || !password) {
  setError('Email and password required');
  return;
}
```

### Global Error Boundary

You can add an error boundary for unhandled errors:

```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error);
  }
  
  render() {
    return this.props.children;
  }
}
```

---

## 🔄 State Management

### Local Component State

For simple state:

```typescript
const [orders, setOrders] = useState<Order[]>([]);
```

### Context API (Global State)

For auth state:

```typescript
const { user, token, login, logout } = useAuth();
```

### Custom Hooks

For complex logic:

```typescript
const { data, loading, error, refetch } = useFetch(
  () => orderService.getAllOrders(),
  []
);
```

### Future Enhancement: Zustand/Redux

For large-scale apps, consider:

```bash
npm install zustand
# or
npm install redux @reduxjs/toolkit react-redux
```

---

## 📝 Best Practices

### Component Organization

```tsx
// 1. Imports
import React, { useState } from 'react';

// 2. Types
interface Props { }

// 3. Component
export const MyComponent: React.FC<Props> = () => {
  // 4. State
  const [items, setItems] = useState([]);

  // 5. Effects
  useEffect(() => { }, []);

  // 6. Handlers
  const handleClick = () => { };

  // 7. Render
  return <div>Content</div>;
};
```

### Naming Conventions

- **Components**: PascalCase (`LoginPage.tsx`)
- **Hooks**: camelCase starting with `use` (`useLoading.ts`)
- **Services**: camelCase with `.service.ts` (`order.service.ts`)
- **Utils**: camelCase (`formatting.ts`)
- **Types**: PascalCase (`Order`, `User`)

### Error Messages

Show user-friendly messages:

```tsx
// ❌ Bad
<div>Error: TypeError: Cannot read property 'name' of undefined</div>

// ✅ Good
<div>Failed to load orders. Please try again.</div>
```

### Loading States

```tsx
if (isLoading) return <Loading />;
if (error) return <ErrorState message={error} />;
if (!data) return <EmptyState />;
return <DataDisplay data={data} />;
```

---

## 🆘 Troubleshooting

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Port 3000 already in use

```bash
# Use different port
npm run dev -- --port 3001

# Or kill process using port 3000
# On Windows: netstat -ano | findstr :3000
# On Mac/Linux: lsof -i :3000 | grep LISTEN
```

### CORS errors from backend

In your backend, ensure CORS is configured:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

### Types errors after npm install

```bash
npm run type-check
```

If errors persist:

```bash
# Reinstall node_modules with clean install
npm ci

# Update TypeScript
npm install --save-dev typescript@latest
```

---

## 📚 Additional Resources

### Official Documentation

- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts](https://recharts.org)
- [Lucide Icons](https://lucide.dev)

### Learning Paths

1. **React Basics**: Components, hooks, state
2. **TypeScript**: Types, interfaces, generics
3. **Tailwind CSS**: Utility-first styling
4. **API Integration**: Axios, error handling
5. **Routing**: React Router v6

---

## ✅ Deployment Checklist

- [ ] All environment variables configured
- [ ] Backend API running and accessible
- [ ] `npm run build` completes without errors
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Tested login flow
- [ ] Tested all main pages
- [ ] Tested on mobile devices
- [ ] Set up analytics/monitoring
- [ ] Domain configured
- [ ] SSL certificate installed

---

## 📞 Support

For issues:

1. Check this guide
2. Review browser console errors
3. Check network tab for failed requests
4. Verify backend API is running
5. Test with fresh browser session (clear cache)

Happy developing! 🚀
