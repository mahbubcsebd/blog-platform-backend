const prisma = require('../config/prisma');

/**
 * Create a new category
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    // Validation
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        slug,
      },
    });

    return res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
};
