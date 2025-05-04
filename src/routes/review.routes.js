import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import auth from '../middleware/auth.js';
import multer from 'multer';
import logger from '../utils/logger.js';  // Add logger import
import chalk from 'chalk';  // Add chalk for better logging

const upload = multer(); // Fallback to memory storage if S3 is not available
const router = express.Router();

// Create review
router.post('/', auth, async (req, res, next) => {
  try {
    logger.info(chalk.blue('📝 New review request received:'), {
      userId: chalk.cyan(req.user.userId),
      orderId: chalk.yellow(req.body.orderId),
      productCount: chalk.green(req.body.productReviews?.length)
    });

    await reviewController.createReview(req, res, next);
  } catch (error) {
    logger.error(chalk.red('❌ Review creation failed:'), {
      error: error.message,
      userId: req.user?.userId,
      stack: error.stack
    });

    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to create review'
    });
  }
});

// Get product reviews
router.get('/product/:productId', 
  reviewController.getProductReviews
);

// Get user reviews
router.get('/user', 
  auth,
  reviewController.getUserReviews
);

// Update review
router.patch('/:reviewId',
  auth,
  reviewController.updateReview
);

// Delete review
router.delete('/:reviewId',
  auth,
  reviewController.deleteReview
);

export default router;
