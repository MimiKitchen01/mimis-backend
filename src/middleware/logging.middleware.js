import chalk from 'chalk';
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  const logDetails = {
    method: req.method,
    path: req.path,
    query: JSON.stringify(req.query)
  };

  if (req.method !== 'GET' && req.body) {
    // Don't log sensitive info like passwords
    if (req.path.includes('login') || req.path.includes('register')) {
      logDetails.body = '{ sensitive data }';
    } else {
      logDetails.body = JSON.stringify(req.body);
    }
  }

  logger.info({
    message: '→ Incoming Request',
    details: logDetails
  });


  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    logger.info({
      message: '← Outgoing Response',
      details: {
        status: status,
        duration: `${duration}ms`,
        path: req.path,
        method: req.method
      }
    });
  });

  next();
};
