import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import * as notificationService from './notification.service.js';


export const generateOTP = () => {
  // Generate 5-digit OTP (10000 to 99999)
  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const createUser = async (userData) => {
  logger.info({
    message: chalk.blue('👤 Creating new user:'),
    email: chalk.cyan(userData.email)
  });

  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const otp = {
    code: generateOTP(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  };

  const user = new User({
    ...userData,
    otp,
  });

  await user.save();
  return { user, otpCode: otp.code };
};


export const verifyUserOTP = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if (user.otp.code !== otp || user.otp.expiresAt < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  user.isVerified = true;
  user.otp = undefined;
  await user.save();

  // Generate token for auto-login
  const { token } = await generateAuthTokens(user);

  return { user, token };
};

const generateAuthTokens = async (user) => {
  // Generate JWT token with 3 months expiration
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }  // Changed to 90 days (3 months)
  );

  return {
    token
  };
};

export const loginUser = async (email, password) => {
  logger.info({
    message: chalk.blue('🔑 Universal login attempt:'),
    email: chalk.cyan(email)
  });

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error('Invalid email or password');
  }


  if (!user.isVerified) {
    throw new Error('Please verify your email first');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const { token } = await generateAuthTokens(user);

  // Trigger login notification with a intentional delay
  // This avoids a race condition where the notification is sent before the app 
  // has a chance to register/update its FCM token after a fresh login.
  setTimeout(() => {
    notificationService.sendPushNotification(user._id, {
      title: 'Login Alert',
      body: `New login detected on your account at ${new Date().toLocaleTimeString()}`,
      data: { type: 'login_alert' }
    }).catch(err => logger.error('Delayed login notification failed:', err));
  }, 10000); // 10 second delay

  return {
    user,
    token
  };
};

