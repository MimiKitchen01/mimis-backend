import * as paymentService from '../services/payment.service.js';
import * as notificationService from '../services/notification.service.js';
import * as emailService from '../services/email.service.js';
import { clearCart } from '../services/cart.service.js';
import {
  getPaymentInitiatedTemplate,
  getPaymentSuccessTemplate
} from '../templates/emailTemplates.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Notify the customer and the owner that an order has been paid.
 *
 * This is the single place order notifications are sent, and it runs only after
 * a payment is verified — never on order creation, so a cancelled payment never
 * notifies anyone. Failures here are logged but never fail the payment.
 *
 * `order` must be populated with `user`.
 */
const sendOrderPaidNotifications = async (order) => {
  const userId = order.user?._id || order.user;
  const customerName = order.user?.fullName || 'a customer';

  try {
    await Promise.all([
      // Customer: in-app + push + email
      notificationService.createNotification({
        user: userId,
        title: 'Payment Successful',
        message: `Your payment for order #${order.orderNumber} was successful.`,
        type: 'payment',
        orderId: order._id
      }),
      notificationService.sendPushNotification(userId, {
        title: 'Payment Successful',
        body: `Your order #${order.orderNumber} is confirmed. Thank you!`,
        data: { orderId: order._id.toString(), type: 'order_paid' }
      }),
      order.user?.email && emailService.sendEmail({
        to: order.user.email,
        subject: `Payment Successful for Order #${order.orderNumber}`,
        html: getPaymentSuccessTemplate(order, order.user)
      }),
      // Owner/admins: push + email
      notificationService.notifyAdmins({
        title: 'New Order Received',
        body: `Order #${order.orderNumber} (£${order.total?.toFixed(2)}) placed by ${customerName}.`,
        data: { orderId: order._id.toString(), type: 'new_order' }
      }),
      emailService.sendAdminOrderNotification(order)
    ]);
  } catch (error) {
    logger.error('Failed to send order-paid notifications:', error);
  }
};

/**
 * Empty the customer's cart once their payment is verified. Every
 * payment-completion path (client confirm, Stripe webhook, /orders/pay) must
 * call this — otherwise the next order silently includes already-paid items.
 */
const clearPaidOrderCart = async (order) => {
  const userId = order.user?._id || order.user;
  try {
    await clearCart(userId);
  } catch (error) {
    logger.error('Failed to clear cart after payment:', error);
  }
};

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
    // Previously this called a `stripe` instance that was never imported here,
    // so every webhook threw and returned 400 — the secure confirmation path
    // was dead. Verify the signature via the payment service instead.
    const event = paymentService.constructWebhookEvent(req.body, sig);

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
    order.paymentDetails.paidAt = new Date();
    order.status = 'confirmed';
    await order.save();

    await clearPaidOrderCart(order);
    await sendOrderPaidNotifications(order);
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

    // The client's word is never trusted here. A previous version wrote the
    // request-body `status` straight onto the order, letting any authenticated
    // user mark an order paid without paying. Verify against Stripe instead.
    await paymentService.verifyOrderPaymentSucceeded(order);

    // Verified paid. Mark the order completed.
    order.paymentStatus = 'completed';
    if (!order.paymentDetails) {
      order.paymentDetails = {
        amount: order.total,
        currency: 'gbp'
      };
    }
    order.paymentDetails.paidAt = new Date();
    order.status = 'confirmed';

    await order.save();

    await clearPaidOrderCart(order);
    await sendOrderPaidNotifications(order);

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