import mongoose, { Document, Schema } from "mongoose";

export interface IInventoryItem extends Document {
  name: string;
  volume: string;
  quantity: number;
  price: number;
  deliveryCharge: number;
  image?: string;
  available: boolean;
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

    volume: {
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

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
    },

    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

InventoryItemSchema.index({ volume: 1 }, { unique: true });

export const InventoryItem = mongoose.model<IInventoryItem>(
  "InventoryItem",
  InventoryItemSchema,
);
