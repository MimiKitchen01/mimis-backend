import nodemailer from 'nodemailer';
import { getOTPTemplate, getWelcomeTemplate, getPaymentInitiatedTemplate, getPaymentSuccessTemplate, getPaymentFailedTemplate } from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';




 const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true, // Enable debug logging
    logger: true, // Enable detailed logging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 30000, // 30 seconds
    headers: {
      'X-Sender-Name': "Mimi's Kitchen",
      'X-Priority': '3'
    },
    tls: {
      rejectUnauthorized: true, // Changed to true for security
      minVersion: 'TLSv1.2' // Ensure modern TLS
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

export const sendPaymentEmail = async (type, order) => {
  try {
    const emailData = {
      to: order.user.email,
      subject: '',
      html: ''
    };

    switch (type) {
      case 'initiated':
        emailData.subject = `Payment Initiated for Order #${order.orderNumber}`;
        emailData.html = getPaymentInitiatedTemplate(order, order.user);
        break;
      case 'success':
        emailData.subject = `Payment Successful for Order #${order.orderNumber}`;
        emailData.html = getPaymentSuccessTemplate(order, order.user);
        break;
      case 'failed':
        emailData.subject = `Payment Failed for Order #${order.orderNumber}`;
        emailData.html = getPaymentFailedTemplate(order, order.user);
        break;
    }

    await sendEmail(emailData);
    logger.info(`Payment ${type} email sent to ${order.user.email}`);
  } catch (error) {
    logger.error(`Failed to send payment ${type} email:`, error);
    // Don't throw error to prevent blocking payment flow
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
