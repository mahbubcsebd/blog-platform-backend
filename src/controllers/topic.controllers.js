const prisma = require('../config/prisma');
const createHttpError = require('http-errors');
const slugify = require('slugify');

// Helper function to generate unique slug
const generateUniqueSlug = async (name, existingId = null) => {
  const baseSlug = slugify(name, { lower: true, strict: true });

  // Check if base slug is available
  const existingTopic = await prisma.topic.findFirst({
    where: {
      slug: baseSlug,
      ...(existingId && { id: { not: existingId } }),
    },
  });

  if (!existingTopic) {
    return baseSlug;
  }

  // If base slug exists, find next available number
  let counter = 1;
  let newSlug;

  do {
    newSlug = `${baseSlug}-${counter}`;
    const slugExists = await prisma.topic.findFirst({
      where: {
        slug: newSlug,
        ...(existingId && { id: { not: existingId } }),
      },
    });

    if (!slugExists) {
      break;
    }
    counter++;
  } while (counter < 1000); // Safety limit

  return newSlug;
};

exports.getAllTopics = async (req, res) => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: { parent: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch topics' });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const { name, description, icon, color, order, parentId, coverImage } =
      req.body;
    if (!name) throw createHttpError(400, 'Name is required');

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        color: color || null,
        coverImage: coverImage?.trim() || null,
        order: order || 0,
        parentId: parentId || null,
      },
    });

    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    console.error(error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A topic with this slug already exists',
      });
    }

    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to create topic',
    });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, order, parentId, coverImage } =
      req.body;

    if (!name) throw createHttpError(400, 'Name is required');

    // Check if topic exists
    const existingTopic = await prisma.topic.findUnique({
      where: { id },
    });

    if (!existingTopic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    // Generate unique slug only if name changed
    let slug = existingTopic.slug;
    if (name.trim() !== existingTopic.name) {
      slug = await generateUniqueSlug(name, id);
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        color: color || null,
        coverImage: coverImage?.trim() || null,
        order: order || 0,
        parentId: parentId || null,
      },
    });

    res.json({ success: true, data: topic });
  } catch (error) {
    console.error(error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A topic with this slug already exists',
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update topic',
    });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if topic has children
    const childrenCount = await prisma.topic.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete topic that has child topics',
      });
    }

    // Check if topic has posts
    const postsCount = await prisma.post.count({
      where: { topicId: id }, // ← corrected
    });

    if (postsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete topic that has associated posts',
      });
    }

    await prisma.topic.delete({ where: { id } });
    res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(500).json({ success: false, message: 'Failed to delete topic' });
  }
};

// GET /api/topic/tree
exports.getTopicTree = async (req, res) => {
  try {
    const topics = await prisma.topic.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true, // nested one more level, optional
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: topics });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch topic tree' });
  }
};

// GET /api/topic/:slug
exports.getTopicBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: 'Topic not found' });
    }

    res.json({ success: true, data: topic });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch topic' });
  }
};
