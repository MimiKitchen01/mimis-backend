import nodemailer from 'nodemailer';
import { config } from '../config/config.js';
import logger from './logger.js';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: true,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword
  },
  tls: {
    rejectUnauthorized: config.isProduction
  },
  debug: !config.isProduction,
  headers: {
    'X-Sender-Name': "Mimi's Kitchen",
    'X-Priority': '3'
  }
});

// Verify email connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP server connection error:', error);
  } else {
    logger.info('SMTP server connection successful');
  }
});

export const emailService = {
  async sendEmail(to, template) {
    try {
      const mailOptions = {
        from: {
          name: "Mimi's Kitchen",
          address: config.emailUser
        },
        replyTo: config.emailUser,
        to,
        subject: template.subject,
        html: template.html
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', info.messageId);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  },

  async sendOTP(email, otp, fullName) {
    return this.sendEmail(email, {
      subject: "Verify Your Email - Mimi's Kitchen",
      html: getOTPTemplate(otp, fullName)
    });
  },

  async sendWelcomeEmail(email, fullName) {
    return this.sendEmail(email, {
      subject: "Welcome to Mimi's Kitchen!",
      html: getWelcomeTemplate(fullName)
    });
  }
};

// Export individual methods for convenience
export const { sendEmail, sendOTP, sendWelcomeEmail } = emailService;
