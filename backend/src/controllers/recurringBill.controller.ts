import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { RecurringBill } from '../models/RecurringBill.model';
import { canCustomerConfirmBill, canRecordRecurringBillPayment, isFullBillPayment, isOfflinePaymentMethod } from '../services/recurringBilling.service';
import { processDueRecurringDeliveries } from '../services/recurringDelivery.service';
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
    processDueRecurringDeliveries().catch((err) => console.error('[RecurringBillController] Order generation failed:', err));
  }
  res.json({ message: 'Recurring bill confirmed. Payment is still pending.', recurringBill: bill });
};

export const getRecurringBills = async (_req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const bills = await populateBill(RecurringBill.find().sort({ dueDate: -1 }));
  res.json({ recurringBills: bills });
};

export const getRecurringBillById = async (req: AuthRequest, res: Response) => {
  await markOverdueBills();
  const bill = await populateBill(RecurringBill.findById(req.params.id));
  if (!bill) return res.status(404).json({ message: 'Recurring bill not found' });
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
  if (bill.status === 'paid') return res.status(409).json({ message: 'Recurring bill has already been paid' });
  if (!canRecordRecurringBillPayment(bill.status)) {
    return res.status(400).json({ message: 'Customer confirmation is required before payment can be recorded' });
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
  res.json({ message: 'Offline payment recorded', recurringBill: await populateBill(RecurringBill.findById(updatedBill._id)) });
};

export { markOverdueBills };
