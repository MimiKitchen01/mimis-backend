import * as authService from '../services/auth.service.js';
import * as emailService from '../services/email.service.js';

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
