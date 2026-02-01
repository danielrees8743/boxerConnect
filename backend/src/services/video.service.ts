// Video Service
// Handles video upload and management for boxer profiles

import { prisma, MAX_VIDEOS_PER_BOXER } from '../config';
import { storageService } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface VideoResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: Date;
}

export interface VideoListResult {
  videos: VideoResult[];
  count: number;
  maxVideos: number;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Upload a video for a boxer
 * - Stores the video in per-boxer folder
 * - Creates a database record
 * @param userId - The user ID of the boxer
 * @param file - The uploaded video file from multer
 * @returns The uploaded video details
 */
export async function uploadVideo(
  userId: string,
  file: Express.Multer.File
): Promise<VideoResult> {
  // Get the boxer's profile
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  // Check video limit
  const videoCount = await prisma.boxerVideo.count({
    where: { boxerId: boxer.id },
  });

  if (videoCount >= MAX_VIDEOS_PER_BOXER) {
    throw new Error(`Maximum of ${MAX_VIDEOS_PER_BOXER} videos allowed per boxer`);
  }

  // Upload the video to per-boxer folder
  // File will be stored as /{boxerId}/videos/{uuid}.{ext}
  const result = await storageService.uploadRaw(
    file.buffer,
    file.originalname,
    file.mimetype,
    { directory: `${boxer.id}/videos` }
  );

  // Create database record
  const video = await prisma.boxerVideo.create({
    data: {
      boxerId: boxer.id,
      url: result.url,
      filename: file.originalname,
      size: result.size,
      mimeType: result.mimeType,
    },
  });

  return {
    id: video.id,
    url: video.url,
    filename: video.filename,
    size: video.size,
    mimeType: video.mimeType,
    createdAt: video.createdAt,
  };
}

/**
 * Delete a video for a boxer
 * - Removes the file from storage
 * - Deletes the database record
 * @param userId - The user ID of the boxer
 * @param videoId - The ID of the video to delete
 */
export async function deleteVideo(
  userId: string,
  videoId: string
): Promise<void> {
  // Get the boxer's profile
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  // Find the video and verify ownership
  const video = await prisma.boxerVideo.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    throw new Error('Video not found');
  }

  if (video.boxerId !== boxer.id) {
    throw new Error('Not authorized to delete this video');
  }

  // Extract the key from the URL (e.g., "{boxerId}/videos/{uuid}.mp4")
  const urlParts = video.url.split('/uploads/');
  const videoKey = urlParts[1] || video.url.split('/').pop();

  if (videoKey) {
    try {
      await storageService.delete(videoKey);
    } catch (error) {
      // Log but continue to delete database record
      console.error('Failed to delete video file:', error);
    }
  }

  // Delete database record
  await prisma.boxerVideo.delete({
    where: { id: videoId },
  });
}

/**
 * Get all videos for the authenticated boxer
 * @param userId - The user ID of the boxer
 * @returns List of videos with count and max limit
 */
export async function getMyVideos(userId: string): Promise<VideoListResult> {
  // Get the boxer's profile
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  const videos = await prisma.boxerVideo.findMany({
    where: { boxerId: boxer.id },
    orderBy: { createdAt: 'desc' },
  });

  return {
    videos: videos.map((v) => ({
      id: v.id,
      url: v.url,
      filename: v.filename,
      size: v.size,
      mimeType: v.mimeType,
      createdAt: v.createdAt,
    })),
    count: videos.length,
    maxVideos: MAX_VIDEOS_PER_BOXER,
  };
}

/**
 * Get all videos for a boxer by boxer ID (public)
 * @param boxerId - The ID of the boxer
 * @returns List of videos
 */
export async function getBoxerVideos(boxerId: string): Promise<VideoListResult> {
  // Verify boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  const videos = await prisma.boxerVideo.findMany({
    where: { boxerId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    videos: videos.map((v) => ({
      id: v.id,
      url: v.url,
      filename: v.filename,
      size: v.size,
      mimeType: v.mimeType,
      createdAt: v.createdAt,
    })),
    count: videos.length,
    maxVideos: MAX_VIDEOS_PER_BOXER,
  };
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
