// Profile Photo Controller
// Handles HTTP requests for profile photo upload and removal

import { Response, NextFunction } from 'express';
import multer from 'multer';
import {
  uploadProfilePhoto as uploadProfilePhotoService,
  removeProfilePhoto as removeProfilePhotoService,
} from '../services/profilePhoto.service';
import { sendSuccess, sendCreated } from '../utils';
import { BadRequestError, NotFoundError } from '../middleware';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../config';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Upload profile photo
 * POST /api/v1/boxers/me/photo
 */
export async function uploadPhoto(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return next(new BadRequestError('No file uploaded. Please provide a photo.'));
    }

    // Upload and process the photo
    const result = await uploadProfilePhotoService(req.user.userId, req.file);

    sendCreated(
      res,
      {
        profilePhotoUrl: result.url,
        size: result.size,
        mimeType: result.mimeType,
      },
      'Profile photo uploaded successfully'
    );
  } catch (error) {
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new BadRequestError(
            `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          )
        );
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new BadRequestError('Unexpected field name. Use "photo" as the field name.'));
      }
      return next(new BadRequestError(`Upload error: ${error.message}`));
    }

    // Handle service errors
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message.includes('Invalid file type')) {
        return next(
          new BadRequestError(
            `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
          )
        );
      }
    }

    next(error);
  }
}

/**
 * Remove profile photo
 * DELETE /api/v1/boxers/me/photo
 */
export async function removePhoto(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await removeProfilePhotoService(req.user.userId);

    sendSuccess(res, null, 'Profile photo removed successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  uploadPhoto,
  removePhoto,
};
