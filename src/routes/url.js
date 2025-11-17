// src/routes/url.js

const express = require('express');
const router = express.Router();

const {
  createShortUrl,
  redirectToOriginal,
  getUrlStats,
  deleteUrl
} = require('../controllers/urlController');

router.post('/shorten', createShortUrl);

router.get('/url/:shortCode/stats', getUrlStats);

router.delete('/url/:shortCode', deleteUrl);

router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'URL Shortener API is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;