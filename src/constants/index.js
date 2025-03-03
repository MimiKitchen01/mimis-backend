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
  'Appetizers',
  'Main Course',
  'Burgers',
  'Pizza',
  'Pasta',
  'Salads',
  'Beverages',
  'Desserts',
  'Sides',
  'Soups'
];

export const ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'wheat',
  'soy',
  'gluten',
  'sesame'
];

export const SPICY_LEVELS = [
  'Not Spicy',
  'Mild',
  'Medium',
  'Hot',
  'Extra Hot'
];

export const ERROR_MESSAGES = {
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error'
};

export const ADDRESS_TYPES = [
  'home',
  'work',
  'other'
];
