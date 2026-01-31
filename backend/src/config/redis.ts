// Redis Client Configuration
// Uses ioredis for robust Redis connection management

import Redis from 'ioredis';
import { redisConfig, serverConfig } from './env';

// Extend global namespace for Redis singleton
declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

// Create Redis client with configuration
const createRedisClient = (): Redis => {
  const client = new Redis(redisConfig.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times: number): number | null => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 100, 30000);
      console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error): boolean => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  // Event handlers
  client.on('connect', () => {
    console.log('Redis client connecting...');
  });

  client.on('ready', () => {
    console.log('Redis client ready');
  });

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err.message);
  });

  client.on('close', () => {
    console.log('Redis client connection closed');
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return client;
};

// Use singleton pattern for Redis client
const redis: Redis = global.redis ?? createRedisClient();

if (serverConfig.isDevelopment) {
  global.redis = redis;
}

// Redis connection helper
export async function connectRedis(): Promise<void> {
  try {
    // Ping to verify connection
    await redis.ping();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // Don't throw - Redis failures shouldn't prevent app startup
    // The app can function without Redis (degraded mode)
  }
}

// Redis disconnection helper
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('Redis disconnected successfully');
  } catch (error) {
    console.error('Failed to disconnect from Redis:', error);
  }
}

// Health check for Redis
export async function checkRedisHealth(): Promise<{
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Unexpected ping response');
    }
    return {
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

// Cache utility functions
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete multiple keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Set expiration on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await redis.expire(key, ttlSeconds);
  },
};

export { redis };
export default redis;
