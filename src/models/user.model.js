import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/index.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    validate: {
      validator: function (v) {
        // Password not required for social auth
        return this.google.id ? true : Boolean(v);
      },
      message: 'Password is required for email registration'
    }
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  // Profile Info
  phoneNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function (v) {
        return !v || /^\+?[\d\s-]{10,}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  imageUrl: {
    type: String,
    default: null,
    validate: {
      validator: function (v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function (v) {
        return !v || v <= new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },

  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: {
      values: Object.values(ROLES),
      message: '{VALUE} is not a valid role'
    },
    default: ROLES.USER
  },

  // Verification
  otp: {
    code: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^\d{5}$/.test(v);
        },
        message: 'OTP must be a 5-digit number'
      }
    },
    expiresAt: Date
  },
  resetOTP: {
    code: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^\d{5}$/.test(v);
        },
        message: 'Reset OTP must be a 5-digit number'
      }
    },
    expiresAt: Date
  },

  // Social Auth
  google: {
    id: String,
    email: String,
    name: String,
    picture: String,
    accessToken: String,
    refreshToken: String
  },

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'es', 'fr'],
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    dietaryPreferences: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher']
    }]
  },

  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'google.id': 1 });
userSchema.index({ role: 1 });

// Password hashing middleware
userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lastLogin = new Date();
  await this.save();
};

// Static methods
userSchema.statics.createAdmin = async function (adminData) {
  logger.info(chalk.blue('👤 Creating new admin user:'), chalk.cyan(adminData.email));

  const admin = new this({
    ...adminData,
    role: ROLES.ADMIN,
    isVerified: true
  });

  await admin.save();
  logger.info(chalk.green('✅ Admin created successfully'));

  return admin;
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Export model
export default mongoose.model('User', userSchema);
