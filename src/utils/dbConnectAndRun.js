/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const { MONGO_URI } = require('../config/env');

const dbConnectAndRun = async (...callbacks) => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Database Connected');

        for (const callback of callbacks) {
            await callback();
        }

        await mongoose.connection.close();
        console.log('✅ Database Connection Closed');
        process.exit(0);
    } catch (error) {
        console.error(`❌ Database Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = dbConnectAndRun;
