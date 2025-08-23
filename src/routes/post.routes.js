// routes/post.routes.js
const express = require('express');
const {
  createPost,
  getAllPosts,
  updatePost,
  deletePost,
  getPostBySlug,
} = require('../controllers/post.controller');

const { uploadPreviewImage } = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth');

const postRouter = express.Router();

// Routes
postRouter.post(
  '/',
  authMiddleware,
  uploadPreviewImage.single('previewImage'),
  createPost
);
postRouter.get('/', getAllPosts);

// Important: Keep slug route after fixed routes like `/` or `/search`
postRouter.get('/:slug', getPostBySlug);
postRouter.put('/:id', uploadPreviewImage.single('previewImage'), updatePost);
postRouter.delete('/:id', deletePost);

module.exports = postRouter;
