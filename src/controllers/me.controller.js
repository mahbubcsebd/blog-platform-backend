const prisma = require('../config/prisma');

// post by user id
exports.getPostByUserId = async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    res.status(500).json({
      success: false,
      message: 'user id not found',
    });
  }

  try {
    const userAllPost = await prisma.post.findMany({
      where: {
        authorId: userId,
        status: 'PUBLISHED',
      },
    });

    res.status(200).json({
      success: true,
      message: 'post fetch successfully',
      data: userAllPost,
    });
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post.',
    });
  }
};
