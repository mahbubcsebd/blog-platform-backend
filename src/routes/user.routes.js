const express = require('express');
const {
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
} = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth');
const userRouter = express.Router();

userRouter.get('/', getAllUsers);
userRouter.get('/profile', authMiddleware, getUserById);
userRouter.put('/profile', authMiddleware, updateUser);
userRouter.get('/:userId', getUserById);
userRouter.patch('/:userId', updateUser);
userRouter.delete('/:userId', deleteUser);

module.exports = userRouter;
