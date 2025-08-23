// src/scripts/addUserNewField.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // সব user update করে default fields বসানো
    const result = await prisma.user.updateMany({
      data: {
        phone: null,
        address: null,
        website: null,
        bio: '',
      },
    });

    console.log(`✅ Updated ${result.count} users with new fields.`);
  } catch (err) {
    console.error('❌ Error updating users:', err);
  } finally {
    // disconnect সব সময় finally এর ভেতরে রাখো
    await prisma.$disconnect();
  }
}

main();
