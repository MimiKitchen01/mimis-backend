import rateLimit from 'express-rate-limit';

// General API rate limit - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful requests
    skipSuccessfulRequests: false,
    // Skip failed requests
    skipFailedRequests: false,
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        status: 'error',
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP verification rate limit - 3 attempts per hour
export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
        status: 'error',
        message: 'Too many OTP verification attempts. Please request a new OTP.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order creation rate limit - 10 orders per minute
export const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 orders per minute
    message: {
        status: 'error',
        message: 'Too many orders created. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Registration rate limit - 3 registrations per hour per IP
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
    message: {
        status: 'error',
        message: 'Too many accounts created from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
