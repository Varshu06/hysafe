import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  customerType: 'regular' | 'home' | 'shop' | 'hotel' | 'bank' | 'event';
  paymentTerms: 'one-time' | 'monthly' | 'weekly' | 'custom';
  defaultPaymentMethod: 'online' | 'offline';
  fcmToken?: string;
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
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    customerType: {
      type: String,
      enum: ['regular', 'home', 'shop', 'hotel', 'bank', 'event'],
      default: 'regular',
    },
    paymentTerms: {
      type: String,
      enum: ['one-time', 'monthly', 'weekly', 'custom'],
      default: 'one-time',
    },
    defaultPaymentMethod: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    fcmToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

CustomerProfileSchema.index({ userId: 1 });

export const CustomerProfile = mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);

