import * as paymentService from '../services/payment.service.js';
import * as notificationService from '../services/notification.service.js';
import * as emailService from '../services/email.service.js';
import {
  getPaymentInitiatedTemplate,
  getPaymentSuccessTemplate
} from '../templates/emailTemplates.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const createPaymentSession = async (req, res) => {
  try {
    logger.info(chalk.blue('💰 Creating payment session:'),
      chalk.cyan(JSON.stringify(req.body))
    );

    const { orderId } = req.body;

    // Find order and ensure it belongs to the requesting user
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    }).populate(['items.product', 'user']);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.paymentStatus === 'completed') {
      throw new ApiError(400, 'Order is already paid');
    }

    // Ensure order has an order number
    if (!order.orderNumber) {
      order.orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      await order.save();
    }

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent(order);

    // Update order with payment intent details
    order.payment = {
      paymentIntentId: paymentIntent.id,
      amount: order.total,
      paymentStatus: 'pending',
      currency: 'gbp'
    };
    await order.save();

    // Send payment initiated email
    await emailService.sendEmail({
      to: order.user.email,
      subject: `Payment Initiated for Order #${order.orderNumber}`,
      html: getPaymentInitiatedTemplate(order, order.user)
    });

    logger.info(chalk.green('✅ Payment session created:'), {
      orderId: chalk.cyan(order._id),
      orderNumber: chalk.yellow(order.orderNumber),
      amount: chalk.green(`$${order.total.toFixed(2)}`)
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.total
    });
  } catch (error) {
    logger.error(chalk.red('Payment session creation failed:'), error);
    res.status(error.statusCode || 500).json({
      message: error.message,
      details: error.errors
    });
  }
};

export const handlePaymentWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(chalk.red('Webhook handling failed:'), error);
    res.status(400).json({ message: error.message });
  }
};

const handleSuccessfulPayment = async (paymentIntent) => {
  const order = await Order.findOne({
    'payment.paymentIntentId': paymentIntent.id
  });

  if (order) {
    order.payment.paymentStatus = 'completed';
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    await order.save();
  }
};

const handleFailedPayment = async (paymentIntent) => {
  const order = await Order.findOne({
    'payment.paymentIntentId': paymentIntent.id
  });

  if (order) {
    order.payment.paymentStatus = 'failed';
    await order.save();
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    }).populate(['items.product', 'user']);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Initialize payment object if it doesn't exist
    if (!order.payment) {
      order.payment = {};
    }

    // Update order status and save
    order.payment = {
      ...order.payment,
      paymentStatus: status,
      paidAt: new Date()
    };
    order.status = 'confirmed';
    
    await order.save();

    try {
      // Send success notification and email
      await Promise.all([
        notificationService.createNotification({
          user: order.user,
          title: 'Payment Successful',
          message: `Your payment for order #${order.orderNumber} was successful.`,
          type: 'payment',
          orderId: order._id
        }),
        emailService.sendEmail({
          to: order.user.email,
          subject: `Payment Successful for Order #${order.orderNumber}`,
          html: getPaymentSuccessTemplate(order, order.user)
        })
      ]);
    } catch (notifError) {
      // Log notification error but don't fail the payment confirmation
      logger.error('Failed to create payment notification:', notifError);
    }

    res.json({
      status: 'success',
      message: 'Payment confirmed successfully',
      order
    });
  } catch (error) {
    logger.error('Payment confirmation failed:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};