import mongoose from 'mongoose';
import { PRODUCT_CATEGORIES, SPICY_LEVELS } from '../constants/index.js';

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
  price: {
    type: Number,
    required: true,
    min: 0
  },
  preparationTime: {
    type: Number,
    min: 1,
    description: 'Preparation time in minutes'
  },
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number,
    fiber: Number
  },
  ingredients: [{
    type: String
  }],
  spicyLevel: {
    type: String,
    enum: SPICY_LEVELS,
    default: 'Not Spicy'
  },
  allergens: [{
    type: String
  }],
  dietaryInfo: [{
    type: String
  }],
  category: {
    type: String,
    required: true,
    enum: PRODUCT_CATEGORIES
  },
  imageUrl: {
    type: String,
    required: true
  },
  additionalImages: [{
    type: String
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isSpecial: {
    type: Boolean,
    default: false
  },
  customizationOptions: [{
    name: String,
    options: [{
      name: String,
      price: Number
    }]
  }],
  ratings: {
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
  }
}, {
  timestamps: true
});

// Validate number of images
productSchema.pre('save', function(next) {
  const totalImages = 1 + (this.additionalImages?.length || 0);
  if (totalImages < 2) {
    next(new Error('Product must have at least 2 images'));
  } else if (totalImages > 8) {
    next(new Error('Product cannot have more than 8 images'));
  } else {
    next();
  }
});

export default mongoose.model('Product', productSchema);
