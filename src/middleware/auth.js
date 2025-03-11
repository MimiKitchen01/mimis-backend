import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import logger from '../utils/logger.js';

// Change to default export
const auth = async (req, res, next) => {
  try {
    logger.info(chalk.blue('🔒 Authenticating request:'), {
      path: chalk.cyan(req.path),
      method: chalk.yellow(req.method)
    });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(chalk.red('❌ Authentication failed:'), error.message);
    res.status(401).json({ message: 'Authentication required' });
  }
};

// Export as default
export default auth;
