import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  imageUrl: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Add static method to create admin
userSchema.statics.createAdmin = async function(adminData) {
  const admin = new this({
    email: adminData.email,
    password: adminData.password,
    fullName: adminData.fullName || adminData.email.split('@')[0],
    role: ROLES.ADMIN,
    isVerified: true
  });
  return admin.save();
};

export default mongoose.model('User', userSchema);
