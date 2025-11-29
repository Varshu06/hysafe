import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  date: Date;
  totalCans: number;
  deliveredCans: number;
  pendingCans: number;
  returnedCans: number;
  notes?: string;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    totalCans: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveredCans: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingCans: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnedCans: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

InventorySchema.index({ date: -1 });

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);

