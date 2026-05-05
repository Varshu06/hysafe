import mongoose, { Document, Schema } from 'mongoose';

export type RecurringFrequency = 'daily' | 'every-2-days' | 'weekly' | 'custom';

export interface IRecurringDelivery extends Document {
  customerId: mongoose.Types.ObjectId;
  productId: string;
  productName: string;
  quantity: number;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  deliveryAddress: string;
  deliveryAddressId?: string;
  specialInstructions?: string;
  nextDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringDeliverySchema = new Schema<IRecurringDelivery>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    frequency: {
      type: String,
      enum: ['daily', 'every-2-days', 'weekly', 'custom'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentTerms: {
      type: String,
      enum: ['one-time', 'weekly', 'monthly'],
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryAddressId: {
      type: String,
    },
    specialInstructions: {
      type: String,
    },
    nextDeliveryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const RecurringDelivery = mongoose.model<IRecurringDelivery>(
  'RecurringDelivery',
  RecurringDeliverySchema
);




