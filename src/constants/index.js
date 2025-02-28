export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const PRODUCT_CATEGORIES = [
  'Burgers',
  'Pizza',
  'Pasta',
  'Salads',
  'Beverages',
  'Desserts'
];

export const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error'
};
