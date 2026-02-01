// Config Module Exports
// Centralizes all configuration exports for clean imports

export {
  env,
  serverConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  rateLimitConfig,
  corsConfig,
  loggingConfig,
} from './env';

export {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
} from './database';

export {
  redis,
  cache,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
} from './redis';

export {
  storageConfig,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  UPLOAD_DIR,
  STORAGE_BASE_PATH,
  UPLOAD_PATH,
  UPLOAD_URL_PREFIX,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  IMAGE_QUALITY,
  OUTPUT_FORMAT,
  MAX_VIDEO_FILE_SIZE,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEOS_PER_BOXER,
  type AllowedMimeType,
  type AllowedVideoMimeType,
} from './storage';
