import cors from 'cors';
import express, { Application } from 'express';
import morgan from 'morgan';
import config from './config/env';
import { errorHandler } from './middleware/error.middleware';

// Routes
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import staffRoutes from './routes/staff.routes';

/**
 * Create Express app
 */
export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Hy-Safe API is running' });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  // Error handler
  app.use(errorHandler);

  return app;
};

