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
