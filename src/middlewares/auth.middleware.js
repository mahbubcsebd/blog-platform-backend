const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
require('dotenv').config();
const excludeFields = require('../utils/exclude');

const authMiddleware = async (req, res, next) => {
  try {
    // Priority: Bearer token > Cookie token
    let token = null;

    // First check Authorization header
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7); // Remove 'Bearer ' prefix
    }
    // Fallback to cookie if no bearer token
    else if (req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token not found',
        code: 'TOKEN_MISSING',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || 'FHDJKFHDJKSHFJKFHJKDSHF'
      );
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        code: 'TOKEN_INVALID',
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    const safeUser = excludeFields(user, ['password']);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Optional: Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        code: 'USER_INACTIVE',
      });
    }

    // Add user to request object
    req.user = safeUser;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const isLoggedIn = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'You must be logged in',
      code: 'NOT_LOGGED_IN',
    });
  }
  next();
};

const isLoggedOut = (req, res, next) => {
  if (req.user) {
    return res.status(400).json({
      success: false,
      message: 'Already logged in',
      code: 'ALREADY_LOGGED_IN',
    });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }
  next();
};

const hasRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'FORBIDDEN',
      });
    }
    next();
  };
};

module.exports = { authMiddleware, isLoggedIn, isLoggedOut, isAdmin, hasRole };
