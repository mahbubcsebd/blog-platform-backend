const prisma = require('../config/prisma');
const excludeFields = require('../utils/exclude');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  const { userId } = req.user;

  console.log(userId);

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const safeUser = excludeFields(user, ['password']);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user',
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Pick only fields that exist in req.body
    const allowedFields = [
      'firstName',
      'lastName',
      'address',
      'phone',
      'website',
      'bio',
    ];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: 'No valid fields provided to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID and refresh token are required',
    });
  }

  try {
    const isExistUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!isExistUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete user from database
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
