const rateLimit = require('express-rate-limit');

let RedisStore;
let storeConfig;

try {
  const rateLimitRedis = require('rate-limit-redis');
  RedisStore = rateLimitRedis.default || rateLimitRedis;
  const { redis } = require('../services/cacheService');
  
  storeConfig = {
    sendCommand: (...args) => redis.call(...args),
  };
  
  console.log('Using Redis for rate limiting');
} catch (error) {
  console.warn('Redis store not available, using memory store for rate limiting');
  RedisStore = null;
}

function createStore(prefix) {
  if (RedisStore && storeConfig) {
    return new RedisStore({
      ...storeConfig,
      prefix: `rl:${prefix}:`,
    });
  }
  return undefined;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('api'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('create'),
  message: {
    success: false,
    message: 'Too many URL creation requests. Maximum 100 per minute. Please try again later.'
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

const batchCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('batch'),
  message: {
    success: false,
    message: 'Batch operations are limited to 20 requests per 5 minutes'
  }
});

const qrCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('qr'),
  message: {
    success: false,
    message: 'QR code generation limit exceeded. Maximum 100 per minute.'
  }
});

module.exports = {
  apiLimiter,
  createUrlLimiter,
  batchCreateLimiter,
  qrCodeLimiter
};