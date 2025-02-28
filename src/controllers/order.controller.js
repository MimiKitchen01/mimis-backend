import * as orderService from '../services/order.service.js';
import * as cartService from '../services/cart.service.js';

// Cart Controllers
export const getCart = async (req, res) => {
  try {
    const cart = await cartService.getOrCreateCart(req.user.userId);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user.userId, productId, quantity);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.updateCartItem(req.user.userId, productId, quantity);
    res.json(cart);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Order Controllers
export const createOrder = async (req, res) => {
  try {
    const { addressId } = req.body;
    const order = await orderService.createOrder(req.user.userId, addressId);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await orderService.getOrders(req.user.userId, status);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { orderId, paymentDetails } = req.body;
    const order = await orderService.processPayment(orderId, paymentDetails);
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
