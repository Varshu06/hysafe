import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  totalStock: number; // Total cans in factory
  availableStock: number; // Available for new orders
  reservedStock: number; // Reserved for accepted/out_for_delivery orders
  deliveredStock: number; // Total delivered (for tracking)
  lowStockThreshold: number; // Alert when below this
  lastUpdated: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    totalStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    deliveredStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Note: We'll ensure only one inventory document exists at the application level

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);

