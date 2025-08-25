const express = require('express');
const authRouter = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
} = require('../controllers/auth.controllers');

const {
  registerValidation,
  loginValidation,
} = require('../validators/authValidator');

const runValidation = require('../middlewares/validate');

const {
  authMiddleware,
  isLoggedIn,
  isLoggedOut,
  isAdmin,
  hasRole,
} = require('../middlewares/auth.middleware');

// Public routes (only accessible when logged out)
authRouter.post('/register', registerValidation, runValidation, register);

authRouter.post('/login', loginValidation, runValidation, login);

// Refresh token doesn’t care about login/logout state
authRouter.post('/refresh', refreshToken);

// Protected routes (require authentication)
authRouter.post('/logout', authMiddleware, isLoggedIn, logout);

authRouter.get('/profile', authMiddleware, isLoggedIn, getProfile);

// Example admin-only route
authRouter.get(
  '/admin/stats',
  authMiddleware,
  isLoggedIn,
  isAdmin,
  (req, res) => {
    res.json({ message: 'Admin stats here' });
  }
);

module.exports = authRouter;
