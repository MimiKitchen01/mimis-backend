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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required'],
    validate: {
      validator: async function (v) {
        const category = await mongoose.model('Category').findById(v);
        return category !== null;
      },
      message: 'Selected category does not exist'
    }
  },
  imageUrl: {
    type: String,
    required: [true, 'Product image is required']
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
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
    required: [true, 'Spicy level is required'],
    enum: ['Not Spicy', 'Mild', 'Medium', 'Hot', 'Extra Hot']
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
productSchema.virtual('discountedPrice').get(function () {
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

// Indexes for performance optimization
productSchema.index({ category: 1, isAvailable: 1 }); // Compound index for filtering by category and availability
productSchema.index({ isAvailable: 1, createdAt: -1 }); // For listing available products
productSchema.index({ price: 1 }); // For price-based sorting
productSchema.index({ 'ratings.average': -1 }); // For sorting by rating
productSchema.index({ orderCount: -1 }); // For sorting by popularity
productSchema.index({ isPopular: 1, isAvailable: 1 }); // For popular products
productSchema.index({ isSpecial: 1, isAvailable: 1 }); // For special offers
productSchema.index({ createdAt: -1 }); // For sorting by newest
productSchema.index({ name: 'text', description: 'text' }); // Full-text search on name and description

// Update image validation to require minimum 1 image
productSchema.pre('save', function (next) {
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
