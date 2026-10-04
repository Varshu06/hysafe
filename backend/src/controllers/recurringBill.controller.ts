import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringBill } from '../models/RecurringBill.model';
import { Order } from '../models/Order.model';
import { canCustomerConfirmBill, canRecordRecurringBillPayment, canStaffHandleRecurringBill, isFullBillPayment, isOfflinePaymentMethod } from '../services/recurringBilling.service';
import { ensureNextRecurringBillAfterPayment } from '../services/recurringDelivery.service';
import { notifyCustomerBill } from '../services/inAppNotification.service';

const populateBill = (query: any) => query
  .populate('customerId', 'name phone email')
  .populate('recurringDeliveryId', 'productName quantity frequency deliveryDays billingFrequency')
  .populate('orderIds')
  .populate('paidBy', 'name phone email');

const markOverdueBills = async (): Promise<void> => {
  const now = new Date();
  await RecurringBill.updateMany(
    { status: { $in: ['pending', 'confirmed'] }, dueDate: { $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
    { $set: { status: 'overdue' } },
  );
};

export const getCustomerRecurringBills = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const bills = await populateBill(RecurringBill.find({ customerId: req.user!._id }).sort({ dueDate: -1 }));
  res.json({ recurringBills: bills });
};

export const getCustomerRecurringBillById = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const bill = await populateBill(RecurringBill.findOne({ _id: req.params.id, customerId: req.user!._id }));
  if (!bill) return res.status(404).json({ message: 'Recurring bill not found' });
  res.json({ recurringBill: bill });
};

export const confirmRecurringBill = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const bill = await RecurringBill.findOne({ _id: req.params.id, customerId: req.user!._id });
  if (!bill) return res.status(404).json({ message: 'Recurring bill not found' });
  if (!canCustomerConfirmBill(bill.status)) return res.status(400).json({ message: 'This bill cannot be confirmed' });
  if (bill.status === 'pending') {
    bill.status = 'confirmed';
    bill.confirmedAt = new Date();
    await bill.save();
  }
  res.json({ message: 'Recurring bill confirmed. Payment is still pending.', recurringBill: bill });
};

export const getRecurringBills = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  if (req.user!.role === 'admin') {
    const bills = await populateBill(RecurringBill.find().sort({ dueDate: -1 }));
    return res.json({ recurringBills: bills });
  }

  const assignedOrders = await Order.find({ assignedStaffId: req.user!._id, isRecurring: true })
    .select('_id recurringBillId recurringDeliveryId deliverySlot assignedStaffId isRecurring');
  if (!assignedOrders.length) return res.json({ recurringBills: [] });
  const candidateRefs = [
    { _id: { $in: assignedOrders.map((order) => order.recurringBillId).filter(Boolean) } },
    { orderIds: { $in: assignedOrders.map((order) => order._id) } },
  ];
  const candidates = await RecurringBill.find({ $or: candidateRefs })
    .select('_id recurringDeliveryId scheduledDeliveryDates orderIds');
  const allowedIds = candidates
    .filter((bill) => assignedOrders.some((order) => canStaffHandleRecurringBill(bill, order, req.user!._id)))
    .map((bill) => bill._id);
  const bills = await populateBill(RecurringBill.find({ _id: { $in: allowedIds } }).sort({ dueDate: -1 }));
  res.json({ recurringBills: bills });
};

export const getRecurringBillById = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const billRecord = await RecurringBill.findById(req.params.id);
  if (!billRecord) return res.status(404).json({ message: 'Recurring bill not found' });
  if (req.user!.role === 'staff') {
    const assignedOrder = await Order.findOne({
      assignedStaffId: req.user!._id,
      isRecurring: true,
      recurringDeliveryId: billRecord.recurringDeliveryId,
      deliverySlot: { $in: billRecord.scheduledDeliveryDates },
      $or: [
        { recurringBillId: billRecord._id },
        { _id: { $in: billRecord.orderIds } },
      ],
    }).select('_id recurringBillId recurringDeliveryId deliverySlot assignedStaffId isRecurring');
    if (!assignedOrder || !canStaffHandleRecurringBill(billRecord, assignedOrder, req.user!._id)) {
      return res.status(404).json({ message: 'Recurring bill not found' });
    }
  }
  const bill = await populateBill(RecurringBill.findById(billRecord._id));
  res.json({ recurringBill: bill });
};

export const recordRecurringBillPayment = async (req: AuthRequest, res: Response) => {
  const { paymentMethod, amount } = req.body;
  if (!isOfflinePaymentMethod(paymentMethod)) {
    return res.status(400).json({ message: 'Payment method must be cash or shop' });
  }
  if (!Number.isFinite(Number(amount))) return res.status(400).json({ message: 'A full payment amount is required' });

  await markOverdueBills();
  const bill = await RecurringBill.findById(req.params.id);
  if (!bill) return res.status(404).json({ message: 'Recurring bill not found' });
  if (req.user!.role === 'staff') {
    const assignedOrder = await Order.findOne({
      assignedStaffId: req.user!._id,
      isRecurring: true,
      recurringDeliveryId: bill.recurringDeliveryId,
      deliverySlot: { $in: bill.scheduledDeliveryDates },
      $or: [
        { recurringBillId: bill._id },
        { _id: { $in: bill.orderIds } },
      ],
    }).select('_id recurringBillId recurringDeliveryId deliverySlot assignedStaffId isRecurring');
    if (!assignedOrder || !canStaffHandleRecurringBill(bill, assignedOrder, req.user!._id)) {
      return res.status(404).json({ message: 'Recurring bill not found' });
    }
  }
  if (bill.status === 'paid') return res.status(409).json({ message: 'Recurring bill has already been paid' });
  if (!canRecordRecurringBillPayment(bill.status)) {
    return res.status(400).json({ message: 'This bill is not available for payment recording' });
  }
  if (!isFullBillPayment(amount, bill.amount)) return res.status(400).json({ message: 'Full bill payment is required' });

  const paidAt = new Date();
  const updatedBill = await RecurringBill.findOneAndUpdate(
    { _id: bill._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid', paymentMethod, paymentAmount: bill.amount, paidAt, paidBy: req.user!._id } },
    { new: true },
  );
  if (!updatedBill) return res.status(409).json({ message: 'Recurring bill has already been paid' });
  void notifyCustomerBill(updatedBill, 'bill_paid');
  await ensureNextRecurringBillAfterPayment(updatedBill._id.toString()).catch((error) => {
    console.error('[RecurringBillController] Next recurring bill generation failed:', error);
  });
  res.json({ message: 'Offline payment recorded', recurringBill: await populateBill(RecurringBill.findById(updatedBill._id)) });
};

export { markOverdueBills };
