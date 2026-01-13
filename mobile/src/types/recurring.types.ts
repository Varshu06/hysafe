export type RecurringFrequency = 'daily' | 'every-2-days' | 'weekly' | 'custom';

export interface RecurringDelivery {
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  quantity: number; // e.g., 20 cans
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date; // Optional end date
  isActive: boolean;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
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


