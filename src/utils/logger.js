import winston from 'winston';
import chalk from 'chalk';

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf } = format;

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

// Enhanced console format with better object formatting
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const levelColors = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.green,
    debug: chalk.blue
  };

  const colorize = levelColors[level] || chalk.white;
  const timeString = chalk.gray(timestamp);
  
  // Better object formatting
  const formatObject = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      try {
        return JSON.stringify(obj, getCircularReplacer(), 2)
          .split('\n')
          .map(line => chalk.cyan(line))
          .join('\n');
      } catch (error) {
        return chalk.red('[Unable to stringify object]');
      }
    }
    return obj;
  };

  // Format message or object
  const formattedMessage = typeof message === 'object' 
    ? formatObject(message)
    : message;

  // Format metadata
  const metaString = Object.keys(meta).length 
    ? '\n' + formatObject(meta)
    : '';

  return `${timeString} ${colorize(level.toUpperCase())} ${formattedMessage}${metaString}`;
});

// Create the logger
const logger = createLogger({
  format: combine(
    timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: combine(
        timestamp(),
        consoleFormat
      )
    }),
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Enhanced request logging
logger.logRequest = (req) => {
  const logData = {
    type: 'REQUEST',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      authorization: req.headers.authorization ? '**present**' : undefined
    },
    query: Object.keys(req.query).length ? req.query : undefined,
    body: req.method !== 'GET' ? req.body : undefined,
    userId: req?.user?.userId
  };

  logger.info(logData);
};

// Enhanced response logging
logger.logResponse = (req, res, duration) => {
  const logData = {
    type: 'RESPONSE',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    userId: req?.user?.userId,
    contentLength: res.get('content-length'),
    contentType: res.get('content-type')
  };

  logger.info(logData);
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
