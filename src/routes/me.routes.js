const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { getPostByUserId } = require('../controllers/me.controller');

const meRouter = express.Router();

// get posts by user
meRouter.get('/posts', authMiddleware, getPostByUserId);

module.exports = meRouter;
