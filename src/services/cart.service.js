import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
    await cart.save();
  }
  return cart;
};

export const validateCartItem = async (productId, quantity) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (!product.isAvailable) {
    throw new ApiError(400, 'Product is not available');
  }

  if (quantity < 1) {
    throw new ApiError(400, 'Quantity must be at least 1');
  }

  return product;
};

export const addToCart = async (userId, productId, quantity) => {
  logger.info(chalk.blue('🛒 Adding to cart:'), {
    userId: chalk.cyan(userId),
    productId: chalk.yellow(productId),
    quantity: chalk.green(quantity)
  });

  const product = await validateCartItem(productId, quantity);
  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(item =>
    item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      product: productId,
      quantity,
      price: product.price
    });
  }

  await cart.save();
  return cart.populate('items.product');
};

export const updateCartItem = async (userId, productId, quantity) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.find(item => item.product.equals(productId));
  if (!item) {
    throw new ApiError(404, 'Item not found in cart');
  }

  if (quantity <= 0) {
    cart.items = cart.items.filter(item => !item.product.equals(productId));
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  return cart.populate('items.product');
};

export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return cart;
};
