// src/config/database.js
const prisma = require('./prisma');

const connectToDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
};

const disconnectFromDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('🛑 Database disconnected');
  } catch (error) {
    console.error('❌ Error during disconnection:', error);
  }
};

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
};
