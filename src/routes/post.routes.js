// routes/post.routes.js
const express = require('express');
const {
  createPost,
  getAllPosts,
  updatePost,
  deletePost,
  getPostBySlug,
  publishPost,
  unpublishPost,
  duplicatePost,
  schedulePost,
} = require('../controllers/post.controller');

const { uploadPreviewImage } = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth');

const postRouter = express.Router();

// create post
postRouter.post(
  '/',
  authMiddleware,
  uploadPreviewImage.single('previewImage'),
  createPost
);
// get all posts
postRouter.get('/', getAllPosts);

// get post by id
postRouter.get('/:slug', getPostBySlug);

// update post
postRouter.put('/:id', uploadPreviewImage.single('previewImage'), updatePost);

// delete post by id
postRouter.delete('/:id', authMiddleware, deletePost);

postRouter.patch('/:id/publish', authMiddleware, publishPost);
postRouter.patch('/:id/unpublish', authMiddleware, unpublishPost);
postRouter.post('/:id/duplicate', authMiddleware, duplicatePost);
postRouter.patch('/:id/schedule', authMiddleware, schedulePost);

module.exports = postRouter;
