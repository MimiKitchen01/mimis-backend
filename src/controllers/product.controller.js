import * as productService from '../services/product.service.js';
import { formatImageUrls } from '../middleware/upload.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import Product from '../models/product.model.js';
import logger from '../utils/logger.js';
import * as imageService from '../services/image.service.js';

export const createProduct = async (req, res) => {
  try {
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

    // Parse form data
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      preparationTime: parseInt(req.body.preparationTime),
      nutritionInfo: {
        calories: parseInt(req.body.calories),
        protein: parseFloat(req.body.protein),
        carbohydrates: parseFloat(req.body.carbohydrates),
        fats: parseFloat(req.body.fats),
        fiber: parseFloat(req.body.fiber)
      },
      ingredients: JSON.parse(req.body.ingredients),
      spicyLevel: req.body.spicyLevel,
      allergens: JSON.parse(req.body.allergens),
      dietaryInfo: JSON.parse(req.body.dietaryInfo),
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

    // Validate required fields
    const requiredFields = [
      'name', 'description', 'price', 'preparationTime',
      'calories', 'ingredients', 'category'
    ];
    
    for (const field of requiredFields) {
      if (!productData[field]) {
        throw new ApiError(400, `${field} is required`);
      }
    }

    const product = await Product.create(productData);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    logger.error('Error in createProduct:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { category, tags, isPopular } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (isPopular === 'true') filter.isPopular = true;

    const products = await productService.getProducts(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(404).json({ message: error.message });
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
