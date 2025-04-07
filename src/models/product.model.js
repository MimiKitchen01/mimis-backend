import mongoose from 'mongoose';
import { PRODUCT_CATEGORIES } from '../constants/index.js';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: PRODUCT_CATEGORIES
  },
  imageUrl: {
    type: String,
    required: [true, 'Product image is required']
  },
  description: {
    type: String,
    default: ''
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
    default: 'Not Spicy'
  },
  allergens: [{
    type: String
  }],
  dietaryInfo: [{
    type: String
  }],
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
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed', null],
      default: null
    },
    value: {
      type: Number,
      min: 0,
      default: 0
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
  if (!this.discount?.isActive) return this.price;
  
  const now = new Date();
  if (this.discount.startDate && now < this.discount.startDate) return this.price;
  if (this.discount.endDate && now > this.discount.endDate) return this.price;

  if (this.discount.type === 'percentage') {
    return this.price * (1 - this.discount.value / 100);
  } else if (this.discount.type === 'fixed') {
    return Math.max(0, this.price - this.discount.value);
  }
  
  return this.price;
});

// Update image validation to require minimum 1 image
productSchema.pre('save', function(next) {
  const totalImages = 1 + (this.additionalImages?.length || 0);
  if (totalImages < 1) {
    next(new Error('Product must have at least 1 image'));
  } else if (totalImages > 8) {
    next(new Error('Product cannot have more than 8 images'));
  } else {
    next();
  }
});

export default mongoose.model('Product', productSchema);
