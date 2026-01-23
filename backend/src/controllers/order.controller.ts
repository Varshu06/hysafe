import { Response } from 'express';
import { Order } from '../models/Order.model';
import { CustomerProfile } from '../models/CustomerProfile.model';
import { Inventory } from '../models/Inventory.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { emitNewOrder } from '../services/socket.service';
import { sendNotificationToStaff } from '../services/notification.service';

// Create order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      quantity,
      deliveryAddress,
      location,
      paymentMethod,
      notes,
      deliverySlot,
      isEventOrder,
      eventName,
      receiverName,
      receiverPhone,
      paymentTerms,
    } = req.body;

    const customerId = req.user._id;

    // Validation
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // Get customer profile
    const profile = await CustomerProfile.findOne({ userId: customerId });

    // Calculate price (assuming ₹40 per 20L can)
    const pricePerCan = 40;
    const totalPrice = quantity * pricePerCan;

    // Create order
    const order = await Order.create({
      customerId,
      customerProfileId: profile?._id,
      quantity,
      totalPrice,
      price: totalPrice,
      status: 'pending',
      paymentMethod: paymentMethod || profile?.defaultPaymentMethod || 'offline',
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pending',
      deliveryAddress,
      location,
      notes,
      deliverySlot: deliverySlot ? new Date(deliverySlot) : undefined,
      isEventOrder: isEventOrder || false,
      eventName,
      receiverName: receiverName || profile?.name || req.user.name,
      receiverPhone: receiverPhone || req.user.phone,
      paymentTerms: paymentTerms || profile?.paymentTerms || 'one-time',
    });

    // Populate order for socket emission
    const populatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name phone');

    // Emit socket event for new order
    if (populatedOrder) {
      emitNewOrder(populatedOrder);
      // Send push notification to online staff
      await sendNotificationToStaff(populatedOrder);
    }

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
};

// Get my orders (customer)
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .populate('assignedStaffId', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: error.message || 'Failed to get orders' });
  }
};

// Get order by ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('customerId', 'name phone email')
      .populate('assignedStaffId', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has access to this order
    if (req.user.role === 'customer') {
      // Customer can only view their own orders
      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (req.user.role === 'staff') {
      // Staff can view orders assigned to them
      if (order.assignedStaffId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
    }
    // Admin can view any order (no restriction)

    res.json(order);
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({ message: error.message || 'Failed to get order' });
  }
};

// Cancel order (customer)
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order
    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Only allow cancellation if order is pending or accepted
    if (order.status !== 'pending' && order.status !== 'accepted') {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}` 
      });
    }

    // Update order status
    const previousStatus = order.status;
    order.status = 'cancelled';
    await order.save();

    // Update inventory: Release reserved stock if order was accepted (not pending)
    if (previousStatus === 'accepted') {
      await updateInventoryOnOrderCancel(order.quantity);
    }

    res.json({
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel order' });
  }
};

// Helper function to update inventory when order is cancelled (customer cancellation)
async function updateInventoryOnOrderCancel(quantity: number) {
  try {
    const inventory = await Inventory.findOne();
    if (!inventory) return;

    // Release reserved stock back to available
    if (inventory.reservedStock >= quantity) {
      inventory.reservedStock -= quantity;
      inventory.availableStock += quantity;
      inventory.lastUpdated = new Date();
      await inventory.save();
      console.log(`📦 Inventory updated on cancel: Released ${quantity} cans. Available: ${inventory.availableStock}, Reserved: ${inventory.reservedStock}`);
    }
  } catch (error: any) {
    console.error('Error updating inventory on order cancel:', error);
  }
}

