// Storage Configuration
// Defines file upload constraints and paths for profile photos

import path from 'path';

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

/**
 * Upload directory for profile photos (relative to backend root)
 */
export const UPLOAD_DIR = 'uploads/profile-photos';

/**
 * Absolute path to upload directory
 */
export const UPLOAD_PATH = path.join(process.cwd(), UPLOAD_DIR);

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
  uploadPath: UPLOAD_PATH,
  uploadUrlPrefix: UPLOAD_URL_PREFIX,
  image: {
    maxWidth: IMAGE_MAX_WIDTH,
    maxHeight: IMAGE_MAX_HEIGHT,
    quality: IMAGE_QUALITY,
    outputFormat: OUTPUT_FORMAT,
  },
} as const;

export default storageConfig;
