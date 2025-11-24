const express = require('express');
const router = express.Router();
const News = require('../models/news');
const { verifyToken } = require('../middleware/auth');
const { uploadNewsImage } = require('../middleware/upload');

// Public routes

// Get all published news (public)
router.get('/public', async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    
    const query = { status: 'published' };
    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const news = await News.find(query)
      .populate('author', 'firstName lastName')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await News.countDocuments(query);

    res.json({
      success: true,
      data: {
        news,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching public news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
    });
  }
});

// Get single news by ID (public) - increments view count
router.get('/public/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'firstName lastName');

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    if (news.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // Increment views
    await news.incrementViews();

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
    });
  }
});

// Get latest news (public) - for homepage
router.get('/public/latest/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 3;
    
    const news = await News.find({ status: 'published' })
      .populate('author', 'firstName lastName')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(count);

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching latest news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest news',
    });
  }
});

// Admin routes (protected)

// Get all news (admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const news = await News.find(query)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        count: news.length,
        news,
      },
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
    });
  }
});

// Get single news by ID (admin)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'firstName lastName');

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
    });
  }
});

// Create news
router.post('/', verifyToken, uploadNewsImage.single('imageFile'), async (req, res) => {
  try {
    const { title, description, content, imageUrl, category, status } = req.body;

    // Determine image path - either from uploaded file or URL
    let imagePath;
    if (req.file) {
      // File was uploaded - use the server path
      imagePath = `/uploads/news/${req.file.filename}`;
    } else if (imageUrl) {
      // URL was provided
      imagePath = imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either an image file or image URL',
      });
    }

    // Validation
    if (!title || !description || !content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide title, description, and content',
      });
    }

    const newsData = {
      title,
      description,
      content,
      image: imagePath,
      category: category || 'General',
      status: status || 'draft',
      author: req.user.id,
    };

    // Set publishedAt if status is published
    if (status === 'published') {
      newsData.publishedAt = new Date();
    }

    const news = new News(newsData);
    await news.save();

    const populatedNews = await News.findById(news._id)
      .populate('author', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedNews,
    });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create news',
    });
  }
});

// Update news
router.put('/:id', verifyToken, uploadNewsImage.single('imageFile'), async (req, res) => {
  try {
    const { title, description, content, imageUrl, category, status } = req.body;

    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    // Update fields
    if (title) news.title = title;
    if (description) news.description = description;
    if (content) news.content = content;
    if (category) news.category = category;
    
    // Update image if provided
    if (req.file) {
      // New file was uploaded
      news.image = `/uploads/news/${req.file.filename}`;
    } else if (imageUrl) {
      // New URL was provided
      news.image = imageUrl;
    }
    
    // Handle status change
    if (status && status !== news.status) {
      news.status = status;
      
      // Set publishedAt when changing from draft to published
      if (status === 'published' && !news.publishedAt) {
        news.publishedAt = new Date();
      }
    }

    await news.save();

    const updatedNews = await News.findById(news._id)
      .populate('author', 'firstName lastName');

    res.json({
      success: true,
      data: updatedNews,
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update news',
    });
  }
});

// Delete news
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'News not found',
      });
    }

    res.json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete news',
    });
  }
});

// Get news statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const [total, published, drafts, totalViews] = await Promise.all([
      News.countDocuments(),
      News.countDocuments({ status: 'published' }),
      News.countDocuments({ status: 'draft' }),
      News.aggregate([
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        published,
        drafts,
        totalViews: totalViews[0]?.totalViews || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching news stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news statistics',
    });
  }
});

module.exports = router;
