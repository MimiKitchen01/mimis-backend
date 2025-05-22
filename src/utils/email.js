import nodemailer from 'nodemailer';
import chalk from 'chalk';
import { config } from '../config/config.js';
import logger from './logger.js';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';

const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: process.env.NODE_ENV !== 'production',
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      logger.error(chalk.red('Email server connection error:'), {
        error: error.message,
        code: error.code,
        command: error.command,
        host: 'smtp.zoho.com',
        port: 465,
        user: process.env.EMAIL_USER,
        secure: true
      });
    } else {
      logger.info(chalk.green('✉️ Email server connection verified'));
    }
  });

  return transporter;
};

const transporter = createTransporter();

export const emailService = {
  async sendEmail(to, template) {
    try {
      const mailOptions = {
        from: {
          name: "Mimi's Kitchen",
          address: process.env.EMAIL_FROM
        },
        to,
        subject: template.subject,
        html: template.html,
        headers: {
          'X-Priority': '1',
          'X-MS-Exchange-Organization-SCL': '1'
        }
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(chalk.green('✉️ Email sent successfully:'), {
        messageId: info.messageId,
        to,
        subject: template.subject
      });
      return info;
    } catch (error) {
      logger.error(chalk.red('❌ Email sending failed:'), {
        error: error.message,
        code: error.code,
        command: error.command,
        to,
        subject: template.subject
      });
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
