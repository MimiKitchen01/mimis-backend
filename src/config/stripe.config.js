import Stripe from 'stripe';
import logger from '../utils/logger.js';
import chalk from 'chalk';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Use the latest API version
});

logger.info(chalk.blue('💳 Stripe initialized'), {
  mode: process.env.NODE_ENV,
  version: stripe.VERSION
});

export default stripe; 