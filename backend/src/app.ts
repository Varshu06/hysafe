import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import staffRoutes from './routes/staff.routes';
import customerRoutes from './routes/customer.routes';
import inventoryRoutes from './routes/inventory.routes';
import { errorHandler } from './middleware/error.middleware';
import { corsOriginValidator } from './config/cors';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const rateLimitHandler = (message: string) => (_req: express.Request, res: express.Response) => {
  res.status(429).json({ message });
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts. Please try again later.'),
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests. Please try again later.'),
});

// Trust proxy for accurate IP addresses (set to 1 to trust first proxy hop safely)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: corsOriginValidator,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'HySafe Backend Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;


