const createHttpError = require('http-errors');
const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');

exports.createPost = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded preview image file:', req.file); // 👈 Logging the uploaded file

    const {
      title,
      slug,
      content,
      htmlContent,
      contentType,
      excerpt,
      status,
      publishDate,
      tags,
      order,
    } = req.body;

    // Validation
    if (!title || !slug || !content) {
      throw createHttpError(400, 'Title, slug, and content are required');
    }

    // Slug uniqueness check
    const existingPost = await prisma.post.findUnique({
      where: { slug: slug.trim() },
    });
    if (existingPost) {
      throw createHttpError(400, 'A post with this slug already exists');
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = [];
      }
    }

    // Handle contentType content
    let finalContent = content;
    if (contentType === 'EDITOR' && typeof content === 'string') {
      try {
        JSON.parse(content);
      } catch {
        console.warn('Content is not valid JSON');
      }
    }

    // Upload preview image to Cloudinary
    let previewImageUrl = null;

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'posts',
      });
      previewImageUrl = uploadResult.secure_url;
    }

    // Prepare post data for Prisma
    const postData = {
      title: title.trim(),
      slug: slug.trim(),
      content: finalContent,
      htmlContent: htmlContent || null,
      contentType: contentType || 'MARKDOWN',
      excerpt: excerpt || null,
      status: status || 'DRAFT',
      publishDate: publishDate ? new Date(publishDate) : null,
      order: parseInt(order) || 0,
      previewImageUrl: previewImageUrl,
      authorId: req.user?.id || '688f2d87385e62eabe970024', // replace as needed
      topicId: '688fe649dd1ba11fee1273ed', // static or dynamic as needed
    };

    console.log('Creating post with data:', postData);

    // Save the post
    const newPost = await prisma.post.create({
      data: postData,
    });

    // Respond with success
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: newPost,
    });
  } catch (error) {
    console.error('Error creating post:', error);

    // Prisma unique constraint error (slug)
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A post with this slug already exists',
      });
    }

    // Custom http errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    // Default fallback
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * ======================================================
 * Update an Existing Post
 * ======================================================
 */
exports.updatePost = async (req, res) => {
  const { id } = req.params;

  try {
    const {
      title,
      slug,
      content,
      htmlContent,
      contentType,
      excerpt,
      status,
      publishDate,
      order,
      topicId,
      tags: rawTags, // front-end থেকে array বা JSON string আসতে পারে
    } = req.body;

    // Parse tags যদি string আসে
    let parsedTags = [];
    if (rawTags) {
      parsedTags = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags);
    }

    // Handle preview image upload
    let previewImageUrl;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'posts',
      });
      previewImageUrl = uploadResult.secure_url;
    }

    // Update main post fields
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        htmlContent,
        contentType,
        excerpt,
        status,
        publishDate: publishDate ? new Date(publishDate) : null,
        order: order ? parseInt(order) : 0,
        topicId: topicId || null,
        ...(previewImageUrl && { previewImageUrl }),
      },
    });

    // Remove existing PostTag relations
    await prisma.postTag.deleteMany({
      where: { postId: id },
    });

    // Upsert tags and create PostTag relations
    for (const tagName of parsedTags) {
      const cleanedName = tagName.trim().toLowerCase();
      if (!cleanedName) continue;

      const tag = await prisma.tag.upsert({
        where: { name: cleanedName },
        update: {},
        create: { name: cleanedName },
      });

      await prisma.postTag.create({
        data: {
          postId: updatedPost.id,
          tagId: tag.id,
        },
      });
    }

    // Fetch updated post with tags
    const postWithTags = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    // Format tags array
    const formattedPost = {
      ...postWithTags,
      tags: postWithTags.postTags.map((pt) => pt.tag),
    };
    delete formattedPost.postTags;

    res.json({ success: true, data: formattedPost });
  } catch (error) {
    console.error('Error updating post:', error);

    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({ success: false, message: 'Post not found.' });
    }

    res
      .status(500)
      .json({
        success: false,
        message: error.message || 'Failed to update post.',
      });
  }
};

/**
 * ======================================================
 * Get All Posts (Updated)
 * ======================================================
 */
exports.getAllPosts = async (req, res) => {
  try {
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
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        topic: true,
        postTags: { include: { tag: true } },
      },
    });

    // নতুন মডেল অনুযায়ী ডেটা ফরম্যাট করুন
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
      content: post.content,
      contentType: post.contentType,
      htmlContent: post.htmlContent,
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
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts.' });
  }
};

/**
 * ======================================================
 * Get Single Post by Slug (Updated)
 * ======================================================
 */
// exports.getPostBySlug = async (req, res) => {
//   try {
//     const { slug } = req.params;
//     const post = await prisma.post.findUnique({
//       where: { slug },
//       include: {
//         author: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             bio: true,
//           },
//         },
//         topic: true,
//         postTags: { include: { tag: true } },
//       },
//     });

//     if (!post) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'Post not found' });
//     }

//     // Auth check (উদাহরণ)
//     // if (post.status !== 'PUBLISHED' && req.user?.role !== 'ADMIN') {
//     //   return res.status(404).json({ success: false, message: 'Post not found' });
//     // }

//     // আগের ও পরের পোস্ট নেভিগেশনের জন্য
//     const allPostsInTopic = await prisma.post.findMany({
//       where: { topicId: post.topicId, status: 'PUBLISHED' },
//       orderBy: { order: 'asc' },
//       select: { slug: true, title: true },
//     });

//     const currentIndex = allPostsInTopic.findIndex((p) => p.slug === slug);
//     const prevPost =
//       currentIndex > 0 ? allPostsInTopic[currentIndex - 1] : null;
//     const nextPost =
//       currentIndex < allPostsInTopic.length - 1
//         ? allPostsInTopic[currentIndex + 1]
//         : null;

//     // নতুন মডেল অনুযায়ী ডেটা ফরম্যাট করুন
//     const formattedPost = {
//       id: post.id,
//       title: post.title,
//       slug: post.slug,
//       excerpt: post.excerpt,
//       coverImageUrl: post.coverImageUrl,
//       previewImageUrl: post.previewImageUrl,
//       status: post.status,
//       order: post.order,
//       createdAt: post.createdAt,
//       publishDate: post.publishDate,
//       content: post.content,
//       contentType: post.contentType,
//       htmlContent: post.htmlContent,
//       author: post.author,
//       topic: post.topic,
//       tags: post.postTags.map((pt) => pt.tag),
//       navigation: {
//         prevPost,
//         nextPost,
//       },
//     };

//     res.json({ success: true, data: formattedPost });
//   } catch (error) {
//     console.error('Error fetching post by slug:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch post.' });
//   }
// };

// getPostById ফাংশনটিও getPostBySlug এর মতোই আপডেট করা যাবে।
exports.deletePost = async (req, res) => {
  // এই ফাংশনটি আপনার Next.js Server Action-এর মতো কাজ করবে।
  const { id } = req.params;

  try {
    const deletedUser = await prisma.post.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.status(200).json({ success: true, data: deletedUser });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
};

exports.getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.post.findUnique({
      where: { slug: slug.trim() },
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
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,

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
