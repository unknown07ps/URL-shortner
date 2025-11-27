
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { redirectToOriginal } = require('./controllers/urlController');
app.get('/:shortCode', redirectToOriginal);

const urlRoutes = require('./routes/url');
app.use('/api/v1', urlRoutes);

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'URL Shortener API is running!',
    version: '1.0.0',
    endpoints: {
      createShortUrl: 'POST /api/v1/shorten',
      getStats: 'GET /api/v1/url/:shortCode/stats',
      deleteUrl: 'DELETE /api/v1/url/:shortCode',
      redirect: 'GET /:shortCode'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;