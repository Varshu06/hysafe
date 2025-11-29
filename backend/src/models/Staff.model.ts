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
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    vehicleType: {
      type: String,
      trim: true,
    },
    fcmToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for online staff queries
StaffSchema.index({ isOnline: 1 });
StaffSchema.index({ userId: 1 });

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);

