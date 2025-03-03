import winston from 'winston';

const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const logObject = {
    timestamp,
    level,
    message: message || meta.type || 'LOG',
    endpoint: meta.path || '',
    method: meta.method || '',
    duration: meta.duration || '',
    status: meta.status,
    userId: meta.userId,
    error: meta.error ? {
      name: meta.error.name,
      message: meta.error.message,
      stack: process.env.NODE_ENV === 'development' ? meta.error.stack : undefined
    } : undefined,
    ...meta
  };

  // Clean up undefined values
  Object.keys(logObject).forEach(key => 
    logObject[key] === undefined && delete logObject[key]
  );

  return JSON.stringify(logObject, null, 2);
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  ]
});

// Add helper methods
logger.logRequest = (req) => {
  logger.info({
    type: 'REQUEST',
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    userId: req?.user?.userId
  });
};

logger.logResponse = (req, res, duration) => {
  logger.info({
    type: 'RESPONSE',
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    userId: req?.user?.userId
  });
};

logger.logError = (error, req = {}) => {
  logger.error({
    type: 'ERROR',
    method: req.method,
    path: req.originalUrl,
    error,
    userId: req?.user?.userId
  });
};

export default logger;
