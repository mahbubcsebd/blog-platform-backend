console.log('📦 Loading Prisma client...');

let prisma;
try {
  prisma = require('./prisma');
  console.log('✅ Prisma client loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Prisma client:', error);
  throw error;
}

const connectToDatabase = async () => {
  try {
    console.log('🔍 Database configuration check:');
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }

    const dbUrl = process.env.DATABASE_URL;
    console.log('- Database type:', dbUrl.split(':')[0]);
    console.log('- Connection preview:', dbUrl.substring(0, 30) + '...');

    console.log('🔄 Attempting Prisma connection...');
    await prisma.$connect();
    console.log('✅ Prisma client connected successfully');

    // MongoDB compatible connection test
    console.log('🔄 Testing MongoDB connection...');
    try {
      // Use MongoDB ping command
      await prisma.$runCommandRaw({ ping: 1 });
      console.log('✅ MongoDB ping successful');
    } catch (pingError) {
      console.log('⚠️ Ping command failed, but connection seems OK');
      console.log('Ping error:', pingError.message);
    }

    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    console.error('- Error stack:', error.stack);

    throw error;
  }
};

const disconnectFromDatabase = async () => {
  try {
    console.log('🔄 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('🛑 Database disconnected successfully');
  } catch (error) {
    console.error('❌ Error during disconnection:', error);
  }
};

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
};
