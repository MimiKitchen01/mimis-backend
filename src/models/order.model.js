import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    required: true
  },
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentId: String,
  paymentDetails: {
    method: String,
    transactionId: String,
    paidAt: Date,
    amount: Number,
    currency: {
      type: String,
      default: 'EUR'
    }
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: [
        ...Object.values(ORDER_STATUS),
        'payment_pending',
        'payment_completed',
        'payment_failed'
      ]
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  estimatedDeliveryTime: {
    type: Date
  },
  actualDeliveryTime: {
    type: Date
  },
  cancellationReason: {
    type: String,
    enum: [
      'CUSTOMER_REQUEST',
      'PAYMENT_FAILED',
      'OUT_OF_STOCK',
      'RESTAURANT_CLOSED',
      'OTHER'
    ]
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for performance optimization
orderSchema.index({ orderNumber: 1 }, { unique: true }); // Unique index for order number lookups
orderSchema.index({ user: 1, createdAt: -1 }); // Compound index for user's orders sorted by date
orderSchema.index({ user: 1, status: 1 }); // Compound index for filtering user's orders by status
orderSchema.index({ status: 1, createdAt: -1 }); // For admin dashboard - orders by status and date
orderSchema.index({ paymentStatus: 1 }); // For payment status filtering
orderSchema.index({ createdAt: -1 }); // For sorting all orders by date
orderSchema.index({ 'items.product': 1 }); // For product-based order queries

// Add pre-save hook for status history
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

export default mongoose.model('Order', orderSchema);
