const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { updateRefreshToken, loginUser } = require('../services/auth.services');
require('dotenv').config();
const excludeFields = require('../utils/exclude');

// Helper function for consistent cookie options
const getCookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // Important for cross-origin
    maxAge: maxAge,
    path: '/',
    // Uncomment and set if you have same root domain
    // domain: isProduction ? '.yourdomain.com' : undefined,
  };
};

const clearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    // domain: isProduction ? '.yourdomain.com' : undefined,
  };
};

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET || 'FHDJKFHDJKSHFJKFHJKDSHF',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'JGFJKGKJDGSJKFGISDGFGFUIGi',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    console.log('Registration attempt:', { username, email });

    // Validate input data
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        errors: {
          firstName: !firstName ? 'First name is required' : undefined,
          lastName: !lastName ? 'Last name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          username: !username ? 'Username is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        code: 'USER_EXISTS',
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken',
        code: 'USERNAME_EXISTS',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      username: username.trim(),
    };

    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        role: 'USER', // Default role
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser.id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    // Update refresh token in database
    await updateRefreshToken(newUser.id, refreshToken, req);

    const safeUser = excludeFields(newUser, ['password', 'refreshToken']);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to our platform.',
      data: {
        user: safeUser,
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    });

    console.log('Registration successful for user:', newUser.username);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message:
        'Something went wrong while creating your account. Please try again.',
      code: 'REGISTRATION_ERROR',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', {
      username,
      timestamp: new Date().toISOString(),
    });

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username and password are required',
        errors: {
          username: !username ? 'Email or Username is required' : undefined,
          password: !password ? 'Password is required' : undefined,
        },
      });
    }

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username.toLowerCase().trim() },
          { username: username.toLowerCase().trim() },
        ],
      },
    });

    if (!user) {
      console.log('User not found for:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    const safeUser = excludeFields(user, ['password', 'refreshToken']);

    console.log('Login successful for user:', {
      username: user.username,
      role: user.role,
      userId: user.id,
    });

    // Response
    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      data: {
        user: safeUser,
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong during login.',
      code: 'LOGIN_ERROR',
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { userId } = req.user || {};

    console.log('Logout attempt for user:', userId);

    if (userId) {
      // Clear refresh token from database
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', clearCookieOptions());

    console.log('Logout successful for user:', userId);

    res.status(200).json({
      success: true,
      message: 'You have been successfully logged out. See you next time!',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Clear cookie even on error
    res.clearCookie('refreshToken', clearCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
};

// FIXED: Enhanced refresh token with better error handling and logging
exports.refreshToken = async (req, res) => {
  try {
    console.log('Refresh token request received');
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers);

    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      console.log('No refresh token found in cookies or body');
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    console.log('Refresh token found, verifying...');

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'JGFJKGKJDGSJKFGISDGFGFUIGi'
      );
      console.log('Token verified, user ID:', decoded.userId);
    } catch (err) {
      console.log('JWT verification failed:', err.message);

      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken', clearCookieOptions());

      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Find user and validate refresh token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      res.clearCookie('refreshToken', clearCookieOptions());

      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Validate stored refresh token
    if (user.refreshToken !== refreshToken) {
      console.log('Refresh token mismatch for user:', user.username);
      res.clearCookie('refreshToken', clearCookieOptions());

      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again for security.',
        code: 'REFRESH_TOKEN_MISMATCH',
      });
    }

    console.log(
      'Refresh token valid, generating new tokens for user:',
      user.username
    );

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id
    );

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

    const safeUser = excludeFields(user, ['password', 'refreshToken']);

    console.log('Token refresh successful for user:', {
      username: user.username,
      role: user.role,
      userId: user.id,
    });

    // Send new access token in response body
    res.status(200).json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        user: safeUser,
        accessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    // Clear cookie on any error
    res.clearCookie('refreshToken', clearCookieOptions());

    res.status(500).json({
      success: false,
      message:
        'Something went wrong while refreshing your session. Please log in again.',
      code: 'REFRESH_ERROR',
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        role: true, // IMPORTANT: Include role for admin guards
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve profile information. Please try again.',
      code: 'PROFILE_ERROR',
    });
  }
};
