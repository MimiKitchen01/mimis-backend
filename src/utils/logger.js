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
  const timeString = chalk.gray(new Date(timestamp).toLocaleTimeString());

  // Header: [Time] LEVEL
  let output = `${timeString} ${colorize(level.toUpperCase().padEnd(7))}`;

  // If message is a string, add it. If it's an object, check for special types.
  if (typeof message === 'string') {
    output += ` ${message}`;
  }

  // Handle Metadata (especially from middleware)
  if (meta.details) {
    const { method, path, status, duration, query, body } = meta.details;
    if (method && path) {
      const statusStr = status ? ` [${status}]` : '';
      const durationStr = duration ? ` (${duration})` : '';
      const queryStr = query && query !== '{}' ? ` ?${query}` : '';
      const bodyStr = body ? `\n  Body: ${chalk.gray(body)}` : '';
      output += ` ${chalk.bold(method)} ${chalk.cyan(path)}${queryStr}${chalk.green(statusStr)}${chalk.magenta(durationStr)}${bodyStr}`;
    }
    delete meta.details;
  }


  // If message was an object and not handled above
  if (typeof message === 'object' && message !== null) {
    output += '\n' + JSON.stringify(message, getCircularReplacer(), 2)
      .split('\n')
      .map(line => chalk.gray('  ' + line))
      .join('\n');
  }

  // Append remaining metadata
  const remainingMeta = Object.keys(meta).filter(k => k !== 'timestamp');
  if (remainingMeta.length > 0) {
    const metaObj = {};
    remainingMeta.forEach(k => metaObj[k] = meta[k]);
    output += '\n' + JSON.stringify(metaObj, getCircularReplacer(), 2)
      .split('\n')
      .map(line => chalk.gray('  ' + line))
      .join('\n');
  }

  return output;
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
