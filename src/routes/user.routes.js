const express = require('express');
const {
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
  toggleUserStatus,
  roleUpdate,
} = require('../controllers/user.controller');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');
const userRouter = express.Router();

userRouter.patch(
  '/:id/toggle-status',
  authMiddleware,
  isAdmin,
  toggleUserStatus
);

userRouter.get('/', authMiddleware, isAdmin, getAllUsers);
userRouter.get('/profile', authMiddleware, getUserById);
userRouter.put('/profile', authMiddleware, updateUser);
userRouter.get('/:userId', getUserById);
userRouter.patch('/:userId', updateUser);
userRouter.delete('/:userId', deleteUser);
userRouter.patch('/:userId/role', authMiddleware, isAdmin, roleUpdate);

// admin only

// userRouter.delete('/:id', authMiddleware, isAdmin, deleteUser);
// userRouter.get('/:id', authMiddleware, isAdmin, getUserById);

module.exports = userRouter;
