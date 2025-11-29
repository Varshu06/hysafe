import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'pending' | 'accepted' | 'picked' | 'transit' | 'delivered' | 'missed' | 'cancelled';
export type PaymentMethod = 'online' | 'offline';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface IOrder extends Document {
  customerId: mongoose.Types.ObjectId;
  customerProfileId: mongoose.Types.ObjectId;
  quantity: number; // Number of 20L cans
  pickupAddress: string;
  deliveryAddress: string;
  deliverySlot?: Date;
  status: OrderStatus;
  assignedStaffId?: mongoose.Types.ObjectId;
  price?: number; // Set by staff
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerProfile',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliverySlot: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'picked', 'transit', 'delivered', 'missed', 'cancelled'],
      default: 'pending',
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    price: {
      type: Number,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'offline'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    acceptedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ assignedStaffId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

