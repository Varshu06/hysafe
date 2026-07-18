// User and Auth types
export type UserRole = "admin" | "staff" | "customer";

export interface User {
  id: string;
  _id?: string;
  email: string;
  phone: string;
  role: UserRole;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

// Order types
export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  _id: string;
  id?: string;
  customerId: string;
  customerName: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: "online" | "offline";
  paymentStatus: "pending" | "paid" | "failed";
  deliveryAddress: string;
  notes?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  deliverySlot?: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
}

// Customer types
export interface CustomerProfile {
  _id: string;
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: "home" | "shop" | "hotel" | "bank" | "event";
  paymentTerms: "one-time" | "monthly" | "weekly";
  createdAt: Date;
  updatedAt: Date;
}

// Staff types
export interface Staff {
  _id: string;
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  isOnline: boolean;
  assignedOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory types
export interface InventoryItem {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  image?: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  activeDeliveries: number;
}

// Chart data
export interface ChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}
