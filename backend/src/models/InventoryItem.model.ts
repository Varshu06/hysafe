import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  price: number;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'pcs',
    },
    minStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastRestocked: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

InventoryItemSchema.index({ name: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>(
  'InventoryItem',
  InventoryItemSchema
);
