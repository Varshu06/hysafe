import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  identifier: string; // Phone or Email
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema: Schema = new Schema({
  identifier: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
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
});

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
