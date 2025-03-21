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
      currency: 'usd',
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
    //   currency: 'usd',
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
