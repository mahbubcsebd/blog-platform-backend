const express = require('express');
const {
  createCategory,
  getCategories,
} = require('../controllers/category.controllers');
const categoryRouter = express.Router();

categoryRouter.post('/', createCategory);
categoryRouter.get('/', getCategories);

module.exports = categoryRouter;
