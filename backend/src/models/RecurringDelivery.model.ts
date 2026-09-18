import mongoose, { Document, Schema } from 'mongoose';

export type RecurringFrequency = 'daily' | '2-per-week' | '3-per-week' | 'every-2-days' | 'weekly' | 'custom';

export interface RecurringDeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number;
  deliveryCharge?: number;
  volume?: string;
}

export interface IRecurringDelivery extends Document {
  customerId: mongoose.Types.ObjectId;
  productId: string;
  productName: string;
  quantity: number;
  items?: RecurringDeliveryItem[];
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
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
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, default: 0 },
        deliveryCharge: { type: Number, default: 0 },
        volume: { type: String },
      },
    ],
    frequency: {
      type: String,
      enum: ['daily', '2-per-week', '3-per-week', 'every-2-days', 'weekly', 'custom'],
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
    deliveryCount: {
      type: Number,
      default: 1,
    },
    billAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['offline', 'online'],
      default: 'offline',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    confirmationStatus: {
      type: String,
      enum: ['confirmed', 'pending'],
      default: 'confirmed',
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




