import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import Stripe from 'stripe';
import Order from '../models/order.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const generateOrderNumber = () => {
  return 'ORD-' + Date.now().toString(36).toUpperCase();
};

export const createPaymentIntent = async (order) => {
  logger.info(chalk.blue('💳 Creating payment intent:'), {
    orderId: chalk.cyan(order._id),
    amount: chalk.yellow(order.total)
  });

  try {
    // Set order number if not already set
    if (!order.orderNumber) {
      order.orderNumber = generateOrderNumber();
      await order.save();
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      }
    });

    logger.info(chalk.green('✅ Payment intent created:'),
      chalk.cyan(paymentIntent.id)
    );

    return paymentIntent;
  } catch (error) {
    logger.error(chalk.red('❌ Payment intent creation failed:'),
      chalk.yellow(error.message)
    );
    throw new ApiError(400, 'Payment intent creation failed: ' + error.message);
  }
};

// Retrieve a PaymentIntent from Stripe so the server can verify a payment
// against Stripe's own record rather than trusting the client.
export const retrievePaymentIntent = async (paymentIntentId) => {
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

// Verify with Stripe that an order has actually been paid, for the correct
// amount and currency. Throws ApiError if not. The single source of truth for
// "is this order paid?" — no endpoint should mark an order paid without it.
export const verifyOrderPaymentSucceeded = async (order) => {
  if (!order.paymentId) {
    throw new ApiError(400, 'No payment has been initiated for this order');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new ApiError(402, `Payment not completed (status: ${paymentIntent.status})`);
  }

  const expectedAmount = Math.round(order.total * 100);
  const paidAmount = paymentIntent.amount_received ?? paymentIntent.amount;
  if (paidAmount !== expectedAmount || paymentIntent.currency !== 'gbp') {
    logger.error(chalk.red('Payment amount mismatch:'), {
      orderId: order._id.toString(),
      expectedAmount,
      paidAmount,
      currency: paymentIntent.currency
    });
    throw new ApiError(400, 'Payment amount does not match order total');
  }

  return paymentIntent;
};

// Verify and construct a Stripe webhook event from the raw request body.
export const constructWebhookEvent = (rawBody, signature) => {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

export const processPayment = async (order, paymentDetails) => {
  logger.info(chalk.blue('💳 Processing payment:'), {
    orderId: chalk.cyan(order._id),
    amount: chalk.yellow(order.total),
    method: chalk.green(paymentDetails.method)
  });

  try {
    // Here you would integrate with your payment provider
    // Example with Stripe:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: order.total * 100,
    //   currency: 'eur',
    //   payment_method: paymentDetails.paymentMethodId,
    //   confirm: true
    // });

    // For demo, simulate payment success
    const paymentResult = {
      success: true,
      transactionId: `PAY-${Date.now()}`,
      amount: order.total
    };

    logger.info(chalk.green('✅ Payment successful:'),
      chalk.cyan(paymentResult.transactionId)
    );

    return paymentResult;
  } catch (error) {
    logger.error(chalk.red('❌ Payment failed:'), chalk.yellow(error.message));
    throw new ApiError(400, 'Payment processing failed');
  }
};
