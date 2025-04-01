import * as orderService from '../services/order.service.js';
import * as cartService from '../services/cart.service.js';
import Cart from '../models/cart.model.js'; // Changed from named import to default import
import Product from '../models/product.model.js';
import Order from '../models/order.model.js'; // Changed from named import to default import
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

    // Get all products at once
    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    // Check if all products exist and are available
    const unavailableProducts = [];
    const notFoundProducts = [];
    
    productIds.forEach(id => {
      const product = products.find(p => p._id.toString() === id);
      if (!product) {
        notFoundProducts.push(id);
      } else if (!product.isAvailable) {
        unavailableProducts.push(product.name);
      }
    });

    if (notFoundProducts.length > 0) {
      throw new ApiError(404, `Products not found: ${notFoundProducts.join(', ')}`);
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

    // Process each item
    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      
      // Find if product already exists in cart
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.product.toString() === item.productId
      );

      if (existingItemIndex > -1) {
        // Update existing item quantity
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        cart.items.push({
          product: item.productId,
          quantity: item.quantity,
          price: product.price
        });
      }
    }

    // Recalculate total
    cart.total = cart.items.reduce((total, item) => {
      const product = products.find(p => p._id.toString() === item.product.toString());
      const itemPrice = product.discount?.isActive ? 
        (product.discountedPrice || product.price) : 
        product.price;
      return total + (itemPrice * item.quantity);
    }, 0);

    await cart.save();
    await cart.populate('items.product');

    res.json({
      status: 'success',
      message: 'Items added to cart successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error in addToCart:', {
      error: error.message,
      stack: error.stack,
      body: req.body
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
