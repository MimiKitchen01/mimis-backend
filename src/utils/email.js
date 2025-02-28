import nodemailer from 'nodemailer';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendOTP = async (email, otp, fullName) => {
  try {
    await transporter.sendMail({
      from: `"Mimi's Kitchen" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Mimi\'s Kitchen',
      html: getOTPTemplate(otp, fullName),
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    await transporter.sendMail({
      from: `"Mimi's Kitchen" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Mimi\'s Kitchen!',
      html: getWelcomeTemplate(fullName),
    });
  } catch (error) {
    console.error('Welcome email sending failed:', error);
    throw error;
  }
};
