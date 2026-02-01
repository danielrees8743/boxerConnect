// Upload Middleware
// Handles file upload configuration using multer

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, AllowedMimeType } from '../config';
import { BadRequestError } from './errorHandler';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a MIME type is allowed for profile photo uploads
 */
function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

// ============================================================================
// Multer Configuration
// ============================================================================

/**
 * File filter function for multer
 * Validates that uploaded files are of allowed MIME types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  if (isAllowedMimeType(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestError(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    );
  }
};

/**
 * Multer configuration for profile photo uploads
 * Uses memory storage to allow processing with sharp before saving
 */
const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

// ============================================================================
// Export Middleware
// ============================================================================

/**
 * Middleware for handling single profile photo upload
 * File will be available at req.file
 */
export const uploadProfilePhoto = multerConfig.single('photo');

/**
 * Export multer error types for error handling
 */
export const MulterError = multer.MulterError;

export default {
  uploadProfilePhoto,
  MulterError,
};
