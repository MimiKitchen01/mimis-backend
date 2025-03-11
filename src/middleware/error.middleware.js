import chalk from 'chalk';
import logger from '../utils/logger.js';

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  }
}

export const errorHandler = (err, req, res, next) => {
  logger.error({
    message: chalk.red.bold('🚨 Error:'),
    details: {
      path: chalk.yellow(req.path),
      method: chalk.cyan(req.method),
      error: chalk.red(err.message),
      stack: process.env.NODE_ENV === 'development' ? chalk.gray(err.stack) : undefined
    }
  });

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error('Error 🔥', err);
    
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Don't leak error details in production
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }
};

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};
