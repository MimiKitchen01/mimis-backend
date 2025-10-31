import chalk from 'chalk';
import { MailtrapClient } from 'mailtrap';
import logger from './logger.js';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });

export const emailService = {
  async sendEmail(to, template) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'hello@mimiskitchenuk.com';
      const payload = {
        from: { email: fromEmail, name: "Mimi's Kitchen" },
        to: [{ email: to }],
        subject: template.subject,
        html: template.html,
        category: 'Transactional'
      };

      const info = await client.send(payload);
      logger.info(chalk.green('✉️ Email sent successfully:'), {
        to,
        subject: template.subject
      });
      return info;
    } catch (error) {
      logger.error(chalk.red('❌ Email sending failed:'), {
        error: error.message,
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

export const { sendEmail, sendOTP, sendWelcomeEmail } = emailService;
