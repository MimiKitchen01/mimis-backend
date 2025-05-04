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
      default: 'USD'
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
