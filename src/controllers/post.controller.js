const createHttpError = require('http-errors');
const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const slugify = require('../helpers/slugify');
const calculateReadTime = require('../helpers/calculateReadTime');

// Helper function to check and auto-publish scheduled posts
const checkAndAutoPublishPosts = async () => {
  try {
    const now = new Date();

    // Find posts that are scheduled and ready to be published
    const scheduledPosts = await prisma.post.findMany({
      where: {
        isScheduled: true,
        publishDate: null,
        status: 'SCHEDULED',
        publishDate: {
          lte: now,
        },
      },
    });

    // Auto-publish eligible posts
    if (scheduledPosts.length > 0) {
      await prisma.post.updateMany({
        where: {
          id: {
            in: scheduledPosts.map((post) => post.id),
          },
        },
        data: {
          status: 'PUBLISHED',
          isScheduled: false,
        },
      });

      console.log(`Auto-published ${scheduledPosts.length} scheduled posts`);
    }

    return scheduledPosts;
  } catch (error) {
    console.error('Error auto-publishing posts:', error);
    return [];
  }
};

// create post
exports.createPost = async (req, res) => {
  console.log(req.file);
  console.log('req user', req.user);

  try {
    const {
      title,
      content,
      htmlContent,
      contentType,
      excerpt,
      status,
      publishDate,
      tags, // ["react", "nextjs", "nodejs"]
    } = req.body;

    if (!title || !content) {
      throw createHttpError(400, 'Title and content are required');
    }

    // Generate slug
    const generatedSlug = slugify(title, { lower: true, strict: true });

    // Parse tags safely
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Connect author safely
    let authorConnect = undefined;
    if (req.user?.id) {
      authorConnect = { id: req.user.id };
    } else if (req.user?.email) {
      authorConnect = { email: req.user.email };
    } else if (req.user?.username) {
      authorConnect = { username: req.user.username };
    }

    // Compute publish date & isScheduled
    const postDate = publishDate ? new Date(publishDate) : new Date();
    const isScheduled = postDate > new Date();

    let previewImageUrl = null;

    if (req.file) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'posts', // optional folder in Cloudinary
          resource_type: 'auto', // automatically detect file type
        });
        previewImageUrl = uploadResult.secure_url;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        htmlContent,
        contentType,
        excerpt,
        status,
        publishDate: postDate,
        isScheduled,
        previewImageUrl,
        slug: generatedSlug,

        ...(authorConnect && { author: { connect: authorConnect } }),

        postTags: parsedTags.length
          ? {
              create: parsedTags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        author: true,
        postTags: { include: { tag: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong',
    });
  }
};

// get all posts (with auto-publish check)
exports.getAllPosts = async (req, res) => {
  try {
    // Check and auto-publish scheduled posts first
    await checkAndAutoPublishPosts();

    const { status, topic, tag, limit, offset } = req.query;
    const where = {};

    if (status) where.status = status;
    if (topic) where.topic = { slug: topic };
    if (tag) {
      where.postTags = { some: { tag: { name: tag } } };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // take: limit ? parseInt(limit) : undefined,
      // skip: offset ? parseInt(offset) : undefined,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl,
      previewImageUrl: post.previewImageUrl,
      status: post.status,
      order: post.order,
      createdAt: post.createdAt,
      publishDate: post.publishDate,
      isScheduled: post.isScheduled,
      content: post.content,
      contentType: post.contentType,
      htmlContent: post.htmlContent,
      author: post.author,
      topic: post.topic,
      tags: post.postTags.map((pt) => pt.tag),
      readCount: post.readCount,
      readTime: post.readTime,
    }));

    res.json({
      success: true,
      count: formattedPosts.length,
      data: formattedPosts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts.' });
  }
};

// post by slug (with auto-publish check)
exports.getPostBySlug = async (req, res) => {
  try {
    // Check and auto-publish scheduled posts first
    await checkAndAutoPublishPosts();

    const { slug } = req.params;

    // ✅ Increment readCount while fetching the post
    const post = await prisma.post.update({
      where: { slug: slug.trim() },
      data: { readCount: { increment: 1 } },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: 'Post not found' });
    }

    // Prev/Next post navigation
    const allPostsInTopic = await prisma.post.findMany({
      where: {
        topicId: post.topicId,
        status: 'PUBLISHED',
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        slug: true,
        title: true,
      },
    });

    const currentIndex = allPostsInTopic.findIndex((p) => p.slug === slug);
    const prevPost =
      currentIndex > 0 ? allPostsInTopic[currentIndex - 1] : null;
    const nextPost =
      currentIndex < allPostsInTopic.length - 1
        ? allPostsInTopic[currentIndex + 1]
        : null;

    // Format final response
    const formattedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      htmlContent: post.htmlContent,
      contentType: post.contentType,
      status: post.status,
      previewImageUrl: post.previewImageUrl,
      coverImageUrl: post.coverImageUrl,
      order: post.order,
      publishDate: post.publishDate,
      isScheduled: post.isScheduled,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      readCount: post.readCount,

      author: post.author || null,
      topic: post.topic || null,
      tags: post.postTags.map((pt) => pt.tag),

      navigation: {
        prevPost,
        nextPost,
      },
    };

    return res.json({
      success: true,
      data: formattedPost,
    });
  } catch (error) {
    console.error('Error fetching post by slug:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch post.',
    });
  }
};

// update post
exports.updatePost = async (req, res) => {
  try {
    const {
      id,
      title,
      content,
      htmlContent,
      contentType,
      excerpt,
      status,
      publishDate,
      tags,
    } = req.body;

    if (!id) throw createHttpError(400, 'Post ID is required');
    if (!title || !content)
      throw createHttpError(400, 'Title and content are required');

    const generatedSlug = slugify(title);

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = [];
      }
    }

    let finalContent = content;
    if (contentType === 'EDITOR' && typeof content === 'string') {
      try {
        JSON.parse(content);
      } catch {}
    }

    let previewImageUrl = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'posts',
      });
      previewImageUrl = uploadResult.secure_url;
    }

    const readTime = calculateReadTime(finalContent);

    // Determine post status and scheduling logic
    let postStatus = status || 'DRAFT';
    let isScheduled = false;
    let finalPublishDate = null;

    if (publishDate) {
      const scheduleDate = new Date(publishDate);
      const now = new Date();

      if (scheduleDate > now && (status === 'DRAFT' || !status)) {
        // Future date and draft status - schedule the post
        postStatus = 'DRAFT';
        isScheduled = true;
        finalPublishDate = scheduleDate;
      } else if (status === 'PUBLISHED' || scheduleDate <= now) {
        // Published status or past/current date - publish immediately
        postStatus = 'PUBLISHED';
        isScheduled = false;
        finalPublishDate = scheduleDate;
      }
    }

    // Prisma-compatible postTags
    const postTagsData =
      parsedTags.length > 0
        ? {
            deleteMany: {}, // remove old tags
            create: parsedTags.map((tag) => ({ tagId: tag.id })),
          }
        : { deleteMany: {} };

    const postData = {
      title: title.trim(),
      slug: generatedSlug,
      content: finalContent,
      htmlContent: htmlContent || null,
      contentType: contentType || 'MARKDOWN',
      excerpt: excerpt || null,
      status: postStatus,
      publishDate: finalPublishDate,
      isScheduled: isScheduled,
      previewImageUrl,
      readTime,
      postTags: postTagsData,
    };

    const updatedPost = await prisma.post.update({
      where: { id },
      data: postData,
      include: { postTags: true },
    });

    res.status(200).json({
      success: true,
      message: isScheduled
        ? `Post scheduled for ${finalPublishDate.toLocaleString()}`
        : 'Post updated successfully',
      data: updatedPost,
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

// delete post
exports.deletePost = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPost = await prisma.post.delete({
      where: {
        id: id,
      },
    });
    res.status(200).json({ success: true, data: deletedPost });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Failed to delete post.' });
  }
};

// publish post immediately
exports.publishPost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // string

  try {
    const existingPost = await prisma.post.findFirst({
      where: { id, authorId: userId },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or no permission to publish.',
      });
    }

    const publishedPost = await prisma.post.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishDate: new Date(),
        isScheduled: false,
      },
      include: {
        author: true,
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: publishedPost,
      message: 'Post published immediately.',
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to publish post.' });
  }
};

// unpublish post
exports.unpublishPost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const existingPost = await prisma.post.findFirst({
      where: { id, authorId: userId },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or no permission to unpublish.',
      });
    }

    const unpublishedPost = await prisma.post.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        publishDate: null,
        isScheduled: false,
      },
      include: {
        author: true,
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: unpublishedPost,
      message: 'Moved to drafts.',
    });
  } catch (error) {
    console.error('Error unpublishing post:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to unpublish post.' });
  }
};

// duplicate post
exports.duplicatePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const originalPost = await prisma.post.findFirst({
      where: { id, authorId: userId },
      include: { postTags: true },
    });

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or no permission to duplicate.',
      });
    }

    const duplicatedPost = await prisma.post.create({
      data: {
        title: `${originalPost.title} (Copy)`,
        content: originalPost.content,
        excerpt: originalPost.excerpt,
        slug: `${originalPost.slug}-copy-${Date.now()}`,
        previewImageUrl: originalPost.previewImageUrl,
        status: 'DRAFT',
        publishDate: null,
        isScheduled: false,
        readTime: originalPost.readTime,
        authorId: userId,
        topicId: originalPost.topicId,
        postTags: {
          create: originalPost.postTags.map((pt) => ({ tagId: pt.tagId })),
        },
      },
      include: {
        author: true,
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: duplicatedPost,
      message: 'Post duplicated.',
    });
  } catch (error) {
    console.error('Error duplicating post:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to duplicate post.' });
  }
};

// schedule post for future publishing
exports.schedulePost = async (req, res) => {
  const { id } = req.params;
  const { scheduledDate } = req.body;
  const userId = req.user.userId;

  try {
    if (!scheduledDate)
      return res
        .status(400)
        .json({ success: false, message: 'Scheduled date required.' });

    const scheduleDateTime = new Date(scheduledDate);
    if (scheduleDateTime <= new Date())
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future.',
      });

    const existingPost = await prisma.post.findFirst({
      where: { id, authorId: userId },
    });
    if (!existingPost)
      return res
        .status(404)
        .json({ success: false, message: 'Post not found.' });

    const scheduledPost = await prisma.post.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        publishDate: scheduleDateTime,
        isScheduled: true,
      },
      include: {
        author: true,
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: scheduledPost,
      message: `Post scheduled for ${scheduleDateTime.toLocaleString()}`,
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to schedule post.' });
  }
};

// Get scheduled posts
exports.getScheduledPosts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const scheduledPosts = await prisma.post.findMany({
      where: {
        authorId: userId,
        isScheduled: true,
        status: 'SCHEDULED',
      },
      orderBy: { publishDate: 'asc' },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    const formattedPosts = scheduledPosts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      publishDate: post.publishDate,
      isScheduled: post.isScheduled,
      createdAt: post.createdAt,
      author: post.author,
      topic: post.topic,
      tags: post.postTags.map((pt) => pt.tag),
    }));

    res.json({
      success: true,
      count: formattedPosts.length,
      data: formattedPosts,
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch scheduled posts.' });
  }
};

// Manual trigger for auto-publishing (for testing or manual execution)
exports.triggerAutoPublish = async (req, res) => {
  try {
    const publishedPosts = await checkAndAutoPublishPosts();

    res.json({
      success: true,
      message: `Auto-published ${publishedPosts.length} posts`,
      data: publishedPosts,
    });
  } catch (error) {
    console.error('Error triggering auto-publish:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger auto-publish.',
    });
  }
};
