import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringDelivery } from '../models/RecurringDelivery.model';
import {
  calculateNextDeliveryDate,
  processDueRecurringDeliveries,
} from '../services/recurringDelivery.service';

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
      startDate: requestedStartDate,
      endDate: requestedEndDate,
    } = req.body;

    // Validation
    if (!productId || !productName || !quantity || !frequency || !deliveryAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const startDate = requestedStartDate ? new Date(requestedStartDate) : new Date();
    const endDate = requestedEndDate ? new Date(requestedEndDate) : undefined;

    // Calculate initial next delivery date
    const nextDeliveryDate = calculateNextDeliveryDate(startDate, frequency);

    const recurringDelivery = await RecurringDelivery.create({
      customerId: userId,
      productId,
      productName,
      quantity,
      frequency,
      startDate,
      endDate,
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

// Update recurring delivery (modify settings, pause, resume)
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

    // Handle frequency change
    if (updateData.frequency && updateData.frequency !== recurringDelivery.frequency) {
      updateData.nextDeliveryDate = calculateNextDeliveryDate(
        new Date(),
        updateData.frequency
      );
    }

    // Handle resume (inactive -> active)
    if (updateData.isActive === true && !recurringDelivery.isActive) {
      const freq = updateData.frequency || recurringDelivery.frequency;
      updateData.nextDeliveryDate = calculateNextDeliveryDate(new Date(), freq);
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
    const isPermanent = req.query.permanent === 'true';

    const recurringDelivery = await RecurringDelivery.findOne({ _id: id, customerId: userId });

    if (!recurringDelivery) {
      return res.status(404).json({ message: 'Recurring delivery not found' });
    }

    if (isPermanent) {
      await RecurringDelivery.deleteOne({ _id: id });
      return res.json({ message: 'Recurring delivery deleted permanently' });
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

// Manually process due recurring deliveries (can be called by cron/admin/hooks)
export const processDueDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const result = await processDueRecurringDeliveries();
    res.json({
      message: `Processed ${result.processed} recurring deliveries (${result.succeeded} orders created, ${result.failed} failed)`,
      result,
    });
  } catch (error: any) {
    console.error('Error in manual processDueDeliveries:', error);
    res.status(500).json({ message: error.message || 'Failed to process recurring deliveries' });
  }
};
