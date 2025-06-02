import Category from '../models/category.model.js';
import Product from '../models/product.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const createCategory = async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new ApiError(400, 'Category with this name already exists');
    }

    const category = await Category.create({
      name,
      description,
      sortOrder: sortOrder || 0
    });

    logger.info(chalk.green('✅ Category created:'), chalk.cyan(name));

    res.status(201).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    logger.error(chalk.red('❌ Error creating category:'), error.message);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ sortOrder: 1, name: 1 });

    res.json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, description, isActive, sortOrder } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        throw new ApiError(400, 'Category with this name already exists');
      }
      category.name = name;
    }

    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;

    await category.save();

    logger.info(chalk.green('✅ Category updated:'), chalk.cyan(category.name));

    res.json({
      status: 'success',
      data: category
    });
  } catch (error) {
    logger.error(chalk.red('❌ Error updating category:'), error.message);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    // Check if category is being used by products
    const productsUsingCategory = await Product.countDocuments({ category: req.params.id });
    if (productsUsingCategory > 0) {
      throw new ApiError(400, `Cannot delete category. It is being used by ${productsUsingCategory} products.`);
    }

    await category.deleteOne();

    logger.info(chalk.green('✅ Category deleted:'), chalk.cyan(category.name));

    res.json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error(chalk.red('❌ Error deleting category:'), error.message);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};
