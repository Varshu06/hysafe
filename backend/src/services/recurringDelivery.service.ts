import mongoose from 'mongoose';
import { RecurringDelivery, IRecurringDelivery, RecurringFrequency } from '../models/RecurringDelivery.model';
import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { InventoryItem } from '../models/InventoryItem.model';
import { emitNewOrder } from './socket.service';
import { sendNotificationToStaff } from './notification.service';

/**
 * Calculates the next delivery date based on current date and frequency
 */
export const calculateNextDeliveryDate = (
  baseDate: Date = new Date(),
  frequency: RecurringFrequency
): Date => {
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case '3-per-week':
      // 3 deliveries per week: approx every 2 days
      nextDate.setDate(nextDate.getDate() + 2);
      break;
    case '2-per-week':
      // 2 deliveries per week: approx every 3 days
      nextDate.setDate(nextDate.getDate() + 3);
      break;
    case 'every-2-days':
      nextDate.setDate(nextDate.getDate() + 2);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'custom':
    default:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
  }

  return nextDate;
};

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  ordersCreated: string[];
  errors: { deliveryId: string; error: string }[];
}

/**
 * Checks for all active recurring deliveries that are due and creates orders for them.
 */
export const processDueRecurringDeliveries = async (): Promise<ProcessResult> => {
  const now = new Date();
  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    ordersCreated: [],
    errors: [],
  };

  try {
    // Find active subscriptions where nextDeliveryDate <= now
    const dueDeliveries = await RecurringDelivery.find({
      isActive: true,
      nextDeliveryDate: { $lte: now },
    });

    result.processed = dueDeliveries.length;
    if (dueDeliveries.length === 0) {
      return result;
    }

    console.log(`[RecurringService] Processing ${dueDeliveries.length} due recurring deliveries...`);

    for (const delivery of dueDeliveries) {
      try {
        // 1. Verify user exists
        const user = await User.findById(delivery.customerId);
        if (!user) {
          console.warn(`[RecurringService] Customer ${delivery.customerId} not found. Deactivating delivery.`);
          delivery.isActive = false;
          await delivery.save();
          result.failed += 1;
          result.errors.push({
            deliveryId: delivery._id.toString(),
            error: 'Customer account not found',
          });
          continue;
        }

        const profile = await CustomerProfile.findOne({ userId: delivery.customerId });

        // 2. Build order items (support both multiple items and single item)
        let orderItems: any[] = [];
        let totalItemsPrice = 0;
        let maxDeliveryCharge = 0;
        let totalOrderQty = 0;

        if (delivery.items && delivery.items.length > 0) {
          for (const it of delivery.items) {
            let invItem: any = null;
            if (mongoose.Types.ObjectId.isValid(it.productId)) {
              invItem = await InventoryItem.findById(it.productId);
            }
            const pPrice = Number(it.price || invItem?.price || 80);
            const pDeliv = Number(it.deliveryCharge ?? invItem?.deliveryCharge ?? 0);
            if (pDeliv > maxDeliveryCharge) maxDeliveryCharge = pDeliv;
            const pQty = Number(it.quantity) || 1;
            totalOrderQty += pQty;
            totalItemsPrice += pPrice * pQty;

            const resId = invItem
              ? invItem._id
              : mongoose.Types.ObjectId.isValid(it.productId)
              ? new mongoose.Types.ObjectId(it.productId)
              : new mongoose.Types.ObjectId();

            orderItems.push({
              productId: resId,
              productName: it.productName || invItem?.name || 'Water Item',
              quantity: pQty,
              price: pPrice,
              deliveryCharge: pDeliv,
            });
          }
        } else {
          let inventoryItem: any = null;
          if (mongoose.Types.ObjectId.isValid(delivery.productId)) {
            inventoryItem = await InventoryItem.findById(delivery.productId);
          }

          const itemPrice = Number(inventoryItem?.price ?? 80);
          const itemDeliveryCharge = Number(inventoryItem?.deliveryCharge ?? 0);
          maxDeliveryCharge = itemDeliveryCharge;
          totalOrderQty = delivery.quantity;
          totalItemsPrice = itemPrice * delivery.quantity;

          const resolvedProductId = inventoryItem
            ? inventoryItem._id
            : mongoose.Types.ObjectId.isValid(delivery.productId)
            ? new mongoose.Types.ObjectId(delivery.productId)
            : new mongoose.Types.ObjectId();

          orderItems = [
            {
              productId: resolvedProductId,
              productName: delivery.productName || inventoryItem?.name || 'Water Can',
              quantity: delivery.quantity,
              price: itemPrice,
              deliveryCharge: itemDeliveryCharge,
            },
          ];
        }

        const totalPrice = totalItemsPrice + maxDeliveryCharge;

        // 3. Create the automated order
        const order = await Order.create({
          customerId: delivery.customerId,
          customerProfileId: profile?._id,
          quantity: totalOrderQty,
          items: orderItems,
          totalPrice,
          price: totalPrice,
          deliveryCharge: maxDeliveryCharge,
          status: 'pending',
          paymentMethod: 'offline',
          paymentStatus: 'pending',
          deliveryAddress: delivery.deliveryAddress,
          deliverySlot: delivery.nextDeliveryDate || now,
          isRecurring: true,
          recurringDeliveryId: delivery._id,
          notes: delivery.specialInstructions
            ? `Recurring Delivery: ${delivery.specialInstructions}`
            : 'Automated recurring delivery order',
          receiverName: profile?.name || user.name,
          receiverPhone: user.phone,
          paymentTerms: delivery.paymentTerms || profile?.paymentTerms || 'one-time',
        });

        // 4. Notify staff & emit socket event
        const populatedOrder = await Order.findById(order._id).populate(
          'customerId',
          'name phone'
        );

        if (populatedOrder) {
          emitNewOrder(populatedOrder);
          await sendNotificationToStaff(populatedOrder).catch((err) => {
            console.error('[RecurringService] Staff notification failed:', err);
          });
        }

        // 5. Advance next delivery date
        const baseDate = delivery.nextDeliveryDate && delivery.nextDeliveryDate > now
          ? delivery.nextDeliveryDate
          : now;

        const nextDate = calculateNextDeliveryDate(baseDate, delivery.frequency);

        // If subscription has an endDate and nextDate exceeds it, deactivate
        if (delivery.endDate && nextDate > delivery.endDate) {
          delivery.isActive = false;
          console.log(`[RecurringService] Delivery ${delivery._id} has reached its endDate. Deactivated.`);
        } else {
          delivery.nextDeliveryDate = nextDate;
        }

        await delivery.save();

        result.succeeded += 1;
        result.ordersCreated.push(order._id.toString());
        console.log(`[RecurringService] Created order ${order._id} for delivery ${delivery._id}. Next delivery: ${delivery.nextDeliveryDate}`);
      } catch (itemErr: any) {
        console.error(`[RecurringService] Error processing delivery ${delivery._id}:`, itemErr);
        result.failed += 1;
        result.errors.push({
          deliveryId: delivery._id.toString(),
          error: itemErr.message || 'Processing failed',
        });
      }
    }
  } catch (error: any) {
    console.error('[RecurringService] Fatal error in processDueRecurringDeliveries:', error);
  }

  return result;
};

let schedulerInterval: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;

/**
 * Starts the recurring delivery background scheduler
 */
export const startRecurringDeliveryScheduler = (intervalMs: number = 60 * 60 * 1000): void => {
  if (schedulerInterval) {
    console.log('[RecurringService] Scheduler is already running.');
    return;
  }

  console.log('[RecurringService] Starting recurring delivery scheduler (interval: 1 hour)...');

  // Run first check after a brief startup delay (10 seconds)
  initialTimeout = setTimeout(() => {
    processDueRecurringDeliveries().catch((err) => {
      console.error('[RecurringService] Initial processing failed:', err);
    });
  }, 10000);

  // Then schedule periodically
  schedulerInterval = setInterval(() => {
    processDueRecurringDeliveries().catch((err) => {
      console.error('[RecurringService] Periodic processing failed:', err);
    });
  }, intervalMs);
};

/**
 * Stops the recurring delivery background scheduler
 */
export const stopRecurringDeliveryScheduler = (): void => {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[RecurringService] Stopped recurring delivery scheduler.');
  }
};
