// src/middlewares/rateLimiter.js

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');

// General API rate limiter (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:api:',
  }),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Strict rate limiter for URL creation (5 requests per minute)
const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:create:',
  }),
  message: {
    success: false,
    message: 'Too many URL creation requests. Maximum 5 per minute. Please try again later.'
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Batch URL creation limiter (2 requests per 5 minutes)
const batchCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:batch:',
  }),
  message: {
    success: false,
    message: 'Batch operations are limited to 2 requests per 5 minutes'
  }
});

// QR code generation limiter (10 per minute)
const qrCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:qr:',
  }),
  message: {
    success: false,
    message: 'QR code generation limit exceeded. Maximum 10 per minute.'
  }
});

module.exports = {
  apiLimiter,
  createUrlLimiter,
  batchCreateLimiter,
  qrCodeLimiter
};