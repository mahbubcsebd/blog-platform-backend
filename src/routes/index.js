const express = require('express');

const routes = express.Router();

// Import all route files
const authRouter = require('./auth.routes');
const userRouter = require('./user.routes');
const postRouter = require('./post.routes');
const categoryRouter = require('./category.routes');
const topicRouter = require('./topic.routes');
const meRouter = require('./me.routes');

// Use routes
routes.use('/auth', authRouter);
routes.use('/user', userRouter);
routes.use('/me', meRouter);
routes.use('/posts', postRouter);
routes.use('/categories', categoryRouter);
routes.use('/topics', topicRouter);

module.exports = routes;
