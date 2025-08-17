const express = require('express');
const {
  createCategory,
  getCategories,
} = require('../controllers/category.controllers');
const {
  createTopic,
  getAllTopics,
  getTopicTree,
  getTopicBySlug,
  updateTopic,
  deleteTopic,
} = require('../controllers/topic.controllers');
const topicRouter = express.Router();

// Create Topic
topicRouter.post('/', createTopic);

// Get All Topics
topicRouter.get('/', getAllTopics);

// Get Topic Tree
topicRouter.get('/tree', getTopicTree);

// Get Topic by Slug
topicRouter.get('/:slug', getTopicBySlug);

// Update Topic
topicRouter.put('/:id', updateTopic);

// Delete Topic
topicRouter.delete('/:id', deleteTopic);

module.exports = topicRouter;
