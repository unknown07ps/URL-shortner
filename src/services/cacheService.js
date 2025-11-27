const Redis = require('ioredis');

let redis;
let isRedisAvailable = false;

function createRedisClient() {
  try {
    let client;
    
    if (process.env.REDIS_PUBLIC_URL) {
      console.log('Attempting to connect to Redis via REDIS_PUBLIC_URL');
      client = new Redis(process.env.REDIS_PUBLIC_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed after 3 retries, using fallback mode');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        tls: process.env.REDIS_PUBLIC_URL.includes('rediss://') ? {
          rejectUnauthorized: false
        } : undefined
      });
    } else if (process.env.REDIS_URL) {
      console.log('Attempting to connect to Redis via REDIS_URL');
      client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed after 3 retries, using fallback mode');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        tls: process.env.REDIS_URL.includes('rediss://') ? {
          rejectUnauthorized: false
        } : undefined
      });
    } else if (process.env.REDISHOST || process.env.REDIS_HOST) {
      const host = process.env.REDISHOST || process.env.REDIS_HOST;
      const port = process.env.REDISPORT || process.env.REDIS_PORT || 6379;
      const password = process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined;
      
      console.log(`Attempting to connect to Redis at ${host}:${port}`);
      client = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 10000,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed after 3 retries, using fallback mode');
            return null;
          }
          return Math.min(times * 50, 2000);
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
      isRedisAvailable = false;
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        console.log('Redis connection unavailable, using memory fallback');
      } else {
        console.error('Redis error:', err.message);
      }
    });

    client.on('close', () => {
      isRedisAvailable = false;
    });

    client.connect().catch((err) => {
      console.log('Initial Redis connection failed:', err.message);
      console.log('Continuing with memory fallback');
      isRedisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error.message);
    console.log('Using memory fallback');
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