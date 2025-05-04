import Review from '../models/review.model.js';
import Product from '../models/product.model.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import chalk from 'chalk';

export const createReview = async (req, res) => {
  try {
    const { orderId, productReviews } = req.body;

    if (!orderId || !productReviews || !Array.isArray(productReviews)) {
      throw new ApiError(400, 'Invalid review data provided');
    }

    // Validate order
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.userId,
      status: 'delivered'
    });

    if (!order) {
      throw new ApiError(404, 'Order not found or not eligible for review');
    }

    // Validate products belong to order
    const orderProductIds = order.items.map(item => item.product.toString());
    
    const reviews = [];
    for (const review of productReviews) {
      if (!orderProductIds.includes(review.productId)) {
        throw new ApiError(400, 'Product does not belong to this order');
      }

      // Check if product already reviewed
      const existingReview = await Review.findOne({
        order: orderId,
        product: review.productId,
        user: req.user.userId
      });

      if (existingReview) {
        throw new ApiError(400, 'Product already reviewed');
      }

      // Create review
      const newReview = new Review({
        user: req.user.userId,
        order: orderId,
        product: review.productId,
        rating: review.rating,
        comment: review.comment,
        images: review.images || []
      });

      await newReview.save();
      reviews.push(newReview);

      // Update product rating
      await updateProductRating(review.productId);
    }

    logger.info(chalk.green('✅ Reviews created successfully:'), {
      orderId: chalk.cyan(orderId),
      count: chalk.yellow(reviews.length)
    });

    res.status(201).json({
      status: 'success',
      message: 'Reviews created successfully',
      data: reviews
    });

  } catch (error) {
    logger.error(chalk.red('❌ Review creation failed:'), {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.body?.orderId
    });

    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to create review'
    });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'fullName imageUrl')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ product: productId });

    res.json({
      status: 'success',
      data: {
        reviews,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting product reviews:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.userId })
      .populate('product', 'name imageUrl')
      .sort('-createdAt');

    res.json({
      status: 'success',
      data: reviews
    });
  } catch (error) {
    logger.error('Error getting user reviews:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { reviewId } = req.params;

    const review = await Review.findOne({
      _id: reviewId,
      user: req.user.userId
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        throw new ApiError(400, 'Rating must be between 1 and 5');
      }
      review.rating = rating;
    }

    if (comment) {
      review.comment = comment;
    }

    await review.save();
    await updateProductRatings(review.product);

    res.json({
      status: 'success',
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    logger.error('Error updating review:', error);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.reviewId,
      user: req.user.userId
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    const productId = review.product;
    await review.deleteOne();
    await updateProductRatings(productId);

    res.json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting review:', error);
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Helper function to update product ratings
const updateProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  await Product.findByIdAndUpdate(productId, {
    'ratings.average': stats[0]?.averageRating || 0,
    'ratings.count': stats[0]?.count || 0
  });
};

// Helper function to update product rating
const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

  await Product.findByIdAndUpdate(productId, {
    'ratings.average': averageRating,
    'ratings.count': reviews.length
  });
};
