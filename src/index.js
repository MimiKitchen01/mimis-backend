import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import chalk from 'chalk';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { addressRouter } from './routes/address.routes.js';
import productRoutes from './routes/product.routes.js';
import adminRoutes from './routes/admin.routes.js';
import orderRoutes from './routes/order.routes.js';
import reviewRoutes from './routes/review.routes.js';
import swaggerSpec from './config/swagger.config.js';
import { requestLogger } from './middleware/logging.middleware.js';

import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { corsMiddleware, handleCors } from './middleware/cors.middleware.js';
import { initEmailService } from './services/email.service.js';
import compression from 'compression';
import helmet from 'helmet';
import { apiLimiter, authLimiter, otpLimiter, registerLimiter } from './middleware/rateLimit.middleware.js';

const app = express();

// Security: Helmet should be first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Apply CORS before any other middleware
app.use(corsMiddleware);
app.use(handleCors);

// Handle preflight requests for all routes
app.options('*', (req, res) => {
  res.status(200).end();
});

// Add custom security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Response compression - compress all responses
app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Request logging middleware
app.use(requestLogger);

// Middleware
app.use(express.json());


// Increase payload size limits
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ limit: '40mb', extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes with rate limiting
app.use('/api/', apiLimiter); // Apply general rate limit to all API routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/verify-reset-otp', otpLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRouter);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  logger.warn({
    message: 'Route not found',
    method: req.method,
    path: req.path
  });
  res.status(404).json({
    status: 'error',
    message: `Route ${req.path} not found`
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start server
const PORT = process.env.PORT || 80;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(chalk.green.bold('🚀 Server is running on port:'), chalk.blue(PORT));
  logger.info(chalk.cyan('📚 API Documentation:'), chalk.underline(`http://localhost:${PORT}/api-docs`));
  // Initialize and verify email service on startup (non-blocking)
  initEmailService()
    .then(() => logger.info(chalk.green('✉️ Mail service initialization complete')))
    .catch((err) => logger.error(chalk.red('✉️ Mail service initialization error:'), err));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(chalk.red('❌ Error:'), err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});
