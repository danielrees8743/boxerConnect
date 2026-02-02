/**
 * Supabase Migration Verification Script
 * Verifies data integrity and completeness after migrating from local PostgreSQL to Supabase
 *
 * Usage: ts-node backend/scripts/verify-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Configuration
// =============================================================================

interface MigrationStats {
  tableName: string;
  localCount: number;
  supabaseCount: number;
  match: boolean;
  sampleRecordMatch?: boolean;
}

// =============================================================================
// Clients
// =============================================================================

// Local PostgreSQL client
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env['DATABASE_URL'],
    },
  },
});

// Supabase PostgreSQL client
const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env['SUPABASE_DATABASE_URL'],
    },
  },
});

// Supabase storage client
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Verification Functions
// =============================================================================

/**
 * Verify table row counts match between local and Supabase
 */
async function verifyTableCounts(): Promise<MigrationStats[]> {
  console.log('\n=== Verifying Table Counts ===\n');

  const stats: MigrationStats[] = [];

  // User table
  const localUserCount = await localPrisma.user.count();
  const supabaseUserCount = await supabasePrisma.user.count();
  stats.push({
    tableName: 'User',
    localCount: localUserCount,
    supabaseCount: supabaseUserCount,
    match: localUserCount === supabaseUserCount,
  });

  // Boxer table
  const localBoxerCount = await localPrisma.boxer.count();
  const supabaseBoxerCount = await supabasePrisma.boxer.count();
  stats.push({
    tableName: 'Boxer',
    localCount: localBoxerCount,
    supabaseCount: supabaseBoxerCount,
    match: localBoxerCount === supabaseBoxerCount,
  });

  // Club table
  const localClubCount = await localPrisma.club.count();
  const supabaseClubCount = await supabasePrisma.club.count();
  stats.push({
    tableName: 'Club',
    localCount: localClubCount,
    supabaseCount: supabaseClubCount,
    match: localClubCount === supabaseClubCount,
  });

  // MatchRequest table
  const localMatchRequestCount = await localPrisma.matchRequest.count();
  const supabaseMatchRequestCount = await supabasePrisma.matchRequest.count();
  stats.push({
    tableName: 'MatchRequest',
    localCount: localMatchRequestCount,
    supabaseCount: supabaseMatchRequestCount,
    match: localMatchRequestCount === supabaseMatchRequestCount,
  });

  // FightHistory table
  const localFightHistoryCount = await localPrisma.fightHistory.count();
  const supabaseFightHistoryCount = await supabasePrisma.fightHistory.count();
  stats.push({
    tableName: 'FightHistory',
    localCount: localFightHistoryCount,
    supabaseCount: supabaseFightHistoryCount,
    match: localFightHistoryCount === supabaseFightHistoryCount,
  });

  // Video table
  const localVideoCount = await localPrisma.video.count();
  const supabaseVideoCount = await supabasePrisma.video.count();
  stats.push({
    tableName: 'Video',
    localCount: localVideoCount,
    supabaseCount: supabaseVideoCount,
    match: localVideoCount === supabaseVideoCount,
  });

  // Print results
  stats.forEach((stat) => {
    const status = stat.match ? '✓' : '✗';
    const color = stat.match ? '\x1b[32m' : '\x1b[31m'; // Green or Red
    const reset = '\x1b[0m';

    console.log(
      `${color}${status}${reset} ${stat.tableName.padEnd(20)} Local: ${stat.localCount
        .toString()
        .padEnd(6)} Supabase: ${stat.supabaseCount.toString().padEnd(6)} ${
        stat.match ? 'MATCH' : 'MISMATCH'
      }`
    );
  });

  return stats;
}

/**
 * Verify sample records match between local and Supabase
 */
async function verifySampleRecords(): Promise<boolean> {
  console.log('\n=== Verifying Sample Records ===\n');

  let allMatch = true;

  // Get a sample user from local
  const localUser = await localPrisma.user.findFirst({
    where: {
      boxer: {
        isNot: null,
      },
    },
    include: {
      boxer: true,
    },
  });

  if (localUser) {
    // Find same user in Supabase
    const supabaseUser = await supabasePrisma.user.findUnique({
      where: { id: localUser.id },
      include: {
        boxer: true,
      },
    });

    if (!supabaseUser) {
      console.log(`✗ User ${localUser.id} not found in Supabase`);
      allMatch = false;
    } else {
      // Compare key fields
      const emailMatch = localUser.email === supabaseUser.email;
      const roleMatch = localUser.role === supabaseUser.role;
      const boxerMatch =
        localUser.boxer?.firstName === supabaseUser.boxer?.firstName &&
        localUser.boxer?.lastName === supabaseUser.boxer?.lastName;

      if (emailMatch && roleMatch && boxerMatch) {
        console.log(`✓ Sample user ${localUser.email} matches`);
      } else {
        console.log(`✗ Sample user ${localUser.email} has differences`);
        if (!emailMatch) console.log(`  - Email mismatch`);
        if (!roleMatch) console.log(`  - Role mismatch`);
        if (!boxerMatch) console.log(`  - Boxer data mismatch`);
        allMatch = false;
      }
    }
  }

  return allMatch;
}

/**
 * Verify uploaded files exist in Supabase Storage
 */
async function verifyStorageFiles(): Promise<{
  totalFiles: number;
  migratedFiles: number;
  missingFiles: string[];
}> {
  console.log('\n=== Verifying Storage Files ===\n');

  const result = {
    totalFiles: 0,
    migratedFiles: 0,
    missingFiles: [] as string[],
  };

  // Get all boxers with profile photos
  const boxersWithPhotos = await localPrisma.boxer.findMany({
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

  result.totalFiles = boxersWithPhotos.length;

  console.log(`Found ${result.totalFiles} profile photos to verify\n`);

  // Check each file in Supabase Storage
  for (const boxer of boxersWithPhotos) {
    if (!boxer.profilePhotoUrl) continue;

    // Extract filename from URL
    // URL format: /uploads/profile-photos/UUID.webp or similar
    const urlParts = boxer.profilePhotoUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const storagePath = `profile-photos/${filename}`;

    // Check if file exists in Supabase Storage
    const { data, error } = await supabase.storage.from('uploads').list('profile-photos', {
      search: filename,
    });

    if (error) {
      console.log(`✗ Error checking ${storagePath}: ${error.message}`);
      result.missingFiles.push(storagePath);
    } else if (!data || data.length === 0) {
      console.log(
        `✗ Missing: ${storagePath} (${boxer.firstName} ${boxer.lastName})`
      );
      result.missingFiles.push(storagePath);
    } else {
      result.migratedFiles++;
      // Only log every 10th success to avoid spam
      if (result.migratedFiles % 10 === 0) {
        console.log(`✓ Verified ${result.migratedFiles}/${result.totalFiles} files...`);
      }
    }
  }

  console.log(
    `\n✓ Storage verification complete: ${result.migratedFiles}/${result.totalFiles} files found`
  );

  if (result.missingFiles.length > 0) {
    console.log(`\n⚠ Missing files (${result.missingFiles.length}):`);
    result.missingFiles.slice(0, 10).forEach((file) => console.log(`  - ${file}`));
    if (result.missingFiles.length > 10) {
      console.log(`  ... and ${result.missingFiles.length - 10} more`);
    }
  }

  return result;
}

/**
 * Verify video files exist in Supabase Storage
 */
async function verifyVideoFiles(): Promise<{
  totalVideos: number;
  migratedVideos: number;
  missingVideos: string[];
}> {
  console.log('\n=== Verifying Video Files ===\n');

  const result = {
    totalVideos: 0,
    migratedVideos: 0,
    missingVideos: [] as string[],
  };

  // Get all videos
  const videos = await localPrisma.video.findMany({
    select: {
      id: true,
      title: true,
      videoUrl: true,
      thumbnailUrl: true,
    },
  });

  result.totalVideos = videos.length;

  console.log(`Found ${result.totalVideos} videos to verify\n`);

  // Check each video file in Supabase Storage
  for (const video of videos) {
    // Extract filename from video URL
    const videoUrlParts = video.videoUrl.split('/');
    const videoFilename = videoUrlParts[videoUrlParts.length - 1];
    const videoStoragePath = `videos/${videoFilename}`;

    // Check video file
    const { data: videoData, error: videoError } = await supabase.storage
      .from('uploads')
      .list('videos', {
        search: videoFilename,
      });

    if (videoError || !videoData || videoData.length === 0) {
      console.log(`✗ Missing video: ${videoStoragePath} (${video.title})`);
      result.missingVideos.push(videoStoragePath);
    } else {
      result.migratedVideos++;
    }

    // Check thumbnail if exists
    if (video.thumbnailUrl) {
      const thumbnailUrlParts = video.thumbnailUrl.split('/');
      const thumbnailFilename = thumbnailUrlParts[thumbnailUrlParts.length - 1];
      const thumbnailStoragePath = `videos/${thumbnailFilename}`;

      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('uploads')
        .list('videos', {
          search: thumbnailFilename,
        });

      if (thumbError || !thumbData || thumbData.length === 0) {
        console.log(`✗ Missing thumbnail: ${thumbnailStoragePath}`);
        result.missingVideos.push(thumbnailStoragePath);
      }
    }
  }

  console.log(
    `\n✓ Video verification complete: ${result.migratedVideos}/${result.totalVideos} videos found`
  );

  if (result.missingVideos.length > 0) {
    console.log(`\n⚠ Missing video files (${result.missingVideos.length}):`);
    result.missingVideos.forEach((file) => console.log(`  - ${file}`));
  }

  return result;
}

/**
 * Generate migration report
 */
function generateReport(
  tableStats: MigrationStats[],
  sampleRecordsMatch: boolean,
  storageStats: {
    totalFiles: number;
    migratedFiles: number;
    missingFiles: string[];
  },
  videoStats: {
    totalVideos: number;
    migratedVideos: number;
    missingVideos: string[];
  }
): void {
  console.log('\n=== Migration Verification Report ===\n');

  // Table counts
  const allTablesMatch = tableStats.every((stat) => stat.match);
  const tableStatus = allTablesMatch ? '✓ PASS' : '✗ FAIL';
  console.log(`Table Counts: ${tableStatus}`);

  if (!allTablesMatch) {
    console.log('  Issues:');
    tableStats
      .filter((stat) => !stat.match)
      .forEach((stat) => {
        console.log(
          `    - ${stat.tableName}: Local=${stat.localCount}, Supabase=${stat.supabaseCount}`
        );
      });
  }

  // Sample records
  const sampleStatus = sampleRecordsMatch ? '✓ PASS' : '✗ FAIL';
  console.log(`Sample Records: ${sampleStatus}`);

  // Storage files
  const allFilesPresent = storageStats.missingFiles.length === 0;
  const storageStatus = allFilesPresent ? '✓ PASS' : '⚠ WARNING';
  console.log(
    `Storage Files: ${storageStatus} (${storageStats.migratedFiles}/${storageStats.totalFiles})`
  );

  // Video files
  const allVideosPresent = videoStats.missingVideos.length === 0;
  const videoStatus = allVideosPresent ? '✓ PASS' : '⚠ WARNING';
  console.log(
    `Video Files: ${videoStatus} (${videoStats.migratedVideos}/${videoStats.totalVideos})`
  );

  // Overall result
  console.log('\n=== Overall Status ===\n');

  const overallPass =
    allTablesMatch &&
    sampleRecordsMatch &&
    allFilesPresent &&
    allVideosPresent;

  if (overallPass) {
    console.log('✓ MIGRATION SUCCESSFUL - All checks passed');
    console.log('\nYou can safely switch to Supabase in production.');
  } else {
    console.log('⚠ MIGRATION INCOMPLETE - Review issues above');
    console.log('\nDo not switch to Supabase until all issues are resolved.');

    if (!allTablesMatch || !sampleRecordsMatch) {
      console.log('\nCRITICAL: Database migration has issues. Re-run migration.');
    }

    if (!allFilesPresent || !allVideosPresent) {
      console.log('\nWARNING: Some files are missing. Re-run file migration.');
    }
  }
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  console.log('BoxerConnect Migration Verification');
  console.log('===================================');
  console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  console.log(`Local DB: ${process.env['DATABASE_URL']?.split('@')[1] || 'N/A'}`);
  console.log(`Supabase: ${supabaseUrl || 'N/A'}`);

  try {
    // Test database connections
    console.log('\n=== Testing Database Connections ===\n');

    try {
      await localPrisma.$queryRaw`SELECT 1`;
      console.log('✓ Local PostgreSQL connected');
    } catch (error) {
      console.error('✗ Local PostgreSQL connection failed:', error);
      throw error;
    }

    try {
      await supabasePrisma.$queryRaw`SELECT 1`;
      console.log('✓ Supabase PostgreSQL connected');
    } catch (error) {
      console.error('✗ Supabase PostgreSQL connection failed:', error);
      throw error;
    }

    // Run verification checks
    const tableStats = await verifyTableCounts();
    const sampleRecordsMatch = await verifySampleRecords();
    const storageStats = await verifyStorageFiles();
    const videoStats = await verifyVideoFiles();

    // Generate report
    generateReport(tableStats, sampleRecordsMatch, storageStats, videoStats);
  } catch (error) {
    console.error('\nERROR: Migration verification failed');
    console.error(error);
    process.exit(1);
  } finally {
    await localPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

// Run the script
main();
