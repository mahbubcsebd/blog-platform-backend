const express = require('express');

const authRouter = express.Router();

const {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
} = require('../controllers/auth.controllers');

const {
  registerValidation,
  loginValidation,
} = require('../validators/authValidator');

const runValidation = require('../middlewares/validate');
const authMiddleware = require('../middlewares/auth'); // You'll need to create this

// Public routes
authRouter.post('/register', registerValidation, runValidation, register);
authRouter.post('/login', loginValidation, runValidation, login);
authRouter.post('/refresh', refreshToken);

// Protected routes (require authentication)
authRouter.post('/logout', authMiddleware, logout);
authRouter.get('/profile', authMiddleware, getProfile);

module.exports = authRouter;
