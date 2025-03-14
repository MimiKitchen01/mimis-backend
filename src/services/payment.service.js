import stripe from '../config/stripe.config.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

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

export const createPaymentIntent = async (order) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString()
      }
    });

    logger.info(chalk.blue('💰 Payment intent created:'), {
      amount: chalk.yellow(`$${order.total}`),
      orderId: chalk.cyan(order._id)
    });

    return paymentIntent;
  } catch (error) {
    logger.error(chalk.red('Payment intent creation failed:'), error);
    throw new ApiError(400, 'Payment initialization failed');
  }
};

export const confirmPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      status: paymentIntent.status,
      orderId: paymentIntent.metadata.orderId
    };
  } catch (error) {
    logger.error(chalk.red('Payment confirmation failed:'), error);
    throw new ApiError(400, 'Payment confirmation failed');
  }
};
