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
import passport from 'passport';
import './config/passport.config.js';
import chatRoutes from './routes/chat.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { corsMiddleware, handleCors } from './middleware/cors.middleware.js';

const app = express();

// Apply CORS before any other middleware
app.use(corsMiddleware);
app.use(handleCors);

// Handle preflight requests for all routes
app.options('*', (req, res) => {
  res.status(200).end();
});

// Add security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Request logging middleware
app.use(requestLogger);

// Middleware
app.use(express.json());
app.use(passport.initialize());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRouter); // Use the named import
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
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
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(chalk.red('❌ Error:'), err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});
