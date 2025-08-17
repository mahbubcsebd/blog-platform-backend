const express = require('express');
const {
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,
} = require('../controllers/user.controller');
const userRouter = express.Router();

userRouter.get('/', getAllUsers);
userRouter.get('/:userId', getUserById);
userRouter.patch('/:userId', updateUser);
userRouter.delete('/:userId', deleteUser);

module.exports = userRouter;
