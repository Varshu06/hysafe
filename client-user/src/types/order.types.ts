export type OrderStatus = 'pending' | 'accepted' | 'picked' | 'transit' | 'delivered' | 'missed' | 'cancelled';
export type PaymentMethod = 'online' | 'offline';

export interface Order {
  _id: string;
  customerId: string;
  customerProfileId: string;
  quantity: number;
  pickupAddress: string;
  deliveryAddress: string;
  deliverySlot?: string;
  status: OrderStatus;
  assignedStaffId?: string;
  price?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  deliveredAt?: string;
}

