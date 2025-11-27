const Url = require('../models/url');
const { getNextSequence } = require('../services/counterService');
const { encode } = require('../utils/base62');
const { getCache, setCache, deleteCache } = require('../services/cacheService');

async function createShortUrl(req, res) {
  try {
    const { originalUrl, customAlias } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        error: 'originalUrl is required'
      });
    }

    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    const existingUrl = await Url.findOne({ originalUrl });
    
    if (existingUrl) {
      return res.status(200).json({
        success: true,
        message: 'URL already shortened',
        data: {
          shortUrl: `${process.env.BASE_URL}/${existingUrl.shortCode}`,
          shortCode: existingUrl.shortCode,
          originalUrl: existingUrl.originalUrl,
          createdAt: existingUrl.createdAt
        }
      });
    }

    let shortCode;

    if (customAlias) {
      const existingAlias = await Url.findOne({ shortCode: customAlias });
      
      if (existingAlias) {
        return res.status(409).json({
          success: false,
          error: 'Custom alias already taken'
        });
      }
      
      shortCode = customAlias;
    } else {
      const sequenceNumber = await getNextSequence('urlCounter');
      shortCode = encode(sequenceNumber);
    }

    const newUrl = new Url({
      shortCode,
      originalUrl,
      customAlias: customAlias || null,
      createdAt: new Date(),
      clicks: 0
    });

    await newUrl.save();

    await setCache(`url:${shortCode}`, {
      originalUrl: newUrl.originalUrl,
      shortCode: newUrl.shortCode
    }, 3600);

    res.status(201).json({
      success: true,
      message: 'Short URL created successfully',
      data: {
        shortUrl: `${process.env.BASE_URL}/${shortCode}`,
        shortCode,
        originalUrl,
        createdAt: newUrl.createdAt
      }
    });

  } catch (error) {
    console.error('Error in createShortUrl:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function redirectToOriginal(req, res) {
  try {
    const { shortCode } = req.params;

    const cached = await getCache(`url:${shortCode}`);
    
    if (cached) {
      await Url.updateOne(
        { shortCode },
        {
          $inc: { clicks: 1 },
          $set: { lastVisited: new Date() }
        }
      );

      return res.redirect(302, cached.originalUrl);
    }

    const urlDoc = await Url.findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found'
      });
    }

    await setCache(`url:${shortCode}`, {
      originalUrl: urlDoc.originalUrl,
      shortCode: urlDoc.shortCode
    }, 3600);

    await Url.updateOne(
      { shortCode },
      {
        $inc: { clicks: 1 },
        $set: { lastVisited: new Date() }
      }
    );

    res.redirect(302, urlDoc.originalUrl);

  } catch (error) {
    console.error('Error in redirectToOriginal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function getUrlStats(req, res) {
  try {
    const { shortCode } = req.params;

    const urlDoc = await Url.findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        shortCode: urlDoc.shortCode,
        originalUrl: urlDoc.originalUrl,
        clicks: urlDoc.clicks,
        createdAt: urlDoc.createdAt,
        lastVisited: urlDoc.lastVisited,
        isCustomAlias: !!urlDoc.customAlias
      }
    });

  } catch (error) {
    console.error('Error in getUrlStats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

async function deleteUrl(req, res) {
  try {
    const { shortCode } = req.params;

    const result = await Url.findOneAndDelete({ shortCode });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Short URL not found'
      });
    }

    await deleteCache(`url:${shortCode}`);

    res.status(200).json({
      success: true,
      message: 'Short URL deleted successfully',
      data: {
        shortCode: result.shortCode,
        originalUrl: result.originalUrl
      }
    });

  } catch (error) {
    console.error('Error in deleteUrl:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createShortUrl,
  redirectToOriginal,
  getUrlStats,
  deleteUrl
};