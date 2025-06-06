import * as orderService from '../services/order.service.js';
import * as cartService from '../services/cart.service.js';
import * as notificationService from '../services/notification.service.js'; // Add this import
import Cart from '../models/cart.model.js'; // Changed from named import to default import
import Product from '../models/product.model.js';
import Order from '../models/order.model.js'; // Changed from named import to default import
import Review from '../models/review.model.js'; // New import for Review model
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

// Cart Controllers
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId })
      .populate('items.product');
    res.json(cart || { items: [], total: 0 });
  } catch (error) {
    logger.error('Error in getCart:', error);
    res.status(500).json({ message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Please provide an array of items to add to cart');
    }

    // Validate items structure
    items.forEach(item => {
      if (!item.productId || !item.quantity) {
        throw new ApiError(400, 'Each item must have productId and quantity');
      }
      if (item.quantity < 1) {
        throw new ApiError(400, 'Quantity must be at least 1');
      }
    });

    // Get all products at once and create a Map for easier lookup
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productsMap = new Map(products.map(p => [p._id.toString(), p]));

    // Validate products
    const missingProducts = [];
    const unavailableProducts = [];

    productIds.forEach(id => {
      const product = productsMap.get(id);
      if (!product) {
        missingProducts.push(id);
      } else if (!product.isAvailable) {
        unavailableProducts.push(product.name);
      }
    });

    if (missingProducts.length > 0) {
      throw new ApiError(404, `Products not found: ${missingProducts.join(', ')}`);
    }

    if (unavailableProducts.length > 0) {
      throw new ApiError(400, `The following products are not available: ${unavailableProducts.join(', ')}`);
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      cart = new Cart({
        user: req.user.userId,
        items: []
      });
    }

    // Clear all existing items from cart
    cart.items = [];

    // Add new items
    items.forEach(item => {
      const product = productsMap.get(item.productId);
      cart.items.push({
        product: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    });

    // Calculate total using the productsMap with safe discount check
    cart.total = cart.items.reduce((total, item) => {
      const product = productsMap.get(item.product.toString());
      let itemPrice = product.price;
      
      if (product.discount?.isActive && product.discount.type && product.discount.value) {
        if (product.discount.type === 'percentage') {
          itemPrice = product.price * (1 - (product.discount.value / 100));
        } else if (product.discount.type === 'fixed') {
          itemPrice = Math.max(0, product.price - product.discount.value);
        }
      }

      return total + (itemPrice * item.quantity);
    }, 0);

    await cart.save();
    await cart.populate('items.product');

    logger.info(chalk.green('✅ Cart updated successfully:'), {
      userId: chalk.cyan(req.user.userId),
      itemCount: chalk.yellow(cart.items.length),
      total: chalk.green(`$${cart.total.toFixed(2)}`)
    });

    res.json({
      status: 'success',
      message: 'Cart updated with new items',
      data: cart
    });
  } catch (error) {
    logger.error(chalk.red('❌ Error updating cart:'), {
      error: error.message,
      userId: req.user.userId
    });

    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    logger.info(chalk.blue('🛒 Cart update request:'), {
      userId: chalk.cyan(req.user.userId),
      productId: chalk.yellow(productId),
      quantity: chalk.green(quantity)
    });

    const cart = await cartService.updateCartItem(req.user.userId, productId, quantity);
    
    const message = quantity < 1 
      ? 'Item removed from cart'
      : 'Cart updated successfully';

    res.json({
      status: 'success',
      message,
      data: cart
    });
  } catch (error) {
    logger.error(chalk.red('Error updating cart:'), error);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId; // Changed from req.user._id to req.user.userId
    
    logger.info(chalk.blue('🗑️ Attempting to remove item:'), {
      userId: chalk.cyan(userId),
      productId: chalk.yellow(productId)
    });
    
    const cart = await cartService.removeFromCart(userId, productId);
    res.json({ 
      status: 'success',
      message: 'Item removed from cart',
      data: cart 
    });
  } catch (error) {
    logger.error(chalk.red('Failed to remove item from cart:'), {
      error: error.message,
      userId: req.user?.userId,
      productId: req.params.productId
    });
    next(error);
  }
};

// Order Controllers
export const createOrder = async (req, res) => {
  try {
    logger.info(chalk.blue('🛒 Creating new order for user:'),
      chalk.cyan(req.user.userId)
    );

    const { addressId } = req.body; // Now optional
    const order = await orderService.createOrder(req.user.userId, addressId);

    // Log which address was used
    logger.info(chalk.green('✅ Order created with address:'),
      chalk.yellow(addressId || 'default')
    );

    res.status(201).json(order);
  } catch (error) {
    logger.error(chalk.red('Order creation failed:'),
      chalk.yellow(error.message)
    );
    res.status(400).json({ message: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    logger.info(chalk.blue('📋 Fetching orders for user:'), chalk.cyan(req.user.userId));
    const { status } = req.query;
    const query = { user: req.user.userId };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate(['items.product', 'deliveryAddress'])
      .sort('-createdAt');

    res.json(orders);
  } catch (error) {
    logger.error(chalk.red('Failed to fetch orders:'), chalk.yellow(error.message));
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.userId
    }).populate(['items.product', 'deliveryAddress']);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.json(order);
  } catch (error) {
    logger.error('Error in getOrderById:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { orderId, paymentDetails } = req.body;
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    order.paymentStatus = 'completed';
    order.paymentDetails = {
      ...paymentDetails,
      paidAt: new Date()
    };
    order.status = 'confirmed';

    await order.save();
    await order.populate(['items.product', 'deliveryAddress']);

    res.json(order);
  } catch (error) {
    logger.error('Error in processPayment:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const getPaidOrders = async (req, res) => {
  try {
    logger.info(chalk.blue('📋 Fetching paid orders for user:'), chalk.cyan(req.user.userId));
    
    const orders = await Order.find({
      user: req.user.userId,
      paymentStatus: 'completed'
    })
    .populate(['items.product', 'deliveryAddress'])
    .sort('-createdAt');

    res.json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error(chalk.red('Failed to fetch paid orders:'), chalk.yellow(error.message));
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

export const getOngoingOrders = async (req, res) => {
  try {
    logger.info(chalk.blue('📋 Fetching ongoing orders for user:'), chalk.cyan(req.user.userId));
    
    // Get orders that are not in final states (delivered or cancelled)
    const orders = await Order.find({
      user: req.user.userId,
      status: { 
        $in: ['pending', 'confirmed', 'preparing', 'ready'] 
      }
    })
    .populate(['items.product', 'deliveryAddress'])
    .sort('-createdAt');

    res.json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logger.error(chalk.red('Failed to fetch ongoing orders:'), chalk.yellow(error.message));
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

export const getReviewableProducts = async (req, res) => {
  try {
    logger.info(chalk.blue('🔍 Fetching reviewable products for user:'), 
      chalk.cyan(req.user.userId)
    );

    // Get delivered orders that haven't been reviewed yet
    const orders = await Order.find({
      user: req.user.userId,
      status: 'delivered'
    }).populate({
      path: 'items.product',
      select: 'name price imageUrl category'
    });

    // Get existing reviews
    const existingReviews = await Review.find({ user: req.user.userId });
    const reviewedProducts = new Set(existingReviews.map(r => r.product.toString()));

    // Filter products that haven't been reviewed
    const reviewableProducts = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.product && !reviewedProducts.has(item.product._id.toString())) {
          reviewableProducts.push({
            product: item.product,
            orderId: order._id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            deliveryDate: order.actualDeliveryTime
          });
        }
      });
    });

    logger.info(chalk.green('✅ Found reviewable products:'), {
      count: chalk.yellow(reviewableProducts.length)
    });

    res.json({
      status: 'success',
      count: reviewableProducts.length,
      data: reviewableProducts
    });

  } catch (error) {
    logger.error(chalk.red('❌ Error fetching reviewable products:'), {
      error: error.message,
      userId: req.user.userId,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      message: error.message || 'Error fetching reviewable products'
    });
  }
};

export const confirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    logger.info(chalk.blue('🔍 Checking order for delivery confirmation:'), {
      orderId: chalk.cyan(orderId),
      userId: chalk.yellow(req.user.userId)
    });

    // Check if order exists and belongs to user
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId
    });

    if (!order) {
      logger.warn(chalk.yellow('Order not found or does not belong to user'), {
        orderId,
        userId: req.user.userId
      });
      throw new ApiError(404, 'Order not found or does not belong to user');
    }

    // Log the current status of the order
    logger.info(chalk.blue('Order status check:'), {
      status: chalk.green(order.status),
      paymentStatus: chalk.green(order.paymentStatus)
    });

    // Ensure the order is in a valid status for delivery confirmation
    if (!['ready', 'confirmed', 'preparing'].includes(order.status)) {
      throw new ApiError(400, `Order cannot be confirmed as delivered. Current status: ${order.status}`);
    }

    // Update order status
    order.status = 'delivered';
    order.actualDeliveryTime = new Date();
    order.statusHistory.push({
      status: 'delivered',
      updatedBy: req.user.userId,
      timestamp: new Date()
    });

    await order.save();

    // Create notification
    await notificationService.createNotification({
      user: req.user.userId,
      title: 'Delivery Confirmed',
      message: `Thank you for confirming delivery of order #${order.orderNumber}`,
      type: 'order',
      orderId: order._id
    });

    logger.info(chalk.green('✅ Delivery confirmed successfully:'), {
      orderId: chalk.cyan(order._id),
      userId: chalk.yellow(req.user.userId)
    });

    res.json({
      status: 'success',
      message: 'Delivery confirmed successfully',
      data: order
    });

  } catch (error) {
    logger.error(chalk.red('❌ Error confirming delivery:'), {
      error: error.message,
      orderId: req.params.orderId,
      userId: req.user.userId
    });

    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};
