require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { apiLimiter } = require('./middlewares/rateLimiter');
const urlRoutes = require('./routes/urlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test.html'));
});

app.get('/api', (req, res) => {
  res.json({ 
    success: true,
    message: 'URL Shortener API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      createUrl: 'POST /api/urls',
      getAllUrls: 'GET /api/urls',
      getAnalytics: 'GET /api/urls/:shortCode/analytics',
      generateQR: 'GET /api/urls/:shortCode/qr',
      updateUrl: 'PUT /api/urls/:shortCode',
      deleteUrl: 'DELETE /api/urls/:shortCode',
      redirect: 'GET /:shortCode'
    }
  });
});

app.use('/api', apiLimiter);
app.use('/api/urls', urlRoutes);

app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    if (shortCode === 'favicon.ico') {
      return res.status(204).end();
    }

    const Url = require('./models/url');
    const AnalyticsService = require('./services/analyticsService');
    const { getCache, setCache } = require('./services/cacheService');

    let cachedUrl = await getCache(`url:${shortCode}`);

    if (cachedUrl) {
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

    const url = await Url.findOne({ shortCode, isActive: true });

    if (!url) {
      return res.status(404).json({ 
        success: false, 
        message: 'Short URL not found or has expired' 
      });
    }

    if (url.expiresAt && new Date() > url.expiresAt) {
      url.isActive = false;
      await url.save();
      return res.status(410).json({ 
        success: false, 
        message: 'This short URL has expired' 
      });
    }

    const analyticsData = AnalyticsService.parseRequestData(req);
    await url.recordClick(analyticsData);

    await setCache(`url:${shortCode}`, {
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      customDomain: url.customDomain
    }, 3600);

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

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`UI available at: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
      console.log(`API documentation: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;