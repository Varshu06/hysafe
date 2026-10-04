import mongoose, { Document, Schema } from 'mongoose';

export interface IStaff extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  isOnline: boolean;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  vehicleType?: string;
  fcmToken?: string;
  cansInHand: number; // Number of cans currently with the driver
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
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
    phone: {
      type: String,
      required: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    vehicleType: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    cansInHand: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);



