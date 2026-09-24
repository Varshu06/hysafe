// User and Auth types
export type UserRole = 'admin' | 'staff' | 'customer';

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
  | 'pending'
  | 'accepted'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  _id: string;
  id?: string;
  customerId: string;
  customerName: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: 'offline' | 'cash' | 'shop';
  isRecurring?: boolean;
  recurringDeliveryId?: string;
  recurringBillId?: string;
  items?: { productName: string; quantity: number; price: number }[];
  paymentStatus: 'pending' | 'paid' | 'failed';
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

export interface RecurringCustomer { _id: string; name?: string; phone?: string; email?: string; }
export interface RecurringDelivery {
  _id: string; customerId: RecurringCustomer | string; productId: string; productName: string;
  quantity: number; frequency: string; deliveryDays?: number[]; startDate: string; endDate?: string;
  isActive: boolean; status?: 'active' | 'paused' | 'cancelled'; paymentTerms: string; billingFrequency?: string; nextDeliveryDate?: string; offlinePaymentMethod?: 'cash' | 'shop';
  deliveryAddress?: string; createdAt: string;
}
export type RecurringBillStatus = 'pending' | 'confirmed' | 'paid' | 'overdue';
export interface RecurringBill {
  _id: string; customerId: RecurringCustomer | string;
  recurringDeliveryId: (Partial<RecurringDelivery> & { _id: string }) | string;
  orderIds: unknown[]; billingFrequency: string; periodStart: string; periodEnd: string; dueDate: string;
  scheduledDeliveryDates: string[]; productName: string; quantityPerDelivery: number; deliveryCount: number;
  amount: number; status: RecurringBillStatus; paymentMethod?: 'cash' | 'shop'; preferredPaymentMethod?: 'cash' | 'shop'; paymentAmount?: number;
  paidAt?: string; paidBy?: RecurringCustomer; confirmedAt?: string;
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
  customerType: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  paymentTerms: 'one-time' | 'monthly' | 'weekly';
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
  quantity: number;
  unit: string;
  minStock: number;
  price: number;
  image?: string;
  lastRestocked: Date;
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
