import * as paymentService from '../services/payment.service.js';
import * as notificationService from '../services/notification.service.js';
import * as emailService from '../services/email.service.js';
import * as cartService from '../services/cart.service.js';
import {
  getPaymentInitiatedTemplate,
  getPaymentSuccessTemplate
} from '../templates/emailTemplates.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    order.paymentId = paymentIntent.id;
    order.paymentStatus = 'pending';
    order.paymentDetails = {
      amount: order.total,
      currency: 'gbp'
    };

    await order.save();

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
    paymentId: paymentIntent.id
  }).populate(['items.product', 'user', 'deliveryAddress']);

  if (order && order.paymentStatus !== 'completed') {
    order.paymentStatus = 'completed';
    if (!order.paymentDetails) order.paymentDetails = {};
    order.paymentDetails.transactionId = paymentIntent.id;
    order.paymentDetails.paidAt = new Date();
    order.status = 'confirmed';
    await order.save();

    // Clear the user's cart now that the order is paid.
    const userId = order.user?._id || order.user;
    cartService.clearCart(userId).catch((err) =>
      logger.error('Failed to clear cart after payment:', err)
    );

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
        notificationService.notifyAdmins({
          title: 'New Order Received',
          body: `Order #${order.orderNumber} has been paid and placed.`,
          data: { orderId: order._id.toString(), type: 'new_order' }
        }),
        emailService.sendEmail({
          to: order.user.email,
          subject: `Payment Successful for Order #${order.orderNumber}`,
          html: getPaymentSuccessTemplate(order, order.user)
        }),
        emailService.sendAdminOrderNotification(order)
      ]);
    } catch (error) {
      logger.error('Webhook notification failed:', error);
    }
  }
};

const handleFailedPayment = async (paymentIntent) => {
  const order = await Order.findOne({
    paymentId: paymentIntent.id
  });

  if (order) {
    order.paymentStatus = 'failed';
    await order.save();
  }
};

export const confirmPayment = async (req, res) => {
  try {
    // NOTE: The client-supplied `status` is intentionally ignored. Payment is
    // verified directly against Stripe so an order can never be confirmed
    // without a real, succeeded payment.
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    }).populate(['items.product', 'user']);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.paymentStatus === 'completed') {
      return res.json({
        status: 'success',
        message: 'Payment already confirmed',
        order
      });
    }

    if (!order.paymentId) {
      throw new ApiError(400, 'No payment has been initiated for this order');
    }

    // Verify the payment with Stripe — this is the source of truth.
    const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentId);

    if (paymentIntent.status !== 'succeeded') {
      logger.warn(chalk.yellow('Payment not completed on Stripe:'), {
        orderId: chalk.cyan(order._id),
        paymentIntent: chalk.yellow(paymentIntent.id),
        stripeStatus: chalk.red(paymentIntent.status)
      });
      throw new ApiError(400, `Payment not completed. Current status: ${paymentIntent.status}`);
    }

    // Verify the amount charged matches the order total (amounts are in cents).
    const expectedAmount = Math.round(order.total * 100);
    if (paymentIntent.amount_received !== expectedAmount) {
      logger.error(chalk.red('Payment amount mismatch:'), {
        orderId: chalk.cyan(order._id),
        expected: chalk.yellow(expectedAmount),
        received: chalk.red(paymentIntent.amount_received)
      });
      throw new ApiError(400, 'Payment amount does not match order total');
    }

    // Payment verified — confirm the order.
    order.paymentStatus = 'completed';
    if (!order.paymentDetails) {
      order.paymentDetails = {
        amount: order.total,
        currency: 'gbp'
      };
    }
    order.paymentDetails.transactionId = paymentIntent.id;
    order.paymentDetails.paidAt = new Date();
    order.status = 'confirmed';

    await order.save();

    // Clear the user's cart now that the order is paid.
    cartService.clearCart(req.user.userId).catch((err) =>
      logger.error('Failed to clear cart after payment:', err)
    );

    // Notify admins now that the order is actually paid.
    notificationService.notifyAdmins({
      title: 'New Order Received',
      body: `Order #${order.orderNumber} has been paid and placed.`,
      data: { orderId: order._id.toString(), type: 'new_order' }
    }).catch((err) => logger.error('Admin notification failed:', err));

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
        }),
        emailService.sendAdminOrderNotification(order)
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