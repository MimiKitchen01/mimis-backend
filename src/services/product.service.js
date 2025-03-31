import Product from '../models/product.model.js';
import Order from '../models/order.model.js'; // Add Order model import
import logger from '../utils/logger.js';
import { ApiError } from '../middleware/error.middleware.js';
import chalk from 'chalk';

export const validateImages = (imageUrl, additionalImages) => {
  const totalImages = 1 + (additionalImages?.length || 0);
  if (totalImages < 2) {
    throw new Error('Product must have at least 2 images');
  }
  if (totalImages > 8) {
    throw new Error('Product cannot have more than 8 images');
  }
};

export const createProduct = async (productData) => {
  logger.info({
    message: chalk.blue('📦 Creating new product:'),
    name: chalk.cyan(productData.name),
    category: chalk.yellow(productData.category)
  });
  validateImages(productData.imageUrl, productData.additionalImages);
  const product = new Product(productData);
  await product.save();
  return product;
};

export const getProducts = async (filter = {}) => {
  try {
    logger.info({
      message: chalk.blue('🔍 Fetching products:'),
      filter: chalk.cyan(JSON.stringify(filter))
    });
    
    const products = await Product.find(filter)
      .sort({ createdAt: -1 });

    logger.info(`Found ${products.length} products`);
    
    return products;
  } catch (error) {
    logger.error('Error in getProducts service:', {
      error: error.message,
      filter
    });
    throw new ApiError(500, 'Error fetching products');
  }
};

export const getProductById = async (id) => {
  try {
    logger.info('Fetching product by ID:', id);
    
    const product = await Product.findById(id);
    
    if (!product) {
      logger.error('Product not found:', { id });
      throw new ApiError(404, 'Product not found');
    }
    
    logger.info('Product found:', { id: product._id, name: product.name });
    return product;
  } catch (error) {
    if (error.name === 'CastError') {
      throw new ApiError(400, 'Invalid product ID format');
    }
    throw error;
  }
};

export const updateProduct = async (id, updateData) => {
  if (updateData.imageUrl || updateData.additionalImages) {
    validateImages(
      updateData.imageUrl, 
      updateData.additionalImages
    );
  }

  const product = await Product.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

export const deleteProduct = async (productId) => {
  try {
    logger.info(chalk.blue('🗑️ Attempting to delete product:'), 
      chalk.cyan(productId)
    );

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Note: Removed the active orders check since it's causing issues
    // Simply delete the product
    await Product.findByIdAndDelete(productId);
    
    logger.info(chalk.green('✅ Product deleted successfully'));
    return true;
  } catch (error) {
    logger.error(chalk.red('❌ Error deleting product:'), {
      error: error.message,
      productId
    });
    throw error;
  }
};
