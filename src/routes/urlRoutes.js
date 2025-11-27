const express = require('express');
const router = express.Router();
const Url = require('../models/url');
const QRService = require('../services/qrService');
const AnalyticsService = require('../services/analyticsService');
const { createUrlLimiter, batchCreateLimiter, qrCodeLimiter } = require('../middlewares/rateLimiter');
const { setCache, getCache, deleteCache } = require('../services/cacheService');

//Helper function to generate short code
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

//Helper function to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

//POST /api/urls - Create short URL (with rate limiting)
router.post('/', createUrlLimiter, async (req, res) => {
  try {
    const { 
      originalUrl, 
      customAlias, 
      generateQR = false,
      customDomain,
      expiresIn, // in hours
      tags = []
    } = req.body;

    //Validate original URL
    if (!originalUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original URL is required' 
      });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid URL format' 
      });
    }

    //Check if custom alias already exists
    if (customAlias) {
      const existing = await Url.findOne({ 
        $or: [
          { shortCode: customAlias },
          { customAlias: customAlias }
        ]
      });
      
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'Custom alias already in use' 
        });
      }
    }

    //Generate short code
    let shortCode = customAlias || generateShortCode();
    
    //Ensure uniqueness
    while (await Url.findOne({ shortCode })) {
      shortCode = generateShortCode();
    }

    //Create URL document
    const urlData = {
      originalUrl,
      shortCode,
      customAlias: customAlias || null,
      customDomain: customDomain || null,
      tags,
      createdBy: AnalyticsService.getClientIP(req)
    };

    //Set expiration if provided
    if (expiresIn) {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + parseInt(expiresIn));
      urlData.expiresAt = expirationDate;
    }

    const url = new Url(urlData);

    //Generate QR code if requested
    if (generateQR) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const shortUrl = customDomain 
        ? `${customDomain}/${shortCode}`
        : `${baseUrl}/${shortCode}`;
      
      url.qrCode = await QRService.generateQRCode(shortUrl);
    }

    await url.save();

    //Cache the URL
    await setCache(`url:${shortCode}`, {
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      customDomain: url.customDomain
    }, 3600);

    res.status(201).json({
      success: true,
      data: {
        shortCode: url.shortCode,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        qrCode: url.qrCode || null,
        expiresAt: url.expiresAt,
        createdAt: url.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

//POST /api/urls/batch : Create multiple URLs at once
router.post('/batch', batchCreateLimiter, async (req, res) => {
  try {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'URLs array is required' 
      });
    }

    if (urls.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 50 URLs per batch' 
      });
    }

    const results = [];
    const errors = [];
    const createdBy = AnalyticsService.getClientIP(req);

    for (let i = 0; i < urls.length; i++) {
      const { originalUrl, customAlias, tags } = urls[i];

      try {
        //Validate URL
        if (!originalUrl || !isValidUrl(originalUrl)) {
          errors.push({ 
            index: i, 
            originalUrl, 
            error: 'Invalid URL format' 
          });
          continue;
        }

        //Generate short code
        let shortCode = customAlias || generateShortCode();
        
        //Check uniqueness
        if (await Url.findOne({ shortCode })) {
          if (customAlias) {
            errors.push({ 
              index: i, 
              originalUrl, 
              error: 'Custom alias already in use' 
            });
            continue;
          }
          shortCode = generateShortCode();
        }

        //Create URL
        const url = new Url({
          originalUrl,
          shortCode,
          customAlias: customAlias || null,
          tags: tags || [],
          createdBy
        });

        await url.save();

        //Cache
        await setCache(`url:${shortCode}`, {
          originalUrl: url.originalUrl,
          shortCode: url.shortCode
        }, 3600);

        results.push({
          shortCode: url.shortCode,
          shortUrl: url.shortUrl,
          originalUrl: url.originalUrl
        });

      } catch (error) {
        errors.push({ 
          index: i, 
          originalUrl, 
          error: error.message 
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error in batch creation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

//GET /api/urls/:shortCode/qr - Generate QR code for existing URL
router.get('/:shortCode/qr', qrCodeLimiter, async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { format = 'png', download = false } = req.query;

    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found' 
      });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = url.customDomain 
      ? `${url.customDomain}/${shortCode}`
      : `${baseUrl}/${shortCode}`;

    if (format === 'svg') {
      const svg = await QRService.generateQRCodeSVG(shortUrl);
      
      if (download) {
        res.setHeader('Content-Disposition', `attachment; filename="${shortCode}-qr.svg"`);
      }
      
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    // Default to PNG
    const qrBuffer = await QRService.generateQRCodeBuffer(shortUrl);
    
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${shortCode}-qr.png"`);
    }
    
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

//GET /api/urls/:shortCode/analytics - Get analytics for a URL
router.get('/:shortCode/analytics', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { days = 7 } = req.query;

    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found' 
      });
    }

    const stats = AnalyticsService.calculateStats(
      url.clickDetails, 
      parseInt(days)
    );

    res.json({
      success: true,
      data: {
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        shortUrl: url.shortUrl,
        totalClicks: url.clicks,
        createdAt: url.createdAt,
        lastAccessed: url.lastAccessed,
        ...stats
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

//GET /api/urls - Get all URLs (dashboard)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      order = 'desc',
      search,
      tag
    } = req.query;

    const query = { isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { originalUrl: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } },
        { customAlias: { $regex: search, $options: 'i' } }
      ];
    }

    // Tag filter
    if (tag) {
      query.tags = tag;
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const urls = await Url.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-clickDetails') // Exclude detailed click data for list view
      .lean();

    const total = await Url.countDocuments(query);

    // Get overview stats
    const allUrls = await Url.find({ isActive: true }).lean();
    const overview = AnalyticsService.getOverviewStats(allUrls);

    res.json({
      success: true,
      data: {
        urls,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUrls: total,
          limit: parseInt(limit)
        },
        overview
      }
    });

  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DELETE /api/urls/:shortCode - Delete a URL
router.delete('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found' 
      });
    }

    // Soft delete
    url.isActive = false;
    await url.save();

    // Remove from cache
    await deleteCache(`url:${shortCode}`);

    res.json({
      success: true,
      message: 'URL deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// PUT /api/urls/:shortCode - Update URL
router.put('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { tags, customDomain } = req.body;

    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found' 
      });
    }

    if (tags) url.tags = tags;
    if (customDomain !== undefined) url.customDomain = customDomain;

    await url.save();

    // Update cache
    await setCache(`url:${shortCode}`, {
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      customDomain: url.customDomain
    }, 3600);

    res.json({
      success: true,
      data: url
    });

  } catch (error) {
    console.error('Error updating URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;