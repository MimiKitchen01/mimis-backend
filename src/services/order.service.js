import Order from '../models/order.model.js';
import { getOrCreateCart, clearCart } from './cart.service.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import chalk from 'chalk';
import logger from '../utils/logger.js';

export const createOrder = async (userId, addressId) => {
  const cart = await getOrCreateCart(userId);
  if (cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }

  logger.info({
    message: chalk.blue('🛍️ Creating new order:'),
    details: {
      userId: chalk.cyan(userId),
      items: chalk.yellow(cart.items.length + ' items'),
      total: chalk.green(`$${cart.total.toFixed(2)}`)
    }
  });

  const order = new Order({
    user: userId,
    items: cart.items,
    total: cart.total,
    deliveryAddress: addressId,
  });

  await order.save();
  await clearCart(userId);
  
  return order.populate(['items.product', 'deliveryAddress']);
};

export const updateOrderStatus = async (orderId, status) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.status = status;
  await order.save();
  return order.populate(['items.product', 'deliveryAddress']);
};

export const getOrders = async (userId, status) => {
  const query = { user: userId };
  if (status) {
    query.status = status;
  }

  return Order.find(query)
    .populate(['items.product', 'deliveryAddress'])
    .sort('-createdAt');
};

export const processPayment = async (orderId, paymentDetails) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.paymentStatus = PAYMENT_STATUS.COMPLETED;
  order.paymentDetails = {
    ...paymentDetails,
    paidAt: new Date()
  };
  order.status = ORDER_STATUS.CONFIRMED;

  await order.save();
  return order.populate(['items.product', 'deliveryAddress']);
};
