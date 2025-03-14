import * as paymentService from '../services/payment.service.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const createPaymentSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.paymentStatus === 'completed') {
      throw new ApiError(400, 'Order is already paid');
    }

    const paymentIntent = await paymentService.createPaymentIntent(order);

    // Update order with payment intent ID
    order.payment = {
      paymentIntentId: paymentIntent.id,
      amount: order.total,
      paymentStatus: 'pending'
    };
    await order.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      amount: order.total
    });
  } catch (error) {
    logger.error(chalk.red('Payment session creation failed:'), error);
    res.status(error.statusCode || 500).json({ message: error.message });
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