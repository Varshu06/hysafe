import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginActivity extends Document {
  userId: mongoose.Types.ObjectId;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  loginAt: Date;
  createdAt: Date;
}

const LoginActivitySchema = new Schema<ILoginActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceInfo: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    loginAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
LoginActivitySchema.index({ userId: 1, loginAt: -1 });

export const LoginActivity = mongoose.model<ILoginActivity>('LoginActivity', LoginActivitySchema);



