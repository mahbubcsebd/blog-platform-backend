// cleanDatabase.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    // Delete data from all models
    await prisma.postTag.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({});
    // Add other models here
    console.log('✅ All data deleted successfully using Prisma Client.');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
// Run the script using the following command:
// npx ts-node cleanDatabase.ts
