const jwt = require('jsonwebtoken');

const createJsonWebToken = (data, secretKey, expiresIn) => {
    if (typeof data !== 'object' || data === '') {
        throw new Error('Payload must be an non-empty object');
    }

    if (typeof secretKey !== 'string' || secretKey === '') {
        throw new Error('Secret Key must be an non-empty object');
    }

    try {
        const token = jwt.sign(data, secretKey, {
            // Remove the { } around data
            expiresIn,
        });

        return token;
    } catch (error) {
        console.error("Couldn't create JWT token");
        throw new Error(error.message);
    }
};

module.exports = { createJsonWebToken };
