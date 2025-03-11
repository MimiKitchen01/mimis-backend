import chalk from 'chalk';
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  logger.info({
    message: chalk.blue('→ Incoming Request:'),
    details: {
      method: chalk.yellow(req.method),
      path: chalk.cyan(req.path),
      query: chalk.gray(JSON.stringify(req.query))
    }
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 500 ? chalk.red : 
                       status >= 400 ? chalk.yellow : 
                       status >= 300 ? chalk.cyan : 
                       chalk.green;

    logger.info({
      message: chalk.blue('← Outgoing Response:'),
      details: {
        status: statusColor(status),
        duration: chalk.magenta(`${duration}ms`),
        path: chalk.cyan(req.path)
      }
    });
  });

  next();
};
