// Video Controller
// Handles HTTP requests for video upload and management

import { Response, NextFunction } from 'express';
import multer from 'multer';
import {
  uploadVideo as uploadVideoService,
  deleteVideo as deleteVideoService,
  getMyVideos as getMyVideosService,
  getBoxerVideos as getBoxerVideosService,
} from '../services/video.service';
import { sendSuccess, sendCreated } from '../utils';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware';
import { MAX_VIDEO_FILE_SIZE, ALLOWED_VIDEO_MIME_TYPES } from '../config';
import type { AuthenticatedUserRequest } from '../types';

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Upload video
 * POST /api/v1/boxers/me/videos
 */
export async function uploadVideo(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return next(new BadRequestError('No file uploaded. Please provide a video.'));
    }

    // Upload the video
    const result = await uploadVideoService(req.user.userId, req.file);

    sendCreated(
      res,
      {
        video: result,
      },
      'Video uploaded successfully'
    );
  } catch (error) {
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new BadRequestError(
            `File too large. Maximum size is ${MAX_VIDEO_FILE_SIZE / (1024 * 1024)}MB`
          )
        );
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new BadRequestError('Unexpected field name. Use "video" as the field name.'));
      }
      return next(new BadRequestError(`Upload error: ${error.message}`));
    }

    // Handle service errors
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message.includes('Maximum of')) {
        return next(new BadRequestError(error.message));
      }
      if (error.message.includes('Invalid file type')) {
        return next(
          new BadRequestError(
            `Invalid file type. Allowed types: ${ALLOWED_VIDEO_MIME_TYPES.join(', ')}`
          )
        );
      }
    }

    next(error);
  }
}

/**
 * Delete video
 * DELETE /api/v1/boxers/me/videos/:id
 */
export async function deleteVideo(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new BadRequestError('Video ID is required'));
    }

    await deleteVideoService(req.user.userId, id);

    sendSuccess(res, null, 'Video deleted successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Video not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'Not authorized to delete this video') {
        return next(new ForbiddenError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get my videos
 * GET /api/v1/boxers/me/videos
 */
export async function getMyVideos(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getMyVideosService(req.user.userId);

    sendSuccess(res, result, 'Videos retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer profile not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Get boxer videos (public)
 * GET /api/v1/boxers/:id/videos
 */
export async function getBoxerVideos(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new BadRequestError('Boxer ID is required'));
    }

    const result = await getBoxerVideosService(id);

    sendSuccess(res, result, 'Videos retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found') {
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
  uploadVideo,
  deleteVideo,
  getMyVideos,
  getBoxerVideos,
};
