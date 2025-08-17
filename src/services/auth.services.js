const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const DeviceDetector = require('device-detector-js');
// const { hashRefreshToken } = require('../utils/jwt');

const hashRefreshToken = async (refreshToken) => {
  return await bcrypt.hash(refreshToken, 10);
};

/**
 * Register a new user
 */
// exports.registerUser = async (userData) => {
//   // Check if email already exists
//   const existingUser = await prisma.user.findUnique({
//     where: { email: userData.email },
//   });

//   if (existingUser) {
//     throw { code: 'P2002' }; // Prisma unique constraint error code
//   }

//   // Hash password
//   const hashedPassword = await bcrypt.hash(userData.password, 10);

//   return prisma.user.create({
//     data: {
//       ...userData,
//       password: hashedPassword,
//     },
//   });
// };

/**
 * Login user by email & password
 */
exports.loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return null;

  return user;
};

/**
 * Get user by ID with devices info
 */
// exports.getUserById = async (userId) => {
//   return prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       id: true,
//       firstName: true,
//       lastName: true,
//       email: true,
//       loginDevices: true,
//       refreshToken: true,
//       refreshTokenExpires: true,
//     },
//   });
// };

/**
 * Update refresh token in DB with rotation & device info
 */
exports.updateRefreshToken = async (userId, refreshToken) => {
  const hashedRefreshToken = await hashRefreshToken(refreshToken);

  return prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: hashedRefreshToken,
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
};

/**
 * Get device details
 */
// exports.getDeviceInfo = async (req) => {
//   const detector = new DeviceDetector();
//   const userAgent = req.headers['user-agent'];
//   const device = detector.parse(userAgent);

//   return {
//     device: device.device?.type || 'Desktop',
//     os: device.os?.name || 'Unknown',
//     browser: device.client?.name || 'Unknown',
//     ip: req.ip,
//     lastLogin: new Date(),
//   };
// };

/**
 * Logout user by clearing refresh token
 */
// exports.logoutUser = async (userId) => {
//   return prisma.user.update({
//     where: { id: userId },
//     data: {
//       refreshToken: null,
//       refreshTokenExpires: null,
//     },
//   });
// };

/**
 * Verify refresh token
 */
// exports.verifyRefreshToken = async (token) => {
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
//     const user = await exports.getUserById(decoded.userId);

//     if (!user || !user.refreshToken) {
//       return null;
//     }

//     const isTokenValid = await bcrypt.compare(token, user.refreshToken);
//     return isTokenValid ? user : null;
//   } catch (error) {
//     return null;
//   }
// };
