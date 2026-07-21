import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringDelivery } from '../models/RecurringDelivery.model';

// Create recurring delivery
export const createRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      productId,
      productName,
      quantity,
      frequency,
      deliveryAddress,
      deliveryAddressId,
      paymentTerms,
      specialInstructions,
    } = req.body;

    // Validation
    if (!productId || !productName || !quantity || !frequency || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    // Calculate next delivery date based on frequency
    const startDate = new Date();
    let nextDeliveryDate = new Date();
    
    switch (frequency) {
      case 'daily':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
        break;
      case 'every-2-days':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 2);
        break;
      case 'weekly':
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
        break;
      default:
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    }

    const recurringDelivery = await RecurringDelivery.create({
      customerId: userId,
      productId,
      productName,
      quantity,
      frequency,
      startDate,
      isActive: true,
      paymentTerms: paymentTerms || 'one-time',
      deliveryAddress,
      deliveryAddressId,
      specialInstructions,
      nextDeliveryDate,
    });

    res.status(201).json({
      message: 'Recurring delivery created successfully',
      recurringDelivery,
    });
  } catch (error: any) {
    console.error('Error creating recurring delivery:', error);
    res.status(500).json({ message: error.message || 'Failed to create recurring delivery' });
  }
};

// Get all recurring deliveries for user
export const getRecurringDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const recurringDeliveries = await RecurringDelivery.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ recurringDeliveries });
  } catch (error: any) {
    console.error('Error fetching recurring deliveries:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch recurring deliveries' });
  }
};

// Update recurring delivery
export const updateRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const recurringDelivery = await RecurringDelivery.findOne({ _id: id, customerId: userId });

    if (!recurringDelivery) {
      return res.status(404).json({ message: 'Recurring delivery not found' });
    }

    // Update next delivery date if frequency changed
    if (updateData.frequency && updateData.frequency !== recurringDelivery.frequency) {
      const nextDeliveryDate = new Date();
      switch (updateData.frequency) {
        case 'daily':
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
          break;
        case 'every-2-days':
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 2);
          break;
        case 'weekly':
          nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
          break;
      }
      updateData.nextDeliveryDate = nextDeliveryDate;
    }

    Object.assign(recurringDelivery, updateData);
    await recurringDelivery.save();

    res.json({
      message: 'Recurring delivery updated successfully',
      recurringDelivery,
    });
  } catch (error: any) {
    console.error('Error updating recurring delivery:', error);
    res.status(500).json({ message: error.message || 'Failed to update recurring delivery' });
  }
};

// Delete/deactivate recurring delivery
export const deleteRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;

    const recurringDelivery = await RecurringDelivery.findOne({ _id: id, customerId: userId });

    if (!recurringDelivery) {
      return res.status(404).json({ message: 'Recurring delivery not found' });
    }

    // Deactivate instead of deleting
    recurringDelivery.isActive = false;
    await recurringDelivery.save();

    res.json({ message: 'Recurring delivery deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting recurring delivery:', error);
    res.status(500).json({ message: error.message || 'Failed to delete recurring delivery' });
  }
};



