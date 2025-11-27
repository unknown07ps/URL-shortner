const rateLimit = require('express-rate-limit');

let RedisStore;
let redis;
let useRedis = false;

try {
  const rateLimitRedis = require('rate-limit-redis');
  RedisStore = rateLimitRedis.default || rateLimitRedis;
  const cacheService = require('../services/cacheService');
  redis = cacheService.redis;
  
  if (redis) {
    redis.once('ready', () => {
      useRedis = true;
      console.log('Using Redis for rate limiting');
    });

    redis.on('error', () => {
      useRedis = false;
      console.log('Redis unavailable, using memory store for rate limiting');
    });
  } else {
    console.log('Redis not configured, using memory store for rate limiting');
  }
} catch (error) {
  console.log('Redis store not available, using memory store for rate limiting');
  RedisStore = null;
}

function createStore(prefix) {
  if (RedisStore && redis && useRedis) {
    try {
      return new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: `rl:${prefix}:`,
      });
    } catch (error) {
      console.log(`Failed to create Redis store for ${prefix}, falling back to memory store`);
      return undefined;
    }
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