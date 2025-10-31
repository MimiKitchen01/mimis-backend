import { MailtrapClient } from 'mailtrap';
import { getOTPTemplate, getWelcomeTemplate, getPaymentInitiatedTemplate, getPaymentSuccessTemplate, getPaymentFailedTemplate } from '../templates/emailTemplates.js';
import logger from '../utils/logger.js';

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });

export const initEmailService = async () => {
  const tokenPresent = Boolean(process.env.MAILTRAP_TOKEN);
  const fromEmail = process.env.EMAIL_FROM || 'hello@mimiskitchenuk.com';

  if (!tokenPresent) {
    logger.error('Mail service init failed: MAILTRAP_TOKEN is missing');
    return;
  }

  logger.info(`✉️ Mail service configured. Sender: ${fromEmail}`);

  // Optional smoke test: send one email on startup when explicitly enabled
  if (process.env.MAIL_SMOKE_TEST === '1' && process.env.MAIL_SMOKE_TEST_RECIPIENT) {
    try {
      await client.send({
        from: { email: fromEmail, name: "Mimi's Kitchen" },
        to: [{ email: process.env.MAIL_SMOKE_TEST_RECIPIENT }],
        subject: 'Mail service health check',
        text: 'This is a startup health-check email from Mimi\'s Kitchen.',
        category: 'HealthCheck'
      });
      logger.info('✅ Mail service health check sent successfully');
    } catch (err) {
      logger.error('❌ Mail service health check failed:', { error: err.message });
    }
  }
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const fromEmail = process.env.EMAIL_FROM || 'hello@mimiskitchenuk.com';
    const payload = {
      from: { email: fromEmail, name: "Mimi's Kitchen" },
      to: [{ email: to }],
      subject,
      html,
      category: 'Transactional'
    };

    const info = await client.send(payload);
    logger.info('Email sent successfully:', { to, subject });
    return info;
  } catch (error) {
    logger.error('Email sending failed:', { error: error.message, to, subject });
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
    logger.error('OTP email sending failed:', { error: error.message, email });
    throw new Error('Failed to send OTP email');
  }
};

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    return await sendEmail({
      to: email,
      subject: "Welcome to Mimi's Kitchen!",
      html: getWelcomeTemplate(fullName)
    });
  } catch (error) {
    logger.error('Welcome email sending failed:', { error: error.message, email });
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
