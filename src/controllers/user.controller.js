const prisma = require('../config/prisma');
const excludeFields = require('../utils/exclude');

exports.getAllUsers = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    role,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  try {
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'firstName',
      'lastName',
      'email',
      'username',
    ];
    const validSortOrders = ['asc', 'desc'];

    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = validSortOrders.includes(sortOrder)
      ? sortOrder
      : 'desc';

    // Build where condition
    let whereCondition = {};

    // Search filter
    if (search && search.trim()) {
      whereCondition.OR = [
        { firstName: { contains: search.trim(), mode: 'insensitive' } },
        { lastName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { username: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status === 'active') {
      whereCondition.isActive = true;
    } else if (status === 'inactive') {
      whereCondition.isActive = false;
    }

    // Role filter
    if (role && ['USER', 'ADMIN'].includes(role.toUpperCase())) {
      whereCondition.role = role.toUpperCase();
    }

    // Get users with pagination and total count
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          username: true,
          role: true,
          phone: true,
          address: true,
          website: true,
          bio: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              posts: true,
              // likes: true,
              // comments: true,
            },
          },
        },
        orderBy: {
          [sortField]: sortDirection,
        },
        skip,
        take: limitNum,
      }),
      prisma.user.count({
        where: whereCondition,
      }),
    ]);

    // Transform users to include counts
    const transformedUsers = users.map((user) => ({
      ...user,
      postCount: user._count.posts,
      likesCount: user._count.likes,
      commentsCount: user._count.comments,
      _count: undefined,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Get stats
    const [activeCount, inactiveCount, adminCount, userCount] =
      await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: 'USER' } }),
      ]);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: transformedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNext,
        hasPrev,
        limit: limitNum,
      },
      stats: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        admins: adminCount,
        users: userCount,
      },
    });
  } catch (error) {
    console.error('Error retrieving users:', error);
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

// toogle user status
exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, role: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent admin status update
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin user status cannot be changed',
      });
    }

    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.status(200).json({
      success: true,
      message: `User status updated to ${
        updatedUser.isActive ? 'Active' : 'Inactive'
      }`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user status',
      error: error.message,
    });
  }
};
