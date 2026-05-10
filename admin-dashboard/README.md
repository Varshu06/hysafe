# HySafe Admin Dashboard

A modern, production-ready admin dashboard for the HySafe delivery management platform.

## Features

- 📊 **Dashboard Overview** - Real-time stats and charts
- 📦 **Order Management** - Track and manage all orders
- 👥 **Customer Management** - View customer profiles and history
- 👔 **Staff Management** - Add, edit, and manage delivery staff
- 📚 **Inventory Management** - Track stock levels
- 🔐 **JWT Authentication** - Secure admin login
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Tailwind CSS** - Modern, consistent UI

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite (⚡ Lightning-fast development)
- **Styling**: Tailwind CSS
- **API Client**: Axios
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── context/         # React context (Auth)
│   ├── layouts/         # Layout components
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies
└── index.html           # HTML template
```

## Installation & Setup

### 1. Navigate to the admin-dashboard folder

```bash
cd admin-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and update:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=HySafe Admin Dashboard
```

Make sure the backend API is running on `http://localhost:5000`

### 4. Start development server

```bash
npm run dev
```

The dashboard will open at `http://localhost:3000`

## Available Scripts

```bash
# Development server (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## Key Components

### Authentication
- **LoginPage**: Admin login with JWT token management
- **ProtectedRoute**: Route guard for authenticated routes
- **AuthContext**: Global auth state management

### Layout
- **Sidebar**: Navigation menu (collapsible on mobile)
- **Navbar**: Top navigation bar with user menu
- **MainLayout**: Main layout wrapper

### Pages
- **Dashboard**: Overview with stats and charts
- **Orders**: Order list, filtering, and management
- **Customers**: Customer profiles and details
- **Staff**: Staff management and assignments
- **Inventory**: Stock tracking and management

### Reusable Components
- **Button**: Primary, secondary, danger, success variants
- **Card**: Card components with header and body
- **StatCard**: Stats display cards
- **DataTable**: Sortable, filterable data table
- **Badge**: Status badges
- **Loading/EmptyState/ErrorState**: UI states

## API Integration

The dashboard connects to the existing backend API with endpoints:

- `POST /auth/login` - Admin login
- `GET /orders` - List all orders
- `PUT /orders/:id/status` - Update order status
- `GET /customers` - List customers
- `GET /staff` - List staff members
- `POST /staff` - Create staff
- `DELETE /staff/:id` - Delete staff
- `GET /inventory` - List inventory items

All API calls include JWT token authentication via axios interceptor.

## Styling

The dashboard uses Tailwind CSS with custom color scheme matching the existing mobile app:

- Primary: `#0284C7` (Sky Blue)
- Dark: `#0C4A6E` (Deep Ocean)
- Light: `#38BDF8` (Light Blue)
- Success: `#0EA5E9`
- Warning: `#F59E0B`
- Error: `#EF4444`

## State Management

- **Auth**: Context API + localStorage
- **Data**: Component state + custom hooks
- **Forms**: Component state (easily extendable to Zustand/Redux)

## Error Handling

- API errors are caught and displayed to users
- 401 errors trigger logout and redirect to login
- Form validation with user feedback
- Loading and empty states

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting with React Router
- Lazy loading of routes
- Optimized bundle size (~50KB gzipped)
- Local storage for auth token
- Responsive images

## Future Enhancements

- [ ] Real-time notifications (WebSocket)
- [ ] Export data to CSV/PDF
- [ ] Advanced filtering and search
- [ ] Dashboard customization
- [ ] Role-based access control
- [ ] Audit logs
- [ ] Performance analytics
- [ ] Dark mode support

## Contributing

This is a standalone frontend project. Ensure:
- TypeScript strict mode enabled
- All components are fully typed
- Components are reusable and documented
- Tailwind classes are used consistently

## License

MIT - See LICENSE file for details

## Support

For issues or questions, check:
- Backend API health: `http://localhost:5000/api/health`
- Browser console for errors
- Network tab for failed requests
