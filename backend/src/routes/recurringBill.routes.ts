import { Router } from 'express';
import {
  confirmRecurringBill,
  getCustomerRecurringBillById,
  getCustomerRecurringBills,
  getRecurringBillById,
  getRecurringBills,
  recordRecurringBillPayment,
} from '../controllers/recurringBill.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateObjectId } from '../middleware/objectId.middleware';

export const customerRecurringBillRouter = Router();
customerRecurringBillRouter.param('id', validateObjectId);
customerRecurringBillRouter.use(authenticate, requireRole('customer'));
customerRecurringBillRouter.get('/', getCustomerRecurringBills);
customerRecurringBillRouter.get('/:id', getCustomerRecurringBillById);
customerRecurringBillRouter.put('/:id/confirm', confirmRecurringBill);

export const recurringBillRouter = Router();
recurringBillRouter.param('id', validateObjectId);
recurringBillRouter.use(authenticate, requireRole('admin', 'staff'));
recurringBillRouter.get('/', getRecurringBills);
recurringBillRouter.get('/:id', getRecurringBillById);
recurringBillRouter.put('/:id/payment', recordRecurringBillPayment);
