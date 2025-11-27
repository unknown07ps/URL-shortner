const Redis = require('ioredis');

let redis;
let isRedisAvailable = false;

function createRedisClient() {
  try {
    let client;
    
    if (process.env.REDIS_URL) {
      client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed, switching to fallback mode');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        tls: process.env.REDIS_URL.includes('rediss://') ? {
          rejectUnauthorized: false
        } : undefined
      });
    } else if (process.env.REDIS_HOST) {
      client = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed, switching to fallback mode');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    } else {
      console.log('No Redis configuration found, using in-memory fallback');
      return null;
    }

    client.on('connect', () => {
      console.log('Redis connected successfully');
      isRedisAvailable = true;
    });

    client.on('ready', () => {
      console.log('Redis ready to accept commands');
      isRedisAvailable = true;
    });

    client.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      isRedisAvailable = false;
    });

    client.on('close', () => {
      console.log('Redis connection closed');
      isRedisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error.message);
    return null;
  }
}

redis = createRedisClient();

async function getCache(key) {
  if (!redis || !isRedisAvailable) {
    return null;
  }
  
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting cache:', error.message);
    return null;
  }
}

async function setCache(key, value, expiryInSeconds = 3600) {
  if (!redis || !isRedisAvailable) {
    return false;
  }
  
  try {
    await redis.setex(key, expiryInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error setting cache:', error.message);
    return false;
  }
}

async function deleteCache(key) {
  if (!redis || !isRedisAvailable) {
    return false;
  }
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting cache:', error.message);
    return false;
  }
}

async function clearAllCache() {
  if (!redis || !isRedisAvailable) {
    return false;
  }
  
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error.message);
    return false;
  }
}

module.exports = {
  redis,
  getCache,
  setCache,
  deleteCache,
  clearAllCache,
  isRedisAvailable: () => isRedisAvailable
};