import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  orderCount: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: true
  },
  discountedPrice: {
    type: Number
  },
  ingredients: [{
    type: String,
    required: true
  }],
  imageUrl: {
    type: String,
    required: true
  },
  additionalImages: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number
  }
}, {
  timestamps: true
});

// Add validation for total number of images
productSchema.pre('save', function(next) {
  const totalImages = 1 + (this.additionalImages?.length || 0); // Main image + additional images
  if (totalImages < 2) {
    next(new Error('Product must have at least 2 images'));
  } else if (totalImages > 8) {
    next(new Error('Product cannot have more than 8 images'));
  } else {
    next();
  }
});

export default mongoose.model('Product', productSchema);
