// src/scripts/addUserNewField.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.user.updateMany({
      data: {
        isActive: true,
      },
    });

    console.log(`✅ Updated ${result.count} users with new fields.`);
  } catch (err) {
    console.error('❌ Error updating users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
