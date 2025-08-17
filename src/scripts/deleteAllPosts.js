const prisma = require('../config/prisma');

async function deleteAllPosts() {
  try {
    // 1. Delete all PostTag relationships first
    await prisma.postTag.deleteMany({});
    console.log('✅ Deleted all PostTag entries');

    // 2. Then delete all posts
    const result = await prisma.post.deleteMany({});
    console.log(`✅ Deleted ${result.count} post(s)`);
  } catch (error) {
    console.error('❌ Error deleting posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllPosts();
