const prisma = require('../config/prisma');

// ✅ Create Topic
exports.createTopic = async (req, res) => {
  try {
    const { name, slug, parentId, order } = req.body;

    if (!name || !slug) {
      return res
        .status(400)
        .json({ success: false, message: 'Name and slug are required' });
    }

    const newTopic = await prisma.topic.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        order: order || 0,
      },
    });

    res.status(201).json({ success: true, data: newTopic });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get All Topics (Flat)
exports.getAllTopics = async (req, res) => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { order: 'asc' },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });

    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Topic Tree (Hierarchy)
exports.getTopicTree = async (req, res) => {
  try {
    const topics = await prisma.topic.findMany({
      where: { parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: {
          orderBy: { order: 'asc' },
          include: {
            children: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error fetching topic tree:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Single Topic by Slug
exports.getTopicBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { slug },
      include: {
        children: { orderBy: { order: 'asc' } },
        parent: true,
      },
    });

    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: 'Topic not found' });
    }

    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Update Topic
exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId, order } = req.body;

    const updatedTopic = await prisma.topic.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: parentId || null,
        order,
      },
    });

    res.json({ success: true, data: updatedTopic });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Delete Topic
exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.topic.delete({ where: { id } });

    res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
