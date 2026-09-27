import { createHash } from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringDelivery } from '../models/RecurringDelivery.model';
import { RecurringBill } from '../models/RecurringBill.model';
import { Notification } from '../models/Notification.model';
import { assertRecurringDeliveryStock, calculateNextDeliveryDate, getOrCreateInitialRecurringBill, getTrustedInventoryItem, getTrustedInventoryPrice, processDueRecurringDeliveries } from '../services/recurringDelivery.service';
import { calculateRecurringBill, getFirstScheduledDeliveryOnOrAfter, normalizeBillingFrequency, normalizeFrequency, validateDeliveryDays } from '../services/recurringBilling.service';

const serverControlledFields = new Set(['items', 'billAmount', 'paymentMethod', 'paymentStatus', 'confirmationStatus', 'paidAt', 'paidBy', 'status', 'recurringBillId', 'nextDeliveryDate']);
const paymentTermsFor = (frequency: 'per_order' | 'weekly' | 'monthly') => frequency === 'per_order' ? 'one-time' : frequency;
const initialBillPendingResponse = (res: Response, planId: string, error: unknown) => {
  const failure = error as { name?: string; code?: string | number };
  console.error('[RecurringController] Initial recurring bill is pending recovery', {
    operation: 'initial_bill_creation',
    planId,
    errorName: failure?.name || 'Error',
    errorCode: failure?.code,
  });
  return res.status(503).json({
    code: 'INITIAL_RECURRING_BILL_PENDING',
    retryable: true,
    recurringDeliveryId: planId,
    message: 'Your recurring plan is saved, but its first bill is still being prepared. Please confirm again to safely retry.',
  });
};

const validateSchedule = (frequencyInput: string, deliveryDays?: number[]) => {
  const frequency = normalizeFrequency(frequencyInput);
  if (!frequency) return { error: 'Frequency must be daily, 2_per_week, or 3_per_week' };
  const error = validateDeliveryDays(frequency, deliveryDays);
  return error ? { error } : { frequency };
};

export const previewRecurringDeliveryBill = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity, frequency: frequencyInput, deliveryDays, billingFrequency: inputBillingFrequency, startDate: requestedStartDate } = req.body;
    if (!productId || !quantity || !frequencyInput) return res.status(400).json({ message: 'Missing required billing preview fields' });
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return res.status(400).json({ message: 'Quantity must be a positive whole number' });
    const schedule = validateSchedule(frequencyInput, deliveryDays);
    if ('error' in schedule) return res.status(400).json({ message: schedule.error });
    const billingFrequency = normalizeBillingFrequency(inputBillingFrequency);
    if (!billingFrequency) return res.status(400).json({ message: 'Billing frequency must be per_order, weekly, or monthly' });
    const startDate = requestedStartDate ? new Date(requestedStartDate) : new Date();
    if (Number.isNaN(startDate.getTime())) return res.status(400).json({ message: 'Invalid plan start date' });

    const product = await getTrustedInventoryItem(String(productId));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    let unitPrice: number;
    try {
      unitPrice = getTrustedInventoryPrice(product);
      assertRecurringDeliveryStock(product, Number(quantity));
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }

    const occurrence = getFirstScheduledDeliveryOnOrAfter(startDate, schedule.frequency, deliveryDays);
    const calculation = calculateRecurringBill({
      unitPrice,
      quantityPerDelivery: Number(quantity),
      frequency: schedule.frequency,
      deliveryDays,
      billingFrequency,
      startDate,
      occurrence,
    });
    res.json({ recurringBillPreview: {
      ...calculation,
      billingFrequency,
      startDate,
      quantityPerDelivery: Number(quantity),
      scheduledDeliveryCount: calculation.deliveryCount,
    } });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to calculate recurring bill preview' });
  }
};

export const createRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const idempotencyKey = req.get('Idempotency-Key')?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return res.status(400).json({ message: 'A valid Idempotency-Key header is required' });
    }
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

    const requestHash = createHash('sha256').update(JSON.stringify({
      productId: String(productId),
      productName: String(productName),
      quantity: Number(quantity),
      frequency: schedule.frequency,
      deliveryDays: schedule.frequency === 'daily' ? [] : [...deliveryDays].sort((left: number, right: number) => left - right),
      billingFrequency,
      paymentMethod,
      deliveryAddress,
      deliveryAddressId: deliveryAddressId ?? null,
      specialInstructions: specialInstructions ?? null,
      startDate: requestedStartDate ? startDate.toISOString() : null,
      endDate: requestedEndDate ? endDate?.toISOString() : null,
    })).digest('hex');
    const idempotencyFilter = { customerId: userId, creationIdempotencyKey: idempotencyKey };
    const findExistingPlan = () => RecurringDelivery.findOne(idempotencyFilter).select('+creationRequestHash');
    const returnExistingPlan = async (plan: any) => {
      if (plan.creationRequestHash !== requestHash) {
        return res.status(409).json({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'This idempotency key was already used for a different recurring plan request',
        });
      }
      let existingBill;
      try {
        existingBill = await RecurringBill.findOne({ recurringDeliveryId: plan._id }).sort({ periodStart: 1 });
        if (existingBill && plan.initialBillStatus !== 'ready') {
          plan.initialBillStatus = 'ready';
          await plan.save();
        }
        // Reuse a bill already created by the scheduler; otherwise retry the
        // initial-period upsert using the same unique billing-period key.
        if (!existingBill) existingBill = await getOrCreateInitialRecurringBill(plan);
      } catch (billError) {
        return initialBillPendingResponse(res, plan._id.toString(), billError);
      }
      return res.status(200).json({ message: 'Recurring delivery already created', recurringDelivery: plan, recurringBill: existingBill });
    };

    const existingPlan = await findExistingPlan();
    if (existingPlan) return await returnExistingPlan(existingPlan);

    const product = await getTrustedInventoryItem(String(productId));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    try {
      getTrustedInventoryPrice(product);
      assertRecurringDeliveryStock(product, Number(quantity));
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }

    let recurringDelivery;
    try {
      recurringDelivery = await RecurringDelivery.create({
        ...idempotencyFilter,
        creationRequestHash: requestHash,
        productId,
        productName,
        quantity: Number(quantity),
        frequency: schedule.frequency,
        status: 'active',
        deliveryDays: schedule.frequency === 'daily' ? undefined : deliveryDays,
        startDate,
        endDate,
        isActive: true,
        billingFrequency,
        paymentTerms: paymentTermsFor(billingFrequency),
        deliveryAddress,
        deliveryAddressId,
        offlinePaymentMethod: paymentMethod,
        specialInstructions,
        nextDeliveryDate: getFirstScheduledDeliveryOnOrAfter(startDate, schedule.frequency, deliveryDays),
        // Legacy display fields are deliberately not used for billing calculations.
        deliveryCount: 1,
        billAmount: 0,
        paymentMethod: 'offline',
        paymentStatus: 'pending',
        confirmationStatus: 'pending',
        initialBillStatus: 'pending',
      });
    } catch (createError: any) {
      if (createError?.code !== 11000) throw createError;
      const racedPlan = await findExistingPlan();
      if (!racedPlan) throw createError;
      return await returnExistingPlan(racedPlan);
    }

    // A failed validation or product check above never persists the key. If
    // bill creation fails, the same key can retry bill generation for this plan.
    let recurringBill: Awaited<ReturnType<typeof getOrCreateInitialRecurringBill>>;
    try {
      recurringBill = await getOrCreateInitialRecurringBill(recurringDelivery);
    } catch (billError) {
      // The plan is durably marked pending; the same idempotency key retries
      // this initial bill upsert without creating another plan or bill.
      return initialBillPendingResponse(res, recurringDelivery._id.toString(), billError);
    }
    if (!recurringBill) return initialBillPendingResponse(res, recurringDelivery._id.toString(), new Error('Initial bill was not persisted'));
    return res.status(201).json({ message: 'Recurring delivery created successfully', recurringDelivery, recurringBill });
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

export const updateRecurringDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body as { status?: string };
    if (!['active', 'paused', 'cancelled'].includes(status || '')) {
      return res.status(400).json({ message: 'Status must be active, paused, or cancelled' });
    }
    const recurringDelivery = await RecurringDelivery.findById(req.params.id);
    if (!recurringDelivery) return res.status(404).json({ message: 'Recurring delivery not found' });

    const currentStatus = recurringDelivery.status || (recurringDelivery.isActive ? 'active' : 'paused');
    if (!recurringDelivery.status && !recurringDelivery.isActive) {
      return res.status(409).json({ message: 'This older inactive recurring delivery has no saved paused or cancelled status and requires review before it can be changed' });
    }
    if (currentStatus === 'cancelled') return res.status(400).json({ message: 'Cancelled recurring deliveries cannot be changed' });
    if (status === 'paused' && currentStatus !== 'active') return res.status(400).json({ message: 'Only active recurring deliveries can be paused' });
    if (status === 'active' && currentStatus !== 'paused') return res.status(400).json({ message: 'Only paused recurring deliveries can be resumed' });
    const previousStatus = recurringDelivery.status;
    const previousIsActive = recurringDelivery.isActive;
    const previousNextDeliveryDate = recurringDelivery.nextDeliveryDate;
    recurringDelivery.status = status as 'active' | 'paused' | 'cancelled';
    recurringDelivery.isActive = status === 'active';
    if (status === 'active') {
      const frequency = normalizeFrequency(recurringDelivery.frequency);
      recurringDelivery.nextDeliveryDate = frequency
        ? getFirstScheduledDeliveryOnOrAfter(new Date(), frequency, recurringDelivery.deliveryDays)
        : calculateNextDeliveryDate(new Date(), recurringDelivery.frequency, recurringDelivery.deliveryDays);
    }
    await recurringDelivery.save();

    const notificationType = status === 'paused'
      ? 'recurring_delivery_paused'
      : status === 'active' ? 'recurring_delivery_resumed' : 'recurring_delivery_cancelled';
    try {
      await Notification.create({
        recipientId: recurringDelivery.customerId,
        recipientRole: 'customer',
        type: notificationType,
        productName: recurringDelivery.productName,
        recurringDeliveryId: recurringDelivery._id,
        eventKey: `recurring:${recurringDelivery._id}:${status}:${Date.now()}`,
      });
    } catch (notificationError) {
      recurringDelivery.status = previousStatus;
      recurringDelivery.isActive = previousIsActive;
      recurringDelivery.nextDeliveryDate = previousNextDeliveryDate;
      await recurringDelivery.save();
      throw notificationError;
    }

    res.json({ message: 'Recurring delivery status updated successfully', recurringDelivery });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update recurring delivery status' });
  }
};

export const updateRecurringDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const prohibited = Object.keys(req.body).filter((key) => serverControlledFields.has(key));
    if (prohibited.length) return res.status(403).json({ message: `Server-controlled fields cannot be changed: ${prohibited.join(', ')}` });
    const recurringDelivery = await RecurringDelivery.findOne({ _id: req.params.id, customerId: req.user!._id });
    if (!recurringDelivery) return res.status(404).json({ message: 'Recurring delivery not found' });
    const currentStatus = recurringDelivery.status || (recurringDelivery.isActive ? 'active' : 'paused');
    if (currentStatus === 'cancelled' && req.body.isActive === true) return res.status(400).json({ message: 'Cancelled recurring deliveries cannot be resumed' });
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
    if (updateData.isActive !== undefined) recurringDelivery.status = updateData.isActive ? 'active' : 'paused';
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
    recurringDelivery.status = 'cancelled';
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
