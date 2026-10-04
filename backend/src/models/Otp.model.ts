import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  identifier: string; // Phone or Email
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  isVerified: boolean;
}

const OtpSchema: Schema = new Schema({
  identifier: {
    type: String,
    required: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Automatically expire document from MongoDB after 10 minutes (600s)
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);

