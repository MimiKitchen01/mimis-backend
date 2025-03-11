import { ApiError } from './error.middleware.js';
import User from '../models/user.model.js';
import { ROLES } from '../constants/index.js';
import chalk from 'chalk';
import logger from '../utils/logger.js';

export const adminAuth = async (req, res, next) => {
  try {
    logger.info(chalk.blue('👮 Verifying admin access:'), chalk.cyan(req.user.userId));
    
    if (req.user.role !== 'admin') {
      logger.warn(chalk.yellow('⚠️ Unauthorized admin access attempt'));
      return res.status(403).json({ message: 'Admin access required' });
    }

    logger.info(chalk.green('✅ Admin access verified'));
    next();
  } catch (error) {
    logger.error(chalk.red('❌ Admin verification failed:'), error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
