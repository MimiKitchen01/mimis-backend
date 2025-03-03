import { ApiError } from './error.middleware.js';
import User from '../models/user.model.js';
import { ROLES } from '../constants/index.js';

export const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== ROLES.ADMIN) {
      throw new ApiError(403, 'Admin access required');
    }
    req.admin = user;
    next();
  } catch (error) {
    next(error);
  }
};
