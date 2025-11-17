// src/services/cacheService.js

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

async function getCache(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
}

async function setCache(key, value, expiryInSeconds = 3600) {
  try {
    await redis.setex(key, expiryInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error setting cache:', error);
    return false;
  }
}

async function deleteCache(key) {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting cache:', error);
    return false;
  }
}

async function clearAllCache() {
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

module.exports = {
  redis,
  getCache,
  setCache,
  deleteCache,
  clearAllCache
};