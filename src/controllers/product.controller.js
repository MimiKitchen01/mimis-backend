import * as productService from '../services/product.service.js';
import { formatImageUrls } from '../middleware/upload.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import Product from '../models/product.model.js';
import logger from '../utils/logger.js';
import * as imageService from '../services/image.service.js';

export const createProduct = async (req, res) => {
  try {
    // Debug log to check incoming data
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
      name: req.body.name,
      description: req.body.description,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      preparationTime: req.body.preparationTime ? parseInt(req.body.preparationTime) : undefined,
      nutritionInfo: {
        calories: req.body.calories ? parseInt(req.body.calories) : undefined,
        protein: req.body.protein ? parseFloat(req.body.protein) : undefined,
        carbohydrates: req.body.carbohydrates ? parseFloat(req.body.carbohydrates) : undefined,
        fats: req.body.fats ? parseFloat(req.body.fats) : undefined,
        fiber: req.body.fiber ? parseFloat(req.body.fiber) : undefined
      },
      ingredients: req.body.ingredients ? JSON.parse(req.body.ingredients) : undefined,
      spicyLevel: req.body.spicyLevel,
      allergens: req.body.allergens ? JSON.parse(req.body.allergens) : [],
      dietaryInfo: req.body.dietaryInfo ? JSON.parse(req.body.dietaryInfo) : [],
      category: req.body.category,
      isAvailable: req.body.isAvailable === 'true',
      isPopular: req.body.isPopular === 'true',
      isSpecial: req.body.isSpecial === 'true',
      customizationOptions: req.body.customizationOptions 
        ? JSON.parse(req.body.customizationOptions) 
        : [],
      imageUrl: imageUrls[0],
      additionalImages: imageUrls.slice(1)
    };

    // Debug log parsed data
    logger.info('Parsed product data:', productData);

    // Validate required fields
    const requiredFields = [
      'name', 'description', 'price', 'preparationTime',
      'calories', 'ingredients', 'category'
    ];
    
    const missingFields = requiredFields.filter(field => {
      if (field === 'calories') {
        return productData.nutritionInfo.calories === undefined;
      }
      return !productData[field];
    });

    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const product = await Product.create(productData);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    logger.error('Error in createProduct:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files
    });
    res.status(error.statusCode || 400).json({ message: error.message });
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
    
    // Handle image updates if files are included
    if (req.files?.length) {
      updateData = {
        ...updateData,
        ...formatImageUrls(req.files)
      };
    }

    // Parse ingredients if included
    if (updateData.ingredients) {
      updateData.ingredients = JSON.parse(updateData.ingredients);
    }

    const product = await productService.updateProduct(req.params.id, updateData);
    
    res.json({
      message: 'Product updated successfully',
      product
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

    await productService.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
