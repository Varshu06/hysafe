import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  customerType: 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  paymentTerms: 'one-time' | 'weekly' | 'monthly';
  defaultPaymentMethod: 'online' | 'offline';
  nextPaymentDue?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      default: 'Address not provided',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    customerType: {
      type: String,
      enum: ['home', 'shop', 'hotel', 'bank', 'event'],
      default: 'home',
    },
    paymentTerms: {
      type: String,
      enum: ['one-time', 'weekly', 'monthly'],
      default: 'one-time',
    },
    defaultPaymentMethod: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    nextPaymentDue: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerProfile = mongoose.model<ICustomerProfile>(
  'CustomerProfile',
  CustomerProfileSchema
);

