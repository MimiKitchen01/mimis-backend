import * as authService from '../services/auth.service.js';
import * as emailService from '../services/email.service.js';
import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import logger from '../utils/logger.js';

export const register = async (req, res) => {
  try {
    const { user, otpCode } = await authService.createUser(req.body);
    await emailService.sendOTPEmail(user.email, otpCode, user.fullName);
    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (error) {
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
    const { token } = await authService.loginUser(req.body.email, req.body.password);
    res.json({ token });
  } catch (error) {
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email using the service
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: getResetPasswordTemplate(user.fullName, resetUrl)
    });

    res.json({ 
      message: 'Password reset link sent to email',
      email: user.email
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Password reset token is invalid or has expired');
    }

    res.json({ message: 'Token is valid', email: user.email });
  } catch (error) {
    logger.error('Verify reset token error:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Password reset token is invalid or has expired');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await sendEmail({
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
