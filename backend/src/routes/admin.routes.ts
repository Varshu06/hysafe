import { Router } from 'express';
import {
    assignOrder,
    createUser,
    getAllCustomers,
    getAllOrders,
    getAllStaff,
    getDashboard,
    getInventory,
    getPaymentSummary,
    updateInventory,
} from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';

const router = Router();

// All routes require admin role
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/orders', getAllOrders);
router.post('/orders/:id/assign', assignOrder);
router.get('/staff', getAllStaff);
router.post('/users', createUser);
router.get('/inventory', getInventory);
router.post('/inventory', updateInventory);
router.get('/payments', getPaymentSummary);
router.get('/customers', getAllCustomers);

export default router;


