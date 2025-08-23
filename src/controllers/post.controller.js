const createHttpError = require('http-errors');
const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const slugify = require('../helpers/slugify');
const calculateReadTime = require('../helpers/calculateReadTime');

exports.createPost = async (req, res) => {
  console.log(req.user);
  try {
    const {
      title,
      content,
      htmlContent,
      contentType,
      excerpt,
      status,
      publishDate,
      tags,
    } = req.body;

    if (!title || !content) {
      throw createHttpError(400, 'Title and content are required');
    }

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

    // Calculate read time
    const readTime = calculateReadTime(finalContent);

    // Prisma-compatible postTags
    const postTagsData =
      parsedTags.length > 0
        ? {
            create: parsedTags.map((tag) => ({ tagId: tag.id })),
          }
        : undefined;

    const postData = {
      title: title.trim(),
      slug: generatedSlug,
      content: finalContent,
      htmlContent: htmlContent || null,
      contentType: contentType || 'MARKDOWN',
      excerpt: excerpt || null,
      status: status || 'DRAFT',
      publishDate: publishDate ? new Date(publishDate) : null,
      previewImageUrl,
      authorId: req.user?.userId,
      postTags: postTagsData,
      readTime,
    };

    const newPost = await prisma.post.create({ data: postData });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: newPost,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

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
      status: status || 'DRAFT',
      publishDate: publishDate ? new Date(publishDate) : null,
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
      message: 'Post updated successfully',
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
