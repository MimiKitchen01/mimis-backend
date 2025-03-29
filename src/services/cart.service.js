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
  logger.info(chalk.blue('🛒 Updating cart item:'), {
    userId: chalk.cyan(userId),
    productId: chalk.yellow(productId),
    quantity: chalk.green(quantity)
  });

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  // Find the item index in the cart
  const itemIndex = cart.items.findIndex(item => 
    item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, 'Item not found in cart');
  }

  // If quantity is less than 1, remove the item
  if (quantity < 1) {
    logger.info(chalk.yellow('🗑️ Removing item from cart due to quantity < 1'));
    cart.items = cart.items.filter(item => 
      !item.product.equals(productId)
    );
  } else {
    cart.items[itemIndex].quantity = quantity;
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

export const removeFromCart = async (userId, productId) => {
  logger.info(chalk.blue('🗑️ Removing from cart:'), {
    userId: chalk.cyan(userId),
    productId: chalk.yellow(productId)
  });

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  // Remove the item from cart.items array
  cart.items = cart.items.filter(item => !item.product.equals(productId));
  
  await cart.save();
  return cart.populate('items.product');
};
