import * as productService from '../services/product.service.js';
import { formatImageUrls } from '../middleware/upload.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';

export const createProduct = async (req, res, next) => {
  try {
    // Handle multipart form data
    const productData = {
      ...req.body,
      ingredients: JSON.parse(req.body.ingredients),
      ...formatImageUrls(req.files)
    };

    const product = await productService.createProduct(productData);
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
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
    await productService.deleteProduct(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
