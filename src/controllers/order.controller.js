import * as orderService from '../services/order.service.js';
import * as cartService from '../services/cart.service.js';
import Cart from '../models/cart.model.js'; // Changed from named import to default import
import Order from '../models/order.model.js'; // Changed from named import to default import
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';

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
    const { productId, quantity } = req.body;
    let cart = await Cart.findOne({ user: req.user.userId });
    
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
    }

    const existingItem = cart.items.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    logger.error('Error in addToCart:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.userId });

    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );

    if (itemIndex === -1) {
      throw new ApiError(404, 'Item not found in cart');
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product');
    
    res.json(cart);
  } catch (error) {
    logger.error('Error in updateCartItem:', error);
    res.status(400).json({ message: error.message });
  }
};

// Order Controllers
export const createOrder = async (req, res) => {
  try {
    const { addressId } = req.body;
    const cart = await Cart.findOne({ user: req.user.userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    const order = new Order({
      user: req.user.userId,
      items: cart.items,
      total: cart.total,
      deliveryAddress: addressId
    });

    await order.save();
    await cart.delete();

    res.status(201).json(order);
  } catch (error) {
    logger.error('Error in createOrder:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
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
    logger.error('Error in getOrders:', error);
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
