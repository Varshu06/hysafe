import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringDelivery } from '../models/RecurringDelivery.model';
import { calculateNextDeliveryDate, getOrCreateInitialRecurringBill, processDueRecurringDeliveries } from '../services/recurringDelivery.service';
import { getFirstScheduledDeliveryOnOrAfter, normalizeBillingFrequency, normalizeFrequency, validateDeliveryDays } from '../services/recurringBilling.service';

const serverControlledFields = new Set(['items', 'billAmount', 'paymentMethod', 'paymentStatus', 'confirmationStatus', 'paidAt', 'paidBy', 'status', 'recurringBillId', 'nextDeliveryDate']);
const paymentTermsFor = (frequency: 'per_order' | 'weekly' | 'monthly') => frequency === 'per_order' ? 'one-time' : frequency;

const validateSchedule = (frequencyInput: string, deliveryDays?: number[]) => {
  const frequency = normalizeFrequency(frequencyInput);
  if (!frequency) return { error: 'Frequency must be daily, 2_per_week, or 3_per_week' };
  const error = validateDeliveryDays(frequency, deliveryDays);
  return error ? { error } : { frequency };
};

export const createRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { productId, productName, quantity, frequency: frequencyInput, deliveryDays, deliveryAddress, deliveryAddressId, billingFrequency: inputBillingFrequency, paymentTerms, paymentMethod, specialInstructions, startDate: requestedStartDate, endDate: requestedEndDate, items } = req.body;
    if (Array.isArray(items) && items.length > 0) return res.status(400).json({ message: 'Recurring plans support one product only; items is not accepted' });
    if (!productId || !productName || !quantity || !frequencyInput || !deliveryAddress) return res.status(400).json({ message: 'Missing required fields' });
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return res.status(400).json({ message: 'Quantity must be a positive whole number' });
    const schedule = validateSchedule(frequencyInput, deliveryDays);
    if ('error' in schedule) return res.status(400).json({ message: schedule.error });
    const billingFrequency = normalizeBillingFrequency(inputBillingFrequency || paymentTerms);
    if (!billingFrequency) return res.status(400).json({ message: 'Billing frequency must be per_order, weekly, or monthly' });
    if (paymentMethod !== 'cash' && paymentMethod !== 'shop') return res.status(400).json({ message: 'Payment method must be cash or shop' });
    const startDate = requestedStartDate ? new Date(requestedStartDate) : new Date();
    const endDate = requestedEndDate ? new Date(requestedEndDate) : undefined;
    if (Number.isNaN(startDate.getTime()) || (endDate && (Number.isNaN(endDate.getTime()) || endDate < startDate))) return res.status(400).json({ message: 'Invalid plan dates' });

    const recurringDelivery = await RecurringDelivery.create({
      customerId: userId, productId, productName, quantity: Number(quantity), frequency: schedule.frequency,
      deliveryDays: schedule.frequency === 'daily' ? undefined : deliveryDays, startDate, endDate, isActive: true,
      billingFrequency, paymentTerms: paymentTermsFor(billingFrequency), deliveryAddress, deliveryAddressId, offlinePaymentMethod: paymentMethod, specialInstructions,
      nextDeliveryDate: getFirstScheduledDeliveryOnOrAfter(startDate, schedule.frequency, deliveryDays),
      // Legacy display fields are deliberately not used for billing calculations.
      deliveryCount: 1, billAmount: 0, paymentMethod: 'offline', paymentStatus: 'pending', confirmationStatus: 'pending',
    });
    const recurringBill = await getOrCreateInitialRecurringBill(recurringDelivery);
    processDueRecurringDeliveries().catch((err) => console.error('[RecurringController] Order generation failed:', err));
    res.status(201).json({ message: 'Recurring delivery created successfully', recurringDelivery, recurringBill });
  } catch (error: any) {
    console.error('Error creating recurring delivery:', error);
    res.status(500).json({ message: error.message || 'Failed to create recurring delivery' });
  }
};

export const getRecurringDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const recurringDeliveries = await RecurringDelivery.find({ customerId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json({ recurringDeliveries });
  } catch (error: any) { res.status(500).json({ message: error.message || 'Failed to fetch recurring deliveries' }); }
};

// This is deliberately admin-only. Customers continue to receive only their own plans.
export const getAllRecurringDeliveries = async (_req: AuthRequest, res: Response) => {
  try {
    const recurringDeliveries = await RecurringDelivery.find()
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ recurringDeliveries });
  } catch (error: any) { res.status(500).json({ message: error.message || 'Failed to fetch recurring deliveries' }); }
};

export const updateRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const prohibited = Object.keys(req.body).filter((key) => serverControlledFields.has(key));
    if (prohibited.length) return res.status(403).json({ message: `Server-controlled fields cannot be changed: ${prohibited.join(', ')}` });
    const recurringDelivery = await RecurringDelivery.findOne({ _id: req.params.id, customerId: req.user!._id });
    if (!recurringDelivery) return res.status(404).json({ message: 'Recurring delivery not found' });
    const allowed = ['productId', 'productName', 'quantity', 'frequency', 'deliveryDays', 'deliveryAddress', 'deliveryAddressId', 'billingFrequency', 'paymentTerms', 'specialInstructions', 'isActive', 'startDate', 'endDate'];
    const updateData = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key))) as Record<string, any>;
    if (updateData.quantity !== undefined && (!Number.isInteger(Number(updateData.quantity)) || Number(updateData.quantity) < 1)) return res.status(400).json({ message: 'Quantity must be a positive whole number' });
    const scheduleChanged = updateData.frequency !== undefined || updateData.deliveryDays !== undefined;
    let normalizedFrequency = normalizeFrequency(updateData.frequency || recurringDelivery.frequency);
    if (scheduleChanged) {
      if (!normalizedFrequency) return res.status(400).json({ message: 'Frequency must be daily, 2_per_week, or 3_per_week' });
      const days = updateData.deliveryDays === undefined ? recurringDelivery.deliveryDays : updateData.deliveryDays;
      const validationError = validateDeliveryDays(normalizedFrequency, days);
      if (validationError) return res.status(400).json({ message: validationError });
      updateData.frequency = normalizedFrequency;
      updateData.deliveryDays = normalizedFrequency === 'daily' ? undefined : days;
    }
    if (updateData.billingFrequency !== undefined || updateData.paymentTerms !== undefined) {
      const billingFrequency = normalizeBillingFrequency(updateData.billingFrequency || updateData.paymentTerms);
      if (!billingFrequency) return res.status(400).json({ message: 'Billing frequency must be per_order, weekly, or monthly' });
      updateData.billingFrequency = billingFrequency;
      updateData.paymentTerms = paymentTermsFor(billingFrequency);
    }
    if (updateData.startDate !== undefined) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate !== undefined) updateData.endDate = new Date(updateData.endDate);
    if ((updateData.startDate && Number.isNaN(updateData.startDate.getTime())) || (updateData.endDate && Number.isNaN(updateData.endDate.getTime()))) return res.status(400).json({ message: 'Invalid plan dates' });
    Object.assign(recurringDelivery, updateData);
    if (scheduleChanged || updateData.startDate || updateData.isActive === true) {
      const validFrequency = normalizedFrequency || normalizeFrequency(recurringDelivery.frequency);
      recurringDelivery.nextDeliveryDate = validFrequency
        ? getFirstScheduledDeliveryOnOrAfter(updateData.startDate || new Date(), validFrequency, recurringDelivery.deliveryDays)
        : calculateNextDeliveryDate(new Date(), recurringDelivery.frequency, recurringDelivery.deliveryDays);
    }
    await recurringDelivery.save();
    res.json({ message: 'Recurring delivery updated successfully', recurringDelivery });
  } catch (error: any) { res.status(500).json({ message: error.message || 'Failed to update recurring delivery' }); }
};

export const deleteRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const recurringDelivery = await RecurringDelivery.findOne({ _id: req.params.id, customerId: req.user!._id });
    if (!recurringDelivery) return res.status(404).json({ message: 'Recurring delivery not found' });
    if (req.query.permanent === 'true') { await RecurringDelivery.deleteOne({ _id: recurringDelivery._id }); return res.json({ message: 'Recurring delivery deleted permanently' }); }
    recurringDelivery.isActive = false;
    await recurringDelivery.save();
    res.json({ message: 'Recurring delivery deactivated successfully' });
  } catch (error: any) { res.status(500).json({ message: error.message || 'Failed to delete recurring delivery' }); }
};

export const processDueDeliveries = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await processDueRecurringDeliveries();
    res.json({ message: `Processed ${result.processed} recurring deliveries (${result.succeeded} orders created, ${result.failed} failed)`, result });
  } catch (error: any) { res.status(500).json({ message: error.message || 'Failed to process recurring deliveries' }); }
};
