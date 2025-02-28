import { ApiError } from './error.middleware.js';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.details[0].message);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
