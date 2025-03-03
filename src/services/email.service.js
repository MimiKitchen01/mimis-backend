import nodemailer from 'nodemailer';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject
    });

    return info;
  } catch (error) {
    logger.error('Email sending failed:', {
      error: error.message,
      to,
      subject
    });
    throw error;
  }
};

export const sendOTPEmail = async (email, otp, fullName) => {
  try {
    return await sendEmail({
      to: email,
      subject: 'Email Verification - OTP',
      html: getOTPTemplate(otp, fullName)
    });
  } catch (error) {
    logger.error('OTP email sending failed:', {
      error: error.message,
      email
    });
    throw new Error('Failed to send OTP email');
  }
};

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    return await sendEmail({
      to: email,
      subject: 'Welcome to Mimi\'s Kitchen!',
      html: getWelcomeTemplate(fullName)
    });
  } catch (error) {
    logger.error('Welcome email sending failed:', {
      error: error.message,
      email
    });
    // Don't throw error for welcome email as it's not critical
    logger.warn('Welcome email failed but continuing user flow');
  }
};

// Test email connection on service start
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email service verification failed:', error);
  } else {
    logger.info('Email service is ready to send messages');
  }
});
