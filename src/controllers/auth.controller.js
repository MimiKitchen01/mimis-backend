import * as authService from '../services/auth.service.js';
import * as emailService from '../services/email.service.js';
import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';
import { randomBytes } from 'crypto';
import {
  getResetOTPTemplate,
  getPasswordResetConfirmationTemplate
} from '../templates/emailTemplates.js';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';

export const register = async (req, res) => {
  try {
    logger.info(chalk.blue('📝 New user registration:'), chalk.cyan(req.body.email));
    const { user, otpCode } = await authService.createUser(req.body);
    await emailService.sendOTPEmail(user.email, otpCode, user.fullName);
    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (error) {
    logger.error(chalk.red('Registration failed:'), chalk.yellow(error.message));
    res.status(400).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const user = await authService.verifyUserOTP(req.body.email, req.body.otp);
    await emailService.sendWelcomeEmail(user.email, user.fullName);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    logger.info(chalk.blue('🔑 Login attempt:'), chalk.cyan(req.body.email));
    const { token, user } = await authService.loginUser(req.body.email, req.body.password);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        imageUrl: user.imageUrl
      }
    });
  } catch (error) {
    logger.error(chalk.red('Login failed:'), chalk.yellow(error.message));
    res.status(401).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -otp');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'User not found with this email');
    }

    // Generate 5-digit OTP (10000 to 99999)
    const resetOTP = Math.floor(10000 + Math.random() * 90000).toString();
    const resetOTPExpiry = Date.now() + 600000; // 10 minutes

    // Save OTP to user
    user.resetOTP = {
      code: resetOTP,
      expiresAt: resetOTPExpiry
    };
    await user.save();

    logger.info(chalk.blue('📧 Generated OTP:'), chalk.cyan(resetOTP));

    // Send OTP email
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset OTP',
      html: getResetOTPTemplate(user.fullName, resetOTP)
    });

    res.json({
      message: 'Password reset OTP sent to email',
      email: user.email,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    logger.error(chalk.red('Forgot password error:'), chalk.yellow(error.message));
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      'resetOTP.code': otp,
      'resetOTP.expiresAt': { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    res.json({
      message: 'OTP verified successfully',
      email: user.email
    });
  } catch (error) {
    logger.error('Verify reset OTP error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      'resetOTP.code': otp,
      'resetOTP.expiresAt': { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Please verify your OTP first');
    }

    // Update password and clear reset OTP
    user.password = newPassword;
    user.resetOTP = undefined;
    await user.save();

    // Send confirmation email
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Successful',
      html: getPasswordResetConfirmationTemplate(user.fullName)
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const googleAuthSuccess = async (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: req.user._id,
        email: req.user.email,
        fullName: req.user.fullName,
        imageUrl: req.user.imageUrl
      }
    });
  } catch (error) {
    logger.error('Google auth success error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

export const googleAuthFailure = (req, res) => {
  res.status(401).json({
    message: 'Google authentication failed'
  });
};
