const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const { updateRefreshToken, loginUser } = require('../services/auth.services');
require('dotenv').config();

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

// exports.register = async (req, res) => {
//   try {
//     const { firstName, lastName, email, password } = req.body;

//     // Validate input data
//     if (!firstName || !lastName || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'All fields are required',
//         errors: {
//           firstName: !firstName ? 'First name is required' : undefined,
//           lastName: !lastName ? 'Last name is required' : undefined,
//           email: !email ? 'Email is required' : undefined,
//           password: !password ? 'Password is required' : undefined,
//         },
//       });
//     }

//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });

//     if (existingUser) {
//       return res.status(409).json({
//         success: false,
//         message: 'An account with this email already exists',
//         code: 'USER_EXISTS',
//       });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 12);

//     const userData = {
//       firstName: firstName.trim(),
//       lastName: lastName.trim(),
//       email: email.toLowerCase().trim(),
//     };

//     const newUser = await prisma.user.create({
//       data: {
//         ...userData,
//         password: hashedPassword,
//       },
//     });

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(newUser.id);

//     // Set only refresh token as HTTP-only cookie
//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//       path: '/',
//     });

//     // Save refresh token with device info
//     await updateRefreshToken(newUser.id, refreshToken, req);

//     // Success response with access token in body
//     res.status(201).json({
//       success: true,
//       message: 'Account created successfully! Welcome to our platform.',
//       data: {
//         user: {
//           id: newUser.id,
//           firstName: userData.firstName,
//           lastName: userData.lastName,
//           email: userData.email,
//         },
//         accessToken, // Frontend will use this as Bearer token
//         expiresIn: 15 * 60, // 15 minutes in seconds
//       },
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({
//       success: false,
//       message:
//         'Something went wrong while creating your account. Please try again.',
//       code: 'REGISTRATION_ERROR',
//     });
//   }
// };

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

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
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser.id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    await updateRefreshToken(newUser.id, refreshToken, req);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to our platform.',
      data: {
        user: {
          id: newUser.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          username: userData.username,
        },
        accessToken,
        expiresIn: 15 * 60,
      },
    });
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

// Login API
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Input validation
//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required',
//         errors: {
//           email: !email ? 'Email is required' : undefined,
//           password: !password ? 'Password is required' : undefined,
//         },
//       });
//     }

//     // Find user
//     const user = await prisma.user.findUnique({
//       where: { email: email.toLowerCase().trim() },
//     });

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid email or password',
//         code: 'INVALID_CREDENTIALS',
//       });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid email or password',
//         code: 'INVALID_CREDENTIALS',
//       });
//     }

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user.id);

//     // Debug: Token generation চেক করুন
//     console.log('Generated tokens:');
//     console.log('Access Token:', accessToken ? 'Generated' : 'Not generated');
//     console.log('Refresh Token:', refreshToken ? 'Generated' : 'Not generated');
//     console.log('Refresh Token length:', refreshToken?.length);

//     // Save refresh token to DB
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         refreshToken,
//       },
//     });

//     // Debug: Cookie setting এর আগে
//     console.log('About to set cookie with refreshToken:', refreshToken);

//     // Set refresh token as HTTP-only cookie
//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
//       maxAge: 24 * 60 * 60 * 1000, // 1 day
//       path: '/',
//     });

//     console.log('Cookie set successfully');

//     // Response থেকে refreshToken বাদ দিন (security জন্য)
//     res.status(200).json({
//       success: true,
//       message: `Welcome back, ${user.firstName}! You've successfully logged in.`,
//       data: {
//         user: {
//           id: user.id,
//           firstName: user.firstName,
//           lastName: user.lastName,
//           email: user.email,
//         },
//         accessToken,
//         // refreshToken: refreshToken, // এটা comment করুন বা remove করুন
//         expiresIn: 15 * 60,
//       },
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Something went wrong during login. Please try again.',
//       code: 'LOGIN_ERROR',
//     });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body; // username মানে email বা username হতে পারে

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
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Save refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });

    // Response
    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.firstName}!`,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
        },
        accessToken,
        expiresIn: 15 * 60, // 15 minutes
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

// Logout API
exports.logout = async (req, res) => {
  try {
    // Auth middleware থাকলে userId পাবেন, না থাকলেও logout করতে পারবেন
    const { userId } = req.user || {};

    if (userId) {
      // Clear refresh token from database
      await prisma.user.update({
        where: { id: userId },
        data: {
          refreshToken: null,
          // lastLogoutAt: new Date(),
        },
      });
    }

    // Clear refresh token cookie (এটা সর্বদা করুন)
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Development এর জন্য
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'You have been successfully logged out. See you next time!',
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Error হলেও cookie clear করুন
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    });

    res.status(200).json({
      // 500 এর পরিবর্তে 200 (logout সফল হিসেবে ধরুন)
      success: true,
      message: 'Logged out successfully',
    });
  }
};

// Refresh Token API
exports.refreshToken = async (req, res) => {
  try {
    // Priority: HTTP-only cookie > Request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'JGFJKGKJDGSJKFGISDGFGFUIGi'
      );
    } catch (err) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Find user and validate refresh token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        refreshToken: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.status(401).json({
        success: false,
        message: 'User account not found. Please log in again.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Validate stored refresh token
    if (user.refreshToken !== refreshToken) {
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again for security.',
        code: 'REFRESH_TOKEN_MISMATCH',
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id
    );

    // Update refresh token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshToken,
        // lastActiveAt: new Date(),
      },
    });

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Send new access token in response body
    res.status(200).json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        accessToken, // Frontend will use this as Bearer token
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message:
        'Something went wrong while refreshing your session. Please log in again.',
      code: 'REFRESH_ERROR',
    });
  }
};

// Get user profile (protected route)
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // lastLoginAt: true,
        // lastActiveAt: true,
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
