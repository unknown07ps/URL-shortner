// src/routes/redirectRoute.js

const express = require('express');
const router = express.Router();
const Url = require('../models/url');
const AnalyticsService = require('../services/analyticsService');
const { getCache, setCache } = require('../services/cacheService');

// GET /:shortCode - Redirect to original URL with analytics
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Try to get from cache first
    let cachedUrl = await getCache(`url:${shortCode}`);

    if (cachedUrl) {
      // Record analytics in background (don't wait)
      setImmediate(async () => {
        try {
          const url = await Url.findOne({ shortCode, isActive: true });
          if (url) {
            const analyticsData = AnalyticsService.parseRequestData(req);
            await url.recordClick(analyticsData);
          }
        } catch (error) {
          console.error('Error recording click:', error);
        }
      });

      return res.redirect(301, cachedUrl.originalUrl);
    }

    // If not in cache, get from database
    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found or has expired' 
      });
    }

    // Check if URL has expired
    if (url.expiresAt && new Date() > url.expiresAt) {
      url.isActive = false;
      await url.save();
      return res.status(410).json({ 
        success: false, 
        message: 'This short URL has expired' 
      });
    }

    // Record click with analytics
    const analyticsData = AnalyticsService.parseRequestData(req);
    await url.recordClick(analyticsData);

    // Update cache
    await setCache(`url:${shortCode}`, {
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      customDomain: url.customDomain
    }, 3600);

    // Redirect to original URL
    res.redirect(301, url.originalUrl);

  } catch (error) {
    console.error('Error in redirect:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;