import { Response } from 'express';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { AuthRequest } from '../types/express.d';

/**
 * Create payment record
 */
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amount, method, transactionId, status } = req.body;
    const { userId, role } = req.user || {};

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check access
    if (role === 'customer' && order.customerId.toString() !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const payment = await Payment.create({
      orderId,
      customerId: order.customerId,
      amount: amount || order.price || 0,
      method: method || order.paymentMethod,
      status: status || 'pending',
      transactionId,
      collectedBy: role === 'staff' ? userId : undefined,
      paidAt: status === 'completed' ? new Date() : undefined,
    });

    // Update order payment status
    order.paymentStatus = payment.status === 'completed' ? 'paid' : 'pending';
    await order.save();

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create payment' });
  }
};

/**
 * Get payments (role-based)
 */
export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, userId } = req.user || {};
    let payments;

    if (role === 'customer') {
      payments = await Payment.find({ customerId: userId })
        .populate('orderId')
        .sort({ createdAt: -1 });
    } else if (role === 'admin') {
      payments = await Payment.find()
        .populate('orderId')
        .populate('customerId', 'email phone')
        .populate('collectedBy', 'email phone')
        .sort({ createdAt: -1 })
        .limit(100);
    } else {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payments' });
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role } = req.user || {};

    if (role !== 'admin' && role !== 'staff') {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    payment.status = status;
    if (status === 'completed') {
      payment.paidAt = new Date();
    }

    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = status === 'completed' ? 'paid' : 'pending';
      await order.save();
    }

    res.json({
      message: 'Payment status updated',
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update payment' });
  }
};

/**
 * Verify online payment (stub for Razorpay/Cashfree)
 */
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, paymentId, signature } = req.body;

    // TODO: Implement actual payment gateway verification
    // This is a stub that always returns success
    // In production, verify with Razorpay/Cashfree API

    const payment = await Payment.findOne({ orderId, transactionId: paymentId });
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Stub verification - always success
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();

    // Update order
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }

    res.json({
      message: 'Payment verified successfully',
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
};




