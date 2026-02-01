// Storage Configuration
// Defines file upload constraints and paths for profile photos

import fs from 'fs';
import path from 'path';
import { storageEnvConfig, serverConfig } from './env';

// ============================================================================
// File Upload Configuration
// ============================================================================

/**
 * Maximum file size for profile photo uploads (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed MIME types for profile photos
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Type for allowed MIME types
 */
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// ============================================================================
// Video Upload Configuration
// ============================================================================

/**
 * Maximum file size for video uploads (100MB)
 */
export const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Allowed MIME types for video uploads
 */
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
] as const;

/**
 * Type for allowed video MIME types
 */
export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

/**
 * Maximum number of videos a boxer can upload
 */
export const MAX_VIDEOS_PER_BOXER = 5;

/**
 * Upload directory for profile photos (relative to storage root)
 */
export const UPLOAD_DIR = 'profile-photos';

/**
 * Validates and returns the storage base path
 * Warns in production if external storage is not configured
 */
function getStorageBasePath(): string {
  const externalPath = storageEnvConfig.uploadPath;
  const fallbackPath = path.join(process.cwd(), 'uploads');

  if (!externalPath) {
    if (serverConfig.isProduction) {
      console.warn('WARNING: UPLOAD_PATH not set in production. Using local uploads directory.');
    }
    return fallbackPath;
  }

  // Validate the external path exists and is writable
  try {
    // Check if path exists, create if it doesn't
    if (!fs.existsSync(externalPath)) {
      console.warn(`Storage path ${externalPath} does not exist. Attempting to create...`);
      fs.mkdirSync(externalPath, { recursive: true });
    }
    // Check write access
    fs.accessSync(externalPath, fs.constants.W_OK);
    console.log(`Using external storage path: ${externalPath}`);
    return externalPath;
  } catch (error) {
    console.error(`ERROR: Cannot access storage path ${externalPath}:`, error);
    console.warn('Falling back to local uploads directory.');
    return fallbackPath;
  }
}

/**
 * Base storage path - uses UPLOAD_PATH env variable or falls back to local uploads
 */
export const STORAGE_BASE_PATH = getStorageBasePath();

/**
 * Absolute path to upload directory
 */
export const UPLOAD_PATH = path.join(STORAGE_BASE_PATH, UPLOAD_DIR);

/**
 * URL path prefix for serving uploaded files
 */
export const UPLOAD_URL_PREFIX = '/uploads/profile-photos';

// ============================================================================
// Image Processing Configuration
// ============================================================================

/**
 * Maximum dimensions for processed profile photos
 */
export const IMAGE_MAX_WIDTH = 400;
export const IMAGE_MAX_HEIGHT = 400;

/**
 * WebP quality setting (0-100)
 */
export const IMAGE_QUALITY = 80;

/**
 * Output format for processed images
 */
export const OUTPUT_FORMAT = 'webp' as const;

// ============================================================================
// Storage Configuration Object
// ============================================================================

export const storageConfig = {
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  uploadDir: UPLOAD_DIR,
  storageBasePath: STORAGE_BASE_PATH,
  uploadPath: UPLOAD_PATH,
  uploadUrlPrefix: UPLOAD_URL_PREFIX,
  image: {
    maxWidth: IMAGE_MAX_WIDTH,
    maxHeight: IMAGE_MAX_HEIGHT,
    quality: IMAGE_QUALITY,
    outputFormat: OUTPUT_FORMAT,
  },
  video: {
    maxFileSize: MAX_VIDEO_FILE_SIZE,
    allowedMimeTypes: ALLOWED_VIDEO_MIME_TYPES,
    maxVideosPerBoxer: MAX_VIDEOS_PER_BOXER,
  },
} as const;

export default storageConfig;
