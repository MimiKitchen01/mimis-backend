import * as productService from '../services/product.service.js';
import { formatImageUrls } from '../middleware/upload.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import Product from '../models/product.model.js';
import logger from '../utils/logger.js';
import chalk from 'chalk'; // Add chalk import
import * as imageService from '../services/image.service.js';

export const createProduct = async (req, res) => {
  try {
    // Check admin authorization
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can create products');
    }

    // Validate required fields
    const requiredFields = ['name', 'price', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'Product image is required');
    }

    // Create product with only required fields
    const productData = {
      name: req.body.name,
      price: parseFloat(req.body.price),
      category: req.body.category,
      imageUrl: req.files[0].location // Main image
    };

    // Optional: Add additional images if provided
    if (req.files.length > 1) {
      productData.additionalImages = req.files.slice(1).map(file => file.location);
    }

    const product = await Product.create(productData);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error in createProduct:', error);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    logger.info('Getting all products with query:', req.query);

    const { category, tags, isPopular, search } = req.query;
    const filter = {};

    // Build filter
    if (category) {
      filter.category = category;
    }
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    if (isPopular === 'true') {
      filter.isPopular = true;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add availability filter by default
    filter.isAvailable = true;

    logger.info('Applying filter:', filter);

    // Get products
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    logger.info(`Found ${products.length} products`);

    res.json({
      count: products.length,
      products
    });
  } catch (error) {
    logger.error('Error in getAllProducts:', error);
    res.status(500).json({ 
      message: 'Error fetching products',
      error: error.message 
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    logger.info('Getting product details:', {
      productId: req.params.id
    });

    const product = await productService.getProductById(req.params.id);
    
    res.json({
      message: 'Product retrieved successfully',
      product
    });
  } catch (error) {
    logger.error('Error getting product:', {
      error: error.message,
      productId: req.params.id
    });

    res.status(error.statusCode || 404).json({ 
      status: 'error',
      message: error.message
    });
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can update products');
    }

    // Convert form data to appropriate types
    const updateData = {
      ...req.body,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      isAvailable: req.body.isAvailable === 'true',
      isPopular: req.body.isPopular === 'true',
      isSpecial: req.body.isSpecial === 'true'
    };

    // Parse JSON fields if they exist
    const jsonFields = ['ingredients', 'allergens', 'dietaryInfo', 'customizationOptions'];
    jsonFields.forEach(field => {
      if (updateData[field]) {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (error) {
          logger.warn(`Invalid JSON for field ${field}:`, error);
        }
      }
    });

    // Handle discount if provided
    if (updateData.discount) {
      try {
        const discountData = JSON.parse(updateData.discount);
        updateData.discount = {
          type: discountData.type,
          value: parseFloat(discountData.value),
          isActive: discountData.isActive === true,
          ...(discountData.startDate && { startDate: new Date(discountData.startDate) }),
          ...(discountData.endDate && { endDate: new Date(discountData.endDate) })
        };
      } catch (error) {
        logger.warn('Invalid discount data format:', error);
        delete updateData.discount;
      }
    }

    // Remove undefined and null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    if (!updatedProduct) {
      throw new ApiError(404, 'Product not found');
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    logger.error('Error updating product:', {
      error: error.message,
      productId: req.params.id,
      updateData: req.body
    });
    next(error);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can delete products');
    }

    logger.info('🗑️ Delete product request:', {
      productId: req.params.id,
      adminId: req.user.userId
    });

    await productService.deleteProduct(req.params.id);

    res.json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete product:', {
      error: error.message,
      productId: req.params.id
    });

    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to delete product'
    });
  }
};

export const getAllProductsForAdmin = async (req, res) => {
  try {
    logger.info('Admin fetching all products with query:', req.query);

    const { category, isAvailable, isPopular, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Build filter
    if (category) filter.category = category;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (isPopular !== undefined) filter.isPopular = isPopular === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    
    res.json({
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      products
    });
  } catch (error) {
    logger.error('Error in getAllProductsForAdmin:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const toggleProductAvailability = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.json({
      message: `Product availability toggled to ${product.isAvailable}`,
      product
    });
  } catch (error) {
    logger.error('Error in toggleProductAvailability:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const markProductAsPopular = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    product.isPopular = true;
    await product.save();

    res.json({
      message: 'Product marked as popular successfully',
      product
    });
  } catch (error) {
    logger.error('Error in markProductAsPopular:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Add a new endpoint for managing discounts
export const updateProductDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, value, startDate, endDate, isActive } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    product.discount = {
      type,
      value: parseFloat(value),
      isActive: isActive === true,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) })
    };

    await product.save();

    res.json({
      status: 'success',
      message: 'Product discount updated successfully',
      data: {
        product,
        discountedPrice: product.discountedPrice
      }
    });
  } catch (error) {
    logger.error('Error updating product discount:', error);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getRandomProducts = async (req, res) => {
  try {
    const { category, tags, isPopular, search } = req.query;
    logger.info('Getting random products with filters:', { category, tags, isPopular, search });

    // Build match condition
    const matchCondition = { isAvailable: true };

    if (category) {
      matchCondition.category = category;
    }
    if (tags) {
      matchCondition.tags = { $in: tags.split(',') };
    }
    if (isPopular === 'true') {
      matchCondition.isPopular = true;
    }
    if (search) {
      matchCondition.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.aggregate([
      { $match: matchCondition },
      { $sample: { size: 6 } },
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          imageUrl: 1,
          category: 1,
          isPopular: 1,
          tags: 1,
          ratings: 1,
          discountedPrice: 1,
          discount: 1
        }
      }
    ]);

    res.json({
      status: 'success',
      count: products.length,
      data: products,
      filters: { category, tags, isPopular, search }
    });
  } catch (error) {
    logger.error('Error getting random products:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

export const getMostOrderedProducts = async (req, res) => {
  try {
    const { category, tags, isPopular, search, limit = 6 } = req.query;
    
    logger.info('Getting most ordered products with filters:', {
      category, tags, isPopular, search, limit
    });

    // Build match condition
    const matchCondition = { isAvailable: true };

    if (category) {
      matchCondition.category = category;
    }
    if (tags) {
      matchCondition.tags = { $in: tags.split(',') };
    }
    if (isPopular === 'true') {
      matchCondition.isPopular = true;
    }
    if (search) {
      matchCondition.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.aggregate([
      { $match: matchCondition },
      {
        $sort: { 
          orderCount: -1,
          'ratings.average': -1
        }
      },
      { $limit: parseInt(limit) },
      {
        $project: {
          name: 1,
          description: 1,
          price: 1,
          imageUrl: 1,
          category: 1,
          orderCount: 1,
          tags: 1,
          ratings: 1,
          discount: 1,
          discountedPrice: 1,
          isPopular: 1
        }
      }
    ]);

    res.json({
      status: 'success',
      count: products.length,
      data: products,
      filters: { category, tags, isPopular, search, limit }
    });
  } catch (error) {
    logger.error('Error getting most ordered products:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
};
