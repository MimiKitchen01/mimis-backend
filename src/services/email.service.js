import nodemailer from 'nodemailer';
import { getOTPTemplate, getWelcomeTemplate } from '../templates/emailTemplates.js';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendOTPEmail = async (email, otp, fullName) => {
  await transporter.sendMail({
    from: `"Mimi's Kitchen" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - Mimi\'s Kitchen',
    html: getOTPTemplate(otp, fullName),
  });
};

export const sendWelcomeEmail = async (email, fullName) => {
  await transporter.sendMail({
    from: `"Mimi's Kitchen" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Mimi\'s Kitchen!',
    html: getWelcomeTemplate(fullName),
  });
};
