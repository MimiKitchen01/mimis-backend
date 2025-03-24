import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import streamClient from '../config/stream.config.js';

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
  return user;
};

const generateAuthTokens = async (user) => {
  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Generate Stream Chat token
  const streamToken = streamClient.createToken(user._id.toString());

  return {
    token,
    chat: {
      token: streamToken,
      apiKey: process.env.STREAM_API_KEY
    }
  };
};

export const loginUser = async (email, password, role = 'user') => {
  logger.info({
    message: chalk.blue('🔑 Login attempt:'),
    email: chalk.cyan(email),
    role: chalk.yellow(role)
  });

  const query = { email };
  if (role === 'admin') {
    query.role = 'admin';
  }

  const user = await User.findOne(query);
  if (!user || !(await user.comparePassword(password))) {
    throw new Error(`Invalid ${role} credentials`);
  }

  if (!user.isVerified) {
    throw new Error('Please verify your email first');
  }

  const tokens = await generateAuthTokens(user);

  return {
    user,
    ...tokens
  };
};
