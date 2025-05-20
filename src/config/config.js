export const config = {
  emailService: process.env.EMAIL_SERVICE,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM,
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production'
};
