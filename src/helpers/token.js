const jwt = require('jsonwebtoken');
const { JWT_ACCESS_KEY, JWT_REFRESH_KEY } = require('../config/env');

// ইউজার অথেনটিকেশন সফল হলে এই ফাংশনটি কল করুন
function generateTokens(user) {
    // Access Token তৈরি
    const accessToken = jwt.sign({ userId: user._id }, JWT_ACCESS_KEY, {
        expiresIn: '15m',
    });

    // Refresh Token তৈরি
    const refreshToken = jwt.sign({ userId: user._id }, JWT_REFRESH_KEY, {
        expiresIn: '7d',
    });

    return { accessToken, refreshToken };
}

module.exports = generateTokens;
