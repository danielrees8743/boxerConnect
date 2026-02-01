// Profile Photo Service
// Handles profile photo upload and removal business logic

import { prisma } from '../config';
import { storageService } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface ProfilePhotoResult {
  url: string;
  size: number;
  mimeType: string;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Upload a profile photo for a boxer
 * - Processes and stores the image in per-boxer folder
 * - Updates the boxer's profilePhotoUrl in the database
 * - Removes the old photo if one exists
 * @param userId - The user ID of the boxer
 * @param file - The uploaded file from multer
 * @returns The URL of the uploaded photo
 */
export async function uploadProfilePhoto(
  userId: string,
  file: Express.Multer.File
): Promise<ProfilePhotoResult> {
  // Get the boxer's current profile
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true, profilePhotoUrl: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  // If there's an existing photo, delete it
  if (boxer.profilePhotoUrl) {
    try {
      // Extract the key from the URL (e.g., "{boxerId}/photo.webp")
      const urlParts = boxer.profilePhotoUrl.split('/uploads/');
      const existingKey = urlParts[1] || boxer.profilePhotoUrl.split('/').pop();
      if (existingKey) {
        await storageService.delete(existingKey);
      }
    } catch (error) {
      // Log but don't fail if old photo deletion fails
      console.error('Failed to delete old profile photo:', error);
    }
  }

  // Upload the new photo to per-boxer folder
  // File will be stored as /{boxerId}/photo.webp
  const result = await storageService.upload(
    file.buffer,
    'photo', // Use fixed name for profile photo
    file.mimetype,
    { directory: boxer.id }
  );

  // Update the boxer's profile with the new photo URL
  await prisma.boxer.update({
    where: { id: boxer.id },
    data: { profilePhotoUrl: result.url },
  });

  return {
    url: result.url,
    size: result.size,
    mimeType: result.mimeType,
  };
}

/**
 * Remove a boxer's profile photo
 * - Deletes the image from storage
 * - Sets profilePhotoUrl to null in the database
 * @param userId - The user ID of the boxer
 */
export async function removeProfilePhoto(userId: string): Promise<void> {
  // Get the boxer's current profile
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true, profilePhotoUrl: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  if (!boxer.profilePhotoUrl) {
    // No photo to remove
    return;
  }

  // Extract the key from the URL (e.g., "{boxerId}/photo.webp")
  const urlParts = boxer.profilePhotoUrl.split('/uploads/');
  const photoKey = urlParts[1] || boxer.profilePhotoUrl.split('/').pop();
  if (photoKey) {
    try {
      await storageService.delete(photoKey);
    } catch (error) {
      // Log but continue to update database
      console.error('Failed to delete profile photo file:', error);
    }
  }

  // Update the boxer's profile to remove the photo URL
  await prisma.boxer.update({
    where: { id: boxer.id },
    data: { profilePhotoUrl: null },
  });
}

/**
 * Get the profile photo URL for a boxer
 * @param userId - The user ID of the boxer
 * @returns The photo URL or null if none exists
 */
export async function getProfilePhotoUrl(userId: string): Promise<string | null> {
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { profilePhotoUrl: true },
  });

  return boxer?.profilePhotoUrl ?? null;
}

// ============================================================================
// Export
// ============================================================================

export default {
  uploadProfilePhoto,
  removeProfilePhoto,
  getProfilePhotoUrl,
};
