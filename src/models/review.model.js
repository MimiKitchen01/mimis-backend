import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  images: [{
    type: String
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one review per product per order
reviewSchema.index({ product: 1, order: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
