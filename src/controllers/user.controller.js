const prisma = require('../config/prisma');
const excludeFields = require('../utils/exclude');

// Role hierarchy helper function
const getRoleHierarchy = (role) => {
  const hierarchy = {
    SUPERADMIN: 4,
    ADMIN: 3,
    MODERATOR: 2,
    USER: 1,
  };
  return hierarchy[role] || 0;
};

// Check if user can modify target user
const canModifyUser = (
  currentUserRole,
  targetUserRole,
  currentUserId,
  targetUserId
) => {
  const currentLevel = getRoleHierarchy(currentUserRole);
  const targetLevel = getRoleHierarchy(targetUserRole);

  // SUPERADMIN can modify anyone except themselves for delete/deactivate
  if (currentUserRole === 'SUPERADMIN') {
    return true;
  }

  // ADMIN can only modify USER and MODERATOR
  if (currentUserRole === 'ADMIN') {
    return targetUserRole === 'USER' || targetUserRole === 'MODERATOR';
  }

  // Other roles cannot modify users
  return false;
};

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
    if (
      role &&
      ['USER', 'ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(role.toUpperCase())
    ) {
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
    const [
      activeCount,
      inactiveCount,
      adminCount,
      userCount,
      superAdminCount,
      moderatorCount,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'SUPERADMIN' } }),
      prisma.user.count({ where: { role: 'MODERATOR' } }),
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
        superAdmins: superAdminCount,
        moderators: moderatorCount,
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

// Update user role (SUPERADMIN only)
exports.updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const currentUser = req.user;

  if (!userId || !role) {
    return res.status(400).json({
      success: false,
      message: 'User ID and role are required',
    });
  }

  // Only SUPERADMIN can update roles
  if (currentUser.role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Only SUPERADMIN can update user roles',
    });
  }

  // Validate role
  const validRoles = ['USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN'];
  if (!validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message:
        'Invalid role. Valid roles are: USER, MODERATOR, ADMIN, SUPERADMIN',
    });
  }

  try {
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent SUPERADMIN from demoting themselves
    if (currentUser.userId === userId && role.toUpperCase() !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'SUPERADMIN cannot demote themselves',
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role.toUpperCase()} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  const currentUser = req.user;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check permissions
    if (
      !canModifyUser(
        currentUser.role,
        targetUser.role,
        currentUser.userId,
        userId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this user',
      });
    }

    // Prevent SUPERADMIN from deleting themselves
    if (currentUser.role === 'SUPERADMIN' && currentUser.userId === userId) {
      return res.status(403).json({
        success: false,
        message: 'SUPERADMIN cannot delete themselves',
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

// Toggle user status with role hierarchy
exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  try {
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, role: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check permissions
    if (
      !canModifyUser(currentUser.role, targetUser.role, currentUser.userId, id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this user',
      });
    }

    // Prevent SUPERADMIN from deactivating themselves
    if (currentUser.role === 'SUPERADMIN' && currentUser.userId === id) {
      return res.status(403).json({
        success: false,
        message: 'SUPERADMIN cannot deactivate themselves',
      });
    }

    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
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

exports.roleUpdate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentUser = req.user; // From auth middleware

    // Debug logging
    console.log('Current User:', currentUser);
    console.log('Request headers:', req.headers);

    // Check if user is authenticated
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Validate required fields
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required',
      });
    }

    // Validate role values
    const validRoles = ['USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid role. Valid roles are: USER, MODERATOR, ADMIN, SUPERADMIN',
      });
    }

    const normalizedRole = role.toUpperCase();
    const currentUserRole = currentUser.role;

    // Additional validation for currentUser properties
    if (!currentUserRole) {
      return res.status(403).json({
        success: false,
        message: 'User role not found. Invalid authentication.',
      });
    }

    // Role hierarchy helper
    const roleHierarchy = {
      USER: 1,
      MODERATOR: 2,
      ADMIN: 3,
      SUPERADMIN: 4,
    };

    // Only SUPERADMIN can assign SUPERADMIN role
    if (normalizedRole === 'SUPERADMIN' && currentUserRole !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Administrators can assign Super Admin role',
      });
    }

    // Users can only assign roles equal or lower than their own
    if (roleHierarchy[normalizedRole] > roleHierarchy[currentUserRole]) {
      return res.status(403).json({
        success: false,
        message: `You cannot assign a role higher than your own (${currentUserRole})`,
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent users from updating their own role (except SUPERADMIN)
    // Handle both currentUser.userId and currentUser.id for compatibility
    const currentUserId = currentUser.userId || currentUser.id;

    if (userId === currentUserId && currentUserRole !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You cannot update your own role',
      });
    }

    // Prevent SUPERADMIN from demoting themselves
    if (
      userId === currentUserId &&
      currentUserRole === 'SUPERADMIN' &&
      normalizedRole !== 'SUPERADMIN'
    ) {
      return res.status(403).json({
        success: false,
        message: 'SUPERADMIN cannot demote themselves',
      });
    }

    // Prevent non-SUPERADMIN from modifying SUPERADMIN
    if (targetUser.role === 'SUPERADMIN' && currentUserRole !== 'SUPERADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Administrators can modify Super Admin roles',
      });
    }

    // Check if role is already the same
    if (targetUser.role === normalizedRole) {
      return res.status(400).json({
        success: false,
        message: `User already has ${normalizedRole} role`,
      });
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: normalizedRole },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log the role change for audit trail
    console.log(
      `[ROLE UPDATE] User: ${targetUser.email} | ${
        targetUser.role
      } → ${normalizedRole} | By: ${
        currentUser.email || currentUser.username || currentUserId
      }`
    );

    // Return success response
    return res.status(200).json({
      success: true,
      message: `User role successfully updated from ${targetUser.role} to ${normalizedRole}`,
      data: {
        user: updatedUser,
        previousRole: targetUser.role,
        newRole: normalizedRole,
        updatedBy: {
          id: currentUserId,
          email: currentUser.email || 'N/A',
          role: currentUser.role,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Database constraint violation',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Something went wrong',
    });
  }
};
