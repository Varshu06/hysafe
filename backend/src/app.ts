import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import staffRoutes from './routes/staff.routes';
import customerRoutes from './routes/customer.routes';
import inventoryRoutes from './routes/inventory.routes';
import { errorHandler } from './middleware/error.middleware';
import { corsOriginValidator } from './config/cors';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check endpoint for uptime monitoring and load balancers
app.get('/api/health', (_req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    message: isDbConnected ? 'HySafe Backend Server is healthy' : 'Database connection unavailable',
    database: isDbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;


