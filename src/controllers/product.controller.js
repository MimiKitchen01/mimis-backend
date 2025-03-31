import * as productService from '../services/product.service.js';
import { formatImageUrls } from '../middleware/upload.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import Product from '../models/product.model.js';
import logger from '../utils/logger.js';
import * as imageService from '../services/image.service.js';

export const createProduct = async (req, res) => {
  try {
    logger.info('Product creation request:', {
      body: req.body,
      files: req.files
    });

    // Validate admin role
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can create products');
    }

    // Validate at least one image
    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'At least one image is required');
    }

    // Validate and upload all images
    const imageUrls = await Promise.all(
      req.files.map(file => imageService.uploadImage(file, req.user.userId, 'product'))
    );

    // Parse form data with validation
    const productData = {
      // Required fields
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      imageUrl: imageUrls[0],
      additionalImages: imageUrls.slice(1),

      // Optional fields with defaults
      isAvailable: req.body.isAvailable === 'true',
      isPopular: req.body.isPopular === 'true',
      isSpecial: req.body.isSpecial === 'true',

      // Optional fields that need parsing
      ...(req.body.preparationTime && {
        preparationTime: parseInt(req.body.preparationTime)
      }),
      ...(req.body.ingredients && {
        ingredients: JSON.parse(req.body.ingredients)
      }),
      ...(req.body.allergens && {
        allergens: JSON.parse(req.body.allergens)
      }),
      ...(req.body.dietaryInfo && {
        dietaryInfo: JSON.parse(req.body.dietaryInfo)
      }),
      ...(req.body.customizationOptions && {
        customizationOptions: JSON.parse(req.body.customizationOptions)
      }),
      ...(req.body.spicyLevel && {
        spicyLevel: req.body.spicyLevel
      })
    };

    // Handle discount data if provided
    if (req.body.discount) {
      try {
        const discountData = JSON.parse(req.body.discount);
        if (discountData.type && discountData.value) {
          productData.discount = {
            type: discountData.type,
            value: parseFloat(discountData.value),
            isActive: discountData.isActive === true,
            ...(discountData.startDate && { startDate: new Date(discountData.startDate) }),
            ...(discountData.endDate && { endDate: new Date(discountData.endDate) })
          };
        }
      } catch (error) {
        logger.warn('Invalid discount data format:', error);
      }
    }

    // Add nutrition info if any field is provided
    const nutritionFields = ['calories', 'protein', 'carbohydrates', 'fats', 'fiber'];
    const hasNutrition = nutritionFields.some(field => req.body[field]);
    
    if (hasNutrition) {
      productData.nutritionInfo = {};
      nutritionFields.forEach(field => {
        if (req.body[field]) {
          productData.nutritionInfo[field] = parseFloat(req.body[field]);
        }
      });
    }

    // Validate required fields only
    const requiredFields = ['name', 'description', 'price', 'category'];
    const missingFields = requiredFields.filter(field => !productData[field]);

    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Debug log parsed data
    logger.info('Parsed product data:', productData);

    const product = await Product.create(productData);
    
    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Error in createProduct:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files
    });

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON format in one of the fields'
      });
    }

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
    // Validate admin role
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can update products');
    }

    let updateData = { ...req.body };

    // Handle files if included
    if (req.files?.length) {
      updateData.imageUrl = req.files[0].location;
      if (req.files.length > 1) {
        updateData.additionalImages = req.files.slice(1).map(file => file.location);
      }
    }

    // Parse JSON fields
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

    // Handle discount updates
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

    // Remove discount if requested
    if (updateData.removeDiscount === 'true') {
      updateData.discount = {
        type: null,
        value: 0,
        isActive: false,
        startDate: null,
        endDate: null
      };
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    // Validate admin role
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can delete products');
    }

    logger.info(chalk.blue('🗑️ Delete product request:'), {
      productId: chalk.cyan(req.params.id),
      adminId: chalk.yellow(req.user.userId)
    });

    await productService.deleteProduct(req.params.id);

    res.json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(chalk.red('Failed to delete product:'), {
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
