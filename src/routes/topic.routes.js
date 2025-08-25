const express = require('express');
const {
  createTopic,
  getAllTopics,
  getTopicTree,
  getTopicBySlug,
  updateTopic,
  deleteTopic,
} = require('../controllers/topic.controllers');
const { authMiddleware, isAdmin } = require('../middlewares/auth.middleware');

const topicRouter = express.Router();

// ✅ Create Topic
topicRouter.post('/', authMiddleware, isAdmin, createTopic);

// ✅ Get All Topics (Flat + with parent info + post count)
topicRouter.get('/', getAllTopics);

// ✅ Get Topic Tree (Hierarchy)
topicRouter.get('/tree', getTopicTree);

// ✅ Get Topic by Slug (with parent + children)
topicRouter.get('/:slug', getTopicBySlug);

// ✅ Update Topic
topicRouter.put('/:id', authMiddleware, isAdmin, updateTopic);

// ✅ Delete Topic
topicRouter.delete('/:id', authMiddleware, isAdmin, deleteTopic);

module.exports = topicRouter;
