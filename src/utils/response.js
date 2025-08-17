/**
 * Standard API Response Utilities
 */

class ApiResponse {
  constructor(statusCode, success, message, data = null) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    if (data) this.data = data;
  }
}

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Success Response Helper
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const response = new ApiResponse(statusCode, true, message, data);
  return res.status(statusCode).json(response);
};

/**
 * Error Response Helper
 */
const sendError = (res, statusCode, message, details = null) => {
  const response = {
    statusCode,
    success: false,
    message,
    ...(details && { details }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Wrap an async Express route handler and forward errors to next()
 * @param {Function} fn - Async route handler or middleware
 * @returns {Function} Express middleware with error handling
 */
const asyncHandler = (fn) => {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function as argument to asyncHandler');
  }

  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[AsyncHandler Error]: ${err.message}`);
      next(err);
    });
  };
};

/**
 * Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const message = 'Resource already exists';
    error = new ApiError(409, message);
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error = new ApiError(400, message);
  }

  // Default error
  if (!error.statusCode) {
    error = new ApiError(500, 'Internal server error');
  }

  sendError(res, error.statusCode, error.message);
};

/**
 * 404 Handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not found - ${req.originalUrl}`);
  next(error);
};

module.exports = {
  ApiResponse,
  ApiError,
  sendSuccess,
  sendError,
  asyncHandler,
  globalErrorHandler,
  notFound,
};
