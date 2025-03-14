import { ApiError } from './error.middleware.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user || user.role !== 'admin') {
      throw new ApiError(403, 'Access denied. Admin only.');
    }

    logger.info(chalk.blue('👮 Admin access granted:'), chalk.cyan(user.email));
    next();
  } catch (error) {
    logger.error(
      chalk.red('🚫 Admin auth error:'),
      chalk.yellow(error.message),
      chalk.gray('\n', error.stack)
    );
    res.status(error.statusCode || 403).json({ message: error.message });
  }
};
