const jwt = require('jsonwebtoken');
const config = require('../config/config');
const bcrypt = require('bcryptjs');

exports.generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.access.secret, {
    expiresIn: config.jwt.access.expiresIn,
  });

  const refreshToken = jwt.sign({ userId }, config.jwt.refresh.secret, {
    expiresIn: config.jwt.refresh.expiresIn,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpires:
      Date.now() + parseInt(config.jwt.access.expiresIn) * 1000,
    refreshTokenExpires:
      Date.now() + parseInt(config.jwt.refresh.expiresIn) * 1000,
  };
};

exports.hashRefreshToken = async (refreshToken) => {
  return await bcrypt.hash(refreshToken, 10);
};

// Enhanced JWT verification helper
exports.verifyJWT = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.access.secret, (err, decoded) => {
      if (err) {
        console.log('JWT Verification Error:', err.message);
        reject(err);
      } else {
        console.log('JWT Verification Success:', decoded);
        resolve(decoded);
      }
    });
  });
};
