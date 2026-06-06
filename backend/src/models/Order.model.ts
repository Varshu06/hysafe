import mongoose, { Document, Schema } from "mongoose";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface IOrder extends Document {
  customerId: mongoose.Types.ObjectId;
  customerProfileId?: mongoose.Types.ObjectId;
  quantity: number;
  totalPrice: number;
  price: number;
  status: OrderStatus;
  paymentMethod: "online" | "offline";
  paymentStatus: "pending" | "paid" | "failed";
  deliveryAddress: string;
  pickupAddress?: string;
  location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  assignedStaffId?: mongoose.Types.ObjectId;
  deliverySlot?: Date;
  isEventOrder?: boolean;
  eventName?: string;
  receiverName?: string;
  receiverPhone?: string;
  paymentTerms?: "one-time" | "weekly" | "monthly";
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  transactionId?: string;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerProfile",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    pickupAddress: {
      type: String,
      default: "Hy-Safe Plant, 12 Industrial Rd, Chennai",
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    notes: {
      type: String,
    },
    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    deliverySlot: {
      type: Date,
    },
    isEventOrder: {
      type: Boolean,
      default: false,
    },
    eventName: {
      type: String,
    },
    receiverName: {
      type: String,
    },
    receiverPhone: {
      type: String,
    },
    paymentTerms: {
      type: String,
      enum: ["one-time", "weekly", "monthly"],
    },
    acceptedAt: {
      type: Date,
    },
    outForDeliveryAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ assignedStaffId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
