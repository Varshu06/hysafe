export type RecurringFrequency = 'daily' | '2-per-week' | '3-per-week' | 'every-2-days' | 'weekly' | 'custom';

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
  items?: RecurringDeliveryItem[];
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date; // Optional end date
  isActive: boolean;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  deliveryAddress: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  nextDeliveryDate?: Date;
  deliveryCount?: number;
  billAmount?: number;
  paymentMethod?: 'offline' | 'online';
  paymentStatus?: 'pending' | 'paid';
  confirmationStatus?: 'confirmed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringDeliverySchedule {
  recurringDeliveryId: string;
  deliveryDate: Date;
  orderId?: string; // If order is already created
  status: 'pending' | 'scheduled' | 'delivered' | 'cancelled';
}


