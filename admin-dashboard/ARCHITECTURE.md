# Admin Dashboard Architecture

Comprehensive guide to the architecture, design patterns, and code organization of the HySafe Admin Dashboard.

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐      ┌──────────────┐    ┌──────────────┐  │
│ │   Pages      │ ───► │  Components  │───►│   Context    │  │
│ │ (Containers) │      │  (Presenters)│    │    (State)   │  │
│ └──────────────┘      └──────────────┘    └──────────────┘  │
│         │                     │                    │          │
│         └─────────────────────┼────────────────────┘          │
│                               │                               │
│                      ┌────────▼────────┐                      │
│                      │   Hooks/Utils   │                      │
│                      │   (Formatters)  │                      │
│                      └────────┬────────┘                      │
│                               │                               │
│                      ┌────────▼────────┐                      │
│                      │   Services      │                      │
│                      │   (API Layer)   │                      │
│                      └────────┬────────┘                      │
│                               │                               │
│                      ┌────────▼────────┐                      │
│                      │   Axios Instance│                      │
│                      │   (HTTP Client) │                      │
│                      └────────┬────────┘                      │
├─────────────────────────────┼──────────────────────────────────┤
│                             │                                  │
│           ┌─────────────────▼─────────────────┐                │
│           │  Backend API (Express + MongoDB)  │                │
│           │  (Port: 5000)                     │                │
│           └─────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

## 🏗️ Layered Architecture

### 1. **Presentation Layer** (`src/pages`, `src/components`)

- **Pages**: Full-page components (Dashboard, Orders, etc.)
- **Components**: Reusable UI components (Button, Card, etc.)
- Responsibilities:
  - Render UI
  - Handle user interactions
  - Dispatch events

### 2. **State Management Layer** (`src/context`, `src/hooks`)

- **AuthContext**: Global authentication state
- **Custom Hooks**: `useLoading`, `useFetch`
- Responsibilities:
  - Manage application state
  - Provide state to components
  - Handle state updates

### 3. **Business Logic Layer** (`src/services`, `src/utils`)

- **Services**: API communication (order.service.ts, etc.)
- **Utils**: Formatting, constants, helpers
- Responsibilities:
  - Business logic
  - Data transformation
  - Utility functions

### 4. **Data Access Layer** (`src/utils/api.ts`)

- **Axios Instance**: HTTP client with interceptors
- Responsibilities:
  - HTTP requests
  - Authentication injection
  - Error handling
  - Response transformation

---

## 📁 Detailed Folder Structure

### `src/pages`

Page components that represent routes:

```typescript
// OrdersPage.tsx - Full page for /orders route
export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    loadOrders();
  }, []);
  
  return (
    <div>
      <OrderFilters />
      <OrdersList orders={orders} />
    </div>
  );
};
```

**Page Components Pattern**:
- Load data on mount
- Manage page-level state
- Compose smaller components
- Handle page navigation

### `src/components`

Reusable UI components:

```
components/
├── Button.tsx           # Base button component
├── Card.tsx            # Card containers
├── StatCard.tsx        # Statistics display
├── DataTable.tsx       # Sortable table
├── Layout.tsx          # Sidebar + Navbar
├── Common.tsx          # Badge, Loading, etc
└── FormField.tsx       # (Future: form inputs)
```

**Component Pattern**:
- Pure, functional components
- Fully typed with TypeScript
- Accept props for customization
- No direct state unless necessary

### `src/services`

API service layer with typed methods:

```typescript
// order.service.ts
export const orderService = {
  getAllOrders: async (params?: Params): Promise<Order[]> => { },
  getOrderById: async (id: string): Promise<Order> => { },
  updateOrderStatus: async (id: string, status: OrderStatus) => { },
};
```

**Service Pattern**:
- Encapsulate API calls
- Type request/response data
- Handle errors
- Provide data transformation

### `src/context`

React Context for global state:

```typescript
// AuthContext.tsx
const [user, setUser] = useState<User | null>(null);
const [token, setToken] = useState<string | null>(null);

return (
  <AuthContext.Provider value={{ user, token, login, logout }}>
    {children}
  </AuthContext.Provider>
);
```

**Context Pattern**:
- Global state management
- Reduce prop drilling
- Single responsibility
- Easy to test

### `src/hooks`

Custom React hooks:

```typescript
// useLoading.ts
export const useFetch = <T,>(fetchFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFn().then(setData).catch(setError);
  }, []);
  
  return { data, loading, error };
};
```

**Hook Pattern**:
- Reusable logic
- Encapsulate side effects
- Composable

### `src/types`

TypeScript interfaces and types:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Order {
  _id: string;
  customerId: string;
  totalPrice: number;
  status: OrderStatus;
}
```

**Type Pattern**:
- Single source of truth
- Compile-time safety
- IDE autocomplete
- Self-documenting

### `src/utils`

Utility functions and constants:

```typescript
// formatting.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// constants.ts
export const COLORS = {
  primary: '#0284C7',
  success: '#0EA5E9',
};
```

**Utils Pattern**:
- Reusable functions
- No side effects
- Easy to test
- Pure functions

### `src/layouts`

Layout wrapper components:

```typescript
// MainLayout.tsx
export const MainLayout: React.FC<{children}> = ({ children }) => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main>
        <Navbar />
        <div>{children}</div>
      </main>
    </div>
  );
};
```

---

## 🔄 Data Flow Patterns

### Page to API Flow

```
┌─────────────────────────────────────────────────────────┐
│  OrdersPage (React Component)                           │
└────────────────────┬────────────────────────────────────┘
                     │ 1. useEffect hook on mount
                     ▼
┌─────────────────────────────────────────────────────────┐
│  orderService.getAllOrders()                            │
│  (Call service method)                                  │
└────────────────────┬────────────────────────────────────┘
                     │ 2. Call API via service
                     ▼
┌─────────────────────────────────────────────────────────┐
│  api.get('/orders') (Axios instance)                    │
│  (Add JWT token in interceptor)                         │
└────────────────────┬────────────────────────────────────┘
                     │ 3. HTTP request
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend API                                            │
│  /api/orders → Database                                │
└────────────────────┬────────────────────────────────────┘
                     │ 4. Response
                     ▼
┌─────────────────────────────────────────────────────────┐
│  setOrders(data) (Update state)                         │
└────────────────────┬────────────────────────────────────┘
                     │ 5. Re-render
                     ▼
┌─────────────────────────────────────────────────────────┐
│  <OrdersList orders={orders} /> (Display data)          │
└─────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
User Input (email, password)
        │
        ▼
    LoginPage
        │
        ▼
authContext.login() ─── Call authService.login()
        │                      │
        ▼                      ▼
    api.post('/auth/login')
        │
        ▼
Backend validates & returns JWT
        │
        ▼
Store in localStorage + state
        │
        ▼
Redirect to Dashboard
```

---

## 🔒 Authentication & Authorization

### JWT Token Flow

```typescript
// 1. Login
const response = await authService.login({ email, password });
const { token, user } = response;

// 2. Store
storage.setToken(token);
storage.setUser(user);

// 3. Use in requests (Automatic)
api.interceptors.request.use((config) => {
  const token = storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 4. Handle expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.clearAll();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Protected Routes

```typescript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <MainLayout>{children}</MainLayout>;
};

// Usage
<Route
  path="/orders"
  element={
    <ProtectedRoute>
      <OrdersPage />
    </ProtectedRoute>
  }
/>
```

---

## 🎨 UI Component Patterns

### Composition Pattern

```typescript
// Composable Button component
<Button variant="primary" size="md" fullWidth>
  Save Order
</Button>

// Composable Card component
<Card>
  <CardHeader>Orders</CardHeader>
  <CardBody>
    <DataTable columns={cols} data={rows} />
  </CardBody>
</Card>
```

### Prop Delegation Pattern

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, isLoading, ...props }, ref) => {
    return (
      <button ref={ref} {...props}>
        {isLoading && <Spinner />}
        {props.children}
      </button>
    );
  }
);
```

### Render Props Pattern (for tables)

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  rowActionComponent?: (row: T) => React.ReactNode;
}

// Usage
<DataTable
  data={orders}
  columns={[...]}
  rowActionComponent={(row) => (
    <button onClick={() => handleEdit(row)}>Edit</button>
  )}
/>
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// order.service.test.ts
describe('orderService', () => {
  it('should fetch all orders', async () => {
    const orders = await orderService.getAllOrders();
    expect(orders).toBeInstanceOf(Array);
  });
});
```

### Component Tests

```typescript
// Button.test.tsx
describe('Button', () => {
  it('should render with correct variant', () => {
    const { getByRole } = render(
      <Button variant="primary">Click</Button>
    );
    expect(getByRole('button')).toHaveClass('bg-primary');
  });
});
```

### Integration Tests

```typescript
// OrdersPage.test.tsx
describe('OrdersPage', () => {
  it('should load and display orders', async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText(/order list/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🚀 Performance Optimizations

### Code Splitting

```typescript
// In Router - lazy load pages
const OrdersPage = lazy(() => import('@pages/OrdersPage'));
const CustomersPage = lazy(() => import('@pages/CustomersPage'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/orders" element={<OrdersPage />} />
  </Routes>
</Suspense>
```

### Memoization

```typescript
// Prevent re-renders
const OrdersList = React.memo(({ orders }) => {
  return (
    <div>
      {orders.map(order => (
        <OrderItem key={order._id} order={order} />
      ))}
    </div>
  );
});
```

### Caching

```typescript
// Cache API responses
const cache = new Map();

export const cachedFetch = async (key, fetchFn) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = await fetchFn();
  cache.set(key, data);
  return data;
};
```

---

## 📊 State Management Patterns

### Local State (Component Level)

```typescript
const [orders, setOrders] = useState<Order[]>([]);
const [filter, setFilter] = useState<OrderStatus>('pending');
```

### Context State (Global)

```typescript
const { user, token, login } = useAuth();
```

### Custom Hook State (Logic)

```typescript
const { data, loading, error } = useFetch(
  () => orderService.getAllOrders(),
  []
);
```

### Future: Zustand Store (Scalable)

```typescript
// Could be added for complex state
const useOrderStore = create((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
}));
```

---

## 🔌 API Integration Patterns

### Service Method Pattern

```typescript
export const orderService = {
  // Get all
  getAllOrders: async (params) => {
    const { data } = await api.get('/orders', { params });
    return data.data;
  },

  // Get one
  getOrderById: async (id) => {
    const { data } = await api.get(`/orders/${id}`);
    return data.data;
  },

  // Create
  createOrder: async (orderData) => {
    const { data } = await api.post('/orders', orderData);
    return data.data;
  },

  // Update
  updateOrderStatus: async (id, status) => {
    const { data } = await api.put(`/orders/${id}/status`, { status });
    return data.data;
  },

  // Delete
  deleteOrder: async (id) => {
    await api.delete(`/orders/${id}`);
  },
};
```

### Error Handling Pattern

```typescript
try {
  const orders = await orderService.getAllOrders();
  setOrders(orders);
} catch (error) {
  if (error.response?.status === 401) {
    // Unauthorized - already handled by interceptor
  } else if (error.response?.status === 403) {
    setError('You do not have permission');
  } else {
    setError('Failed to load orders');
  }
}
```

---

## 🎯 Design Decisions

### Why Context API over Redux?

- ✅ Simpler for medium-sized apps
- ✅ No boilerplate
- ✅ Built into React
- ❌ Can cause unnecessary re-renders (solution: split contexts)

### Why Axios over Fetch?

- ✅ Automatic interceptors
- ✅ Built-in transformations
- ✅ Timeout support
- ✅ Request/response interceptors

### Why Tailwind CSS over CSS Modules?

- ✅ Utility-first approach
- ✅ Consistent spacing/colors
- ✅ No naming conflicts
- ✅ Smaller bundle size

### Why TypeScript?

- ✅ Compile-time safety
- ✅ Better IDE support
- ✅ Self-documenting code
- ✅ Reduces bugs in production

---

## 🔮 Future Enhancements

### Phase 1: Features
- [ ] Real-time notifications (Socket.io)
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Export to PDF/CSV

### Phase 2: Architecture
- [ ] Statemanagement (Zustand/Redux)
- [ ] Service Worker for offline mode
- [ ] Error Boundary component
- [ ] A/B testing integration

### Phase 3: Performance
- [ ] Image optimization
- [ ] Bundle analysis
- [ ] Performance monitoring
- [ ] Automated testing

### Phase 4: Experience
- [ ] Dark mode
- [ ] Internationalization (i18n)
- [ ] Keyboard shortcuts
- [ ] Accessibility audit (WCAG)

---

## 📚 References

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide)
- [Axios Documentation](https://axios-http.com)

---

This architecture provides a solid foundation for a scalable, maintainable admin dashboard.
