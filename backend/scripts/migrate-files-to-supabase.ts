/**
 * Migrate Files to Supabase Storage Script
 * Migrates all uploaded files (photos, videos) from local storage to Supabase Storage
 *
 * Usage: ts-node backend/scripts/migrate-files-to-supabase.ts
 *
 * Prerequisites:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY must be set in .env
 * - Supabase 'uploads' bucket must exist
 * - Local files must exist in UPLOAD_PATH (or default ./backend/uploads)
 */

import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getSupabaseAdminClient } from '../src/config/supabase';
import { STORAGE_BASE_PATH } from '../src/config';

// =============================================================================
// Configuration
// =============================================================================

interface MigrationStats {
  totalFiles: number;
  migratedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  errors: Array<{ file: string; error: string }>;
}

const BUCKET_NAME = 'uploads';
const BATCH_SIZE = 10; // Upload files in batches to avoid rate limits

// =============================================================================
// Clients
// =============================================================================

const prisma = new PrismaClient();
const supabase = getSupabaseAdminClient();

// =============================================================================
// Migration Functions
// =============================================================================

/**
 * Check if file exists in local storage
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadFileToSupabase(
  localPath: string,
  storagePath: string,
  mimeType: string,
  stats: MigrationStats
): Promise<boolean> {
  try {
    // Read file from local storage with error handling
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(localPath);
    } catch (error) {
      console.error(`  ✗ Failed to read file ${localPath}:`, error);
      stats.errors.push({
        file: localPath,
        error: `Read error: ${error instanceof Error ? error.message : String(error)}`,
      });
      return false;
    }

    // Upload to Supabase
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      // If file already exists, consider it successful
      if (error.message.includes('already exists')) {
        console.log(`  ↺ Already exists: ${storagePath}`);
        return true;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`  ✗ Failed to upload ${storagePath}:`, error);
    stats.errors.push({
      file: localPath,
      error: `Upload error: ${error instanceof Error ? error.message : String(error)}`,
    });
    return false;
  }
}

/**
 * Migrate profile photos
 */
async function migrateProfilePhotos(stats: MigrationStats): Promise<void> {
  console.log('\n=== Migrating Profile Photos ===\n');

  // Get all boxers with profile photos
  const boxers = await prisma.boxer.findMany({
    where: {
      profilePhotoUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePhotoUrl: true,
    },
  });

  console.log(`Found ${boxers.length} profile photos to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < boxers.length; i += BATCH_SIZE) {
    const batch = boxers.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    await Promise.all(
      batch.map(async (boxer) => {
        if (!boxer.profilePhotoUrl) return;

        try {
          // Extract filename from URL
          // URL format: /uploads/profile-photos/UUID.webp
          const urlParts = boxer.profilePhotoUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const directory = urlParts[urlParts.length - 2]; // 'profile-photos'

          // Construct local file path
          const localPath = path.join(STORAGE_BASE_PATH, directory, filename);

          // Check if file exists locally
          if (!(await fileExists(localPath))) {
            console.log(
              `  ⚠ File not found: ${localPath} (${boxer.firstName} ${boxer.lastName})`
            );
            skipped++;
            stats.errors.push({
              file: localPath,
              error: 'File not found in local storage',
            });
            return;
          }

          // Construct Supabase storage path
          const storagePath = `${directory}/${filename}`;

          // Upload to Supabase
          const success = await uploadFileToSupabase(localPath, storagePath, 'image/webp', stats);

          if (success) {
            console.log(`  ✓ Migrated: ${filename} (${boxer.firstName} ${boxer.lastName})`);
            migrated++;
          } else {
            console.log(`  ✗ Failed: ${filename}`);
            failed++;
            stats.errors.push({
              file: localPath,
              error: 'Upload failed',
            });
          }
        } catch (error) {
          console.error(`  ✗ Error processing ${boxer.id}:`, error);
          failed++;
          stats.errors.push({
            file: boxer.profilePhotoUrl || 'unknown',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );
  }

  stats.totalFiles += boxers.length;
  stats.migratedFiles += migrated;
  stats.skippedFiles += skipped;
  stats.failedFiles += failed;

  console.log(`\n✓ Profile photos migration complete:`);
  console.log(`  - Migrated: ${migrated}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Failed: ${failed}`);
}

/**
 * Migrate video files
 */
async function migrateVideoFiles(stats: MigrationStats): Promise<void> {
  console.log('\n=== Migrating Video Files ===\n');

  // Get all videos
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      videoUrl: true,
      thumbnailUrl: true,
    },
  });

  console.log(`Found ${videos.length} videos to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);

    await Promise.all(
      batch.map(async (video) => {
        try {
          // Migrate video file
          const videoUrlParts = video.videoUrl.split('/');
          const videoFilename = videoUrlParts[videoUrlParts.length - 1];
          const videoDirectory = videoUrlParts[videoUrlParts.length - 2]; // 'videos'

          const videoLocalPath = path.join(STORAGE_BASE_PATH, videoDirectory, videoFilename);

          // Check if video file exists
          if (!(await fileExists(videoLocalPath))) {
            console.log(`  ⚠ Video file not found: ${videoLocalPath} (${video.title})`);
            skipped++;
            stats.errors.push({
              file: videoLocalPath,
              error: 'Video file not found in local storage',
            });
          } else {
            // Determine MIME type from extension
            const ext = path.extname(videoFilename).toLowerCase();
            const mimeTypeMap: Record<string, string> = {
              '.mp4': 'video/mp4',
              '.webm': 'video/webm',
              '.mov': 'video/quicktime',
              '.avi': 'video/x-msvideo',
            };
            const videoMimeType = mimeTypeMap[ext] || 'video/mp4';

            const videoStoragePath = `${videoDirectory}/${videoFilename}`;

            const videoSuccess = await uploadFileToSupabase(
              videoLocalPath,
              videoStoragePath,
              videoMimeType,
              stats
            );

            if (videoSuccess) {
              console.log(`  ✓ Migrated video: ${videoFilename} (${video.title})`);
              migrated++;
            } else {
              console.log(`  ✗ Failed video: ${videoFilename}`);
              failed++;
            }
          }

          // Migrate thumbnail if exists
          if (video.thumbnailUrl) {
            const thumbUrlParts = video.thumbnailUrl.split('/');
            const thumbFilename = thumbUrlParts[thumbUrlParts.length - 1];
            const thumbDirectory = thumbUrlParts[thumbUrlParts.length - 2];

            const thumbLocalPath = path.join(STORAGE_BASE_PATH, thumbDirectory, thumbFilename);

            if (await fileExists(thumbLocalPath)) {
              const thumbStoragePath = `${thumbDirectory}/${thumbFilename}`;
              const thumbSuccess = await uploadFileToSupabase(
                thumbLocalPath,
                thumbStoragePath,
                'image/webp',
                stats
              );

              if (thumbSuccess) {
                console.log(`  ✓ Migrated thumbnail: ${thumbFilename}`);
              } else {
                console.log(`  ✗ Failed thumbnail: ${thumbFilename}`);
              }
            }
          }
        } catch (error) {
          console.error(`  ✗ Error processing video ${video.id}:`, error);
          failed++;
          stats.errors.push({
            file: video.videoUrl,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );
  }

  stats.totalFiles += videos.length * 2; // Count both video and thumbnail
  stats.migratedFiles += migrated;
  stats.skippedFiles += skipped;
  stats.failedFiles += failed;

  console.log(`\n✓ Video files migration complete:`);
  console.log(`  - Migrated: ${migrated}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Failed: ${failed}`);
}

/**
 * Verify Supabase bucket exists
 */
async function verifyBucket(): Promise<void> {
  console.log('\n=== Verifying Supabase Bucket ===\n');

  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);

  if (error || !data) {
    console.error(`✗ Bucket '${BUCKET_NAME}' not found`);
    console.error('\nPlease create the bucket first:');
    console.error(`  1. Go to Supabase Dashboard > Storage`);
    console.error(`  2. Create bucket named '${BUCKET_NAME}'`);
    console.error(`  3. Set bucket to public`);
    console.error(`  4. Re-run this script`);
    throw new Error('Supabase bucket not found');
  }

  console.log(`✓ Bucket '${BUCKET_NAME}' exists and is ready`);
  console.log(`  - Public: ${data.public}`);
  console.log(`  - File size limit: ${data.file_size_limit ? `${data.file_size_limit / 1024 / 1024}MB` : 'unlimited'}`);
}

/**
 * Generate migration report
 */
function generateReport(stats: MigrationStats): void {
  console.log('\n=== Migration Report ===\n');

  console.log(`Total Files: ${stats.totalFiles}`);
  console.log(`✓ Migrated: ${stats.migratedFiles}`);
  console.log(`⚠ Skipped: ${stats.skippedFiles}`);
  console.log(`✗ Failed: ${stats.failedFiles}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠ Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`);
    }
  }

  console.log('\n=== Next Steps ===\n');

  if (stats.failedFiles === 0 && stats.skippedFiles === 0) {
    console.log('✓ All files migrated successfully!');
    console.log('\n1. Run verification script to confirm:');
    console.log('   ts-node backend/scripts/verify-migration.ts');
    console.log('\n2. Update .env to use Supabase storage:');
    console.log('   STORAGE_PROVIDER=supabase');
    console.log('\n3. Test the application thoroughly');
    console.log('\n4. Once verified, you can safely delete local uploads:');
    console.log('   rm -rf backend/uploads/*');
  } else {
    console.log('⚠ Migration completed with issues');
    console.log('\n1. Review the errors above');
    console.log('2. Fix any missing files or permissions issues');
    console.log('3. Re-run this migration script');
    console.log('\nDo not switch to Supabase until all files are migrated.');
  }
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  console.log('BoxerConnect File Migration to Supabase');
  console.log('=======================================');
  console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  console.log(`Local Storage: ${STORAGE_BASE_PATH}`);
  console.log(`Supabase URL: ${process.env['SUPABASE_URL'] || 'N/A'}`);

  const stats: MigrationStats = {
    totalFiles: 0,
    migratedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    errors: [],
  };

  try {
    // Verify Supabase bucket exists
    await verifyBucket();

    // Migrate profile photos
    await migrateProfilePhotos(stats);

    // Migrate videos
    await migrateVideoFiles(stats);

    // Generate report
    generateReport(stats);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
