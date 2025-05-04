import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import { getOrCreateCart, clearCart } from './cart.service.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { Address } from '../models/address.model.js';
import * as notificationService from './notification.service.js';


export const validateOrderCreation = async (userId, addressId = null) => {
  const cart = await getOrCreateCart(userId);
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }

  // Get address - either specified or default
  let address;
  if (addressId) {
    address = await Address.findOne({ _id: addressId, user: userId });
  } else {
    address = await Address.findOne({ user: userId, isDefault: true });
  }

  if (!address) {
    throw new ApiError(400, 'No delivery address specified and no default address found');
  }

  // Validate product availability and prices
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isAvailable) {
      throw new ApiError(400, `Product ${product?.name || 'Unknown'} is no longer available`);
    }
    if (product.price !== item.price) {
      throw new ApiError(400, `Price for ${product.name} has changed. Please update your cart`);
    }
  }

  return { cart, address };
};

export const createOrder = async (userId, addressId = null) => {
  logger.info(chalk.blue('🛒 Creating new order:'), {
    userId: chalk.cyan(userId),
    addressId: addressId ? chalk.yellow(addressId) : chalk.yellow('using default')
  });

  const { cart, address } = await validateOrderCreation(userId, addressId);

  const order = new Order({
    orderNumber: generateOrderNumber(),
    user: userId,
    items: cart.items,
    total: cart.total,
    deliveryAddress: address._id,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    estimatedDeliveryTime: calculateEstimatedDeliveryTime()
  });

  await order.save();
  await clearCart(userId);

  logger.info(chalk.green('✅ Order created successfully:'), {
    orderId: chalk.cyan(order._id),
    total: chalk.yellow(`$${order.total.toFixed(2)}`)
  });

  // Create notification for order creation
  await notificationService.createNotification({
    user: userId,
    title: 'Order Created',
    message: `Your order #${order.orderNumber} has been created successfully.`,
    type: 'order',
    orderId: order._id
  });

  return order.populate(['items.product', 'deliveryAddress', 'user']);
};

export const createOrderWithAddress = async (userId, addressId, paymentMethod) => {
  logger.info(chalk.blue('📦 Creating order:'), {
    userId: chalk.cyan(userId),
    addressId: chalk.yellow(addressId)
  });

  // 1. Validate cart and address
  const { cart, address } = await validateOrderCreation(userId, addressId);

  // 2. Create order with status PENDING
  const order = new Order({
    orderNumber: generateOrderNumber(),
    user: userId,
    items: cart.items,
    total: cart.total,
    deliveryAddress: addressId,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    estimatedDeliveryTime: calculateEstimatedDeliveryTime(),
    paymentDetails: {
      method: paymentMethod
    }
  });

  await order.save();

  // 3. Clear cart after successful order creation
  await clearCart(userId);

  logger.info(chalk.green('✅ Order created:'), chalk.cyan(order._id));

  return order.populate(['items.product', 'deliveryAddress']);
};

export const processOrderPayment = async (orderId, paymentDetails) => {
  logger.info(chalk.blue('💳 Processing payment for order:'), chalk.cyan(orderId));

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED) {
    throw new ApiError(400, 'Order is already paid');
  }

  try {
    // Integrate with payment service here
    const paymentResult = await processPayment(order, paymentDetails);

    order.paymentStatus = PAYMENT_STATUS.COMPLETED;
    order.paymentDetails = {
      ...paymentDetails,
      transactionId: paymentResult.transactionId,
      paidAt: new Date()
    };
    order.status = ORDER_STATUS.CONFIRMED;

    await order.save();

    // Trigger order confirmation notifications
    await sendOrderConfirmation(order);

    return order;
  } catch (error) {
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    await order.save();
    throw new ApiError(400, 'Payment processing failed: ' + error.message);
  }
};

export const updateOrderStatus = async (orderId, status, adminId) => {
  logger.info(chalk.blue('📦 Updating order status:'), {
    orderId: chalk.cyan(orderId),
    status: chalk.yellow(status)
  });

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Validate status transition
  validateStatusTransition(order.status, status);

  // Update payment status when order is confirmed
  if (status === ORDER_STATUS.CONFIRMED && order.paymentStatus === PAYMENT_STATUS.PENDING) {
    order.paymentStatus = PAYMENT_STATUS.COMPLETED;
  }

  order.status = status;
  order.statusHistory.push({
    status,
    updatedBy: adminId,
    timestamp: new Date()
  });

  await order.save();
  await sendOrderStatusNotification(order);

  return order.populate(['items.product', 'deliveryAddress', 'user']);
};

// Add new function for payment status update
export const updatePaymentStatus = async (orderId, paymentStatus, adminId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Map payment status to history status
  const historyStatus = `payment_${paymentStatus}`;
  
  // Update payment status
  order.paymentStatus = paymentStatus;
  
  // Add to status history
  order.statusHistory.push({
    status: order.status, // Keep the current order status
    updatedBy: adminId,
    timestamp: new Date()
  });

  // If payment is completed and order is pending, automatically confirm it
  if (paymentStatus === PAYMENT_STATUS.COMPLETED && order.status === ORDER_STATUS.PENDING) {
    order.status = ORDER_STATUS.CONFIRMED;
    order.statusHistory.push({
      status: ORDER_STATUS.CONFIRMED,
      updatedBy: adminId,
      timestamp: new Date()
    });
  }

  await order.save();
  return order;
};

// Helper functions
const generateOrderNumber = () => {
  return 'ORD-' + Date.now().toString(36).toUpperCase();
};

const calculateEstimatedDeliveryTime = () => {
  const now = new Date();
  return new Date(now.getTime() + 45 * 60000); // 45 minutes from now
};

const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.READY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: []
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new ApiError(400, `Cannot transition order from ${currentStatus} to ${newStatus}`);
  }
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

export const getOrdersWithFilters = async (options = {}) => {
  try {
    logger.info(chalk.blue('📦 Getting orders with filters:'),
      chalk.cyan(JSON.stringify(options, null, 2))
    );

    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      searchTerm
    } = options;

    // Build filter query
    const filter = {};

    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (searchTerm) {
      filter.$or = [
        { orderNumber: new RegExp(searchTerm, 'i') },
        { status: new RegExp(searchTerm, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with proper error handling
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'fullName email phoneNumber')
        .populate('deliveryAddress')
        .populate('items.product')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    logger.info(chalk.green('✅ Retrieved orders:'), {
      count: chalk.yellow(orders.length),
      total: chalk.cyan(total)
    });

    // Transform orders to prevent null reference errors
    const transformedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber || 'N/A',
      status: order.status,
      total: order.total,
      items: order.items?.map(item => ({
        product: item.product ? {
          id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          imageUrl: item.product.imageUrl
        } : null,
        quantity: item.quantity,
        price: item.price
      })) || [],
      customer: order.user ? {
        id: order.user._id,
        name: order.user.fullName,
        email: order.user.email,
        phone: order.user.phoneNumber
      } : null,
      address: order.deliveryAddress ? {
        street: order.deliveryAddress.street,
        city: order.deliveryAddress.city,
        zipCode: order.deliveryAddress.zipCode
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    return {
      orders: transformedOrders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: page < Math.ceil(total / parseInt(limit))
      }
    };
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching orders:'), {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const getOrderStats = async () => {
  return Order.aggregate([
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byPaymentStatus: [
          { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
        ],
        dailyOrders: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
              revenue: { $sum: '$total' }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 7 }
        ]
      }
    }
  ]);
};

const transformOrdersForResponse = (orders) => {
  return orders.map(order => ({
    id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    items: order.items.map(item => ({
      product: {
        id: item.product._id,
        name: item.product.name,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        category: item.product.category
      },
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    })),
    customer: order.user ? {
      id: order.user._id,
      fullName: order.user.fullName,
      email: order.user.email,
      phoneNumber: order.user.phoneNumber
    } : null,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
};
