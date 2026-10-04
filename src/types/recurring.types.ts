export type RecurringFrequency = 'daily' | '2_per_week' | '3_per_week';

export interface RecurringDeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number;
  deliveryCharge?: number;
  volume?: string;
}

export interface RecurringDelivery {
  _id?: string;
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number; // total cans
  frequency: RecurringFrequency;
  deliveryDays?: number[];
  startDate: Date;
  endDate?: Date; // Optional end date
  isActive: boolean;
  status?: 'active' | 'paused' | 'cancelled';
  billingFrequency: 'per_order' | 'weekly' | 'monthly';
  deliveryAddress: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  nextDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringDeliverySchedule {
  recurringDeliveryId: string;
  deliveryDate: Date;
  orderId?: string; // If order is already created
  status: 'pending' | 'scheduled' | 'delivered' | 'cancelled';
}

