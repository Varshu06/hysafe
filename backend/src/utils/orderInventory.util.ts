import mongoose, { ClientSession } from 'mongoose';
import { InventoryItem } from '../models/InventoryItem.model';

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const validateStatusTransition = (currentStatus: string, targetStatus: string): boolean => {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Atomically reserve stock for an order's items.
 * Strictly uses InventoryItem._id (no fallbacks).
 * Rejects if any product ID is invalid, missing, unavailable, or lacks sufficient stock.
 */
export const reserveInventoryAtomic = async (
  items: { productId: any; quantity: number }[],
  session?: ClientSession | null
): Promise<void> => {
  for (const item of items) {
    const qty = Number(item.quantity);
    const productIdStr = String(item.productId || '').trim();

    if (!productIdStr || !mongoose.Types.ObjectId.isValid(productIdStr)) {
      throw new Error(`Invalid or missing product ID: ${item.productId}`);
    }

    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Item quantity must be a positive integer: ${qty}`);
    }

    const query = { _id: productIdStr, available: true, quantity: { $gte: qty } };
    const update = { $inc: { quantity: -qty } };
    const options = { new: true, ...(session ? { session } : {}) };

    const updated = await InventoryItem.findOneAndUpdate(query, update, options);

    if (!updated) {
      const existingItem = await InventoryItem.findById(productIdStr);
      if (!existingItem) {
        throw new Error(`Product not found with ID: ${productIdStr}`);
      }
      if (!existingItem.available) {
        throw new Error(`Product "${existingItem.name}" is currently unavailable`);
      }
      throw new Error(
        `Insufficient stock for "${existingItem.name}". Requested: ${qty}, Available: ${existingItem.quantity}`
      );
    }
  }
};

/**
 * Atomically restore stock when an order is cancelled.
 * Strictly uses InventoryItem._id (no name/first-word fallbacks).
 */
export const restoreInventoryAtomic = async (
  items: { productId: any; quantity: number }[],
  session?: ClientSession | null
): Promise<void> => {
  for (const item of items) {
    const qty = Number(item.quantity);
    const productIdStr = String(item.productId || '').trim();

    if (!productIdStr || !mongoose.Types.ObjectId.isValid(productIdStr) || !Number.isInteger(qty) || qty < 1) {
      continue;
    }

    const query = { _id: productIdStr };
    const update = { $inc: { quantity: qty } };
    const options = session ? { session } : {};

    await InventoryItem.findOneAndUpdate(query, update, options);
  }
};
