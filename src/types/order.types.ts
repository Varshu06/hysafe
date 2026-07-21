export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  deliveryCharge: number;
}

export interface Order {
  _id: string;
  customer?: string;
  quantity: number;
  items: OrderItem[];
  totalPrice?: number; // Backend uses totalPrice, frontend used price
  price?: number; // detailed UI uses price
  status: OrderStatus;
  paymentMethod: "online" | "offline";
  paymentStatus?: "pending" | "paid" | "failed";
  deliveryAddress: string;
  pickupAddress?: string; // Admin/Staff might see this, or derived from system
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  deliverySlot?: string;
  staffId?: string;
  assignedStaffId?: string;
  driverName?: string; // Delivery person's name
  assignedStaff?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}
