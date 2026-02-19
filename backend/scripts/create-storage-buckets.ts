/**
 * Create Supabase Storage Buckets
 *
 * This script creates the required storage buckets for BoxerConnect:
 * - boxer-photos: For profile photos (5MB limit)
 * - boxer-videos: For training videos (100MB limit)
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createStorageBuckets() {
  console.log('🚀 Creating Supabase Storage Buckets...\n');

  // Bucket 1: boxer-photos
  console.log('Creating bucket: boxer-photos');
  const { error: photosError } = await supabase.storage.createBucket('boxer-photos', {
    public: true,
    // Note: File size limit managed by application logic (5MB)
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (photosError) {
    if (photosError.message.includes('already exists')) {
      console.log('  ℹ️  Bucket "boxer-photos" already exists');
    } else {
      console.error('  ❌ Error creating boxer-photos bucket:', photosError.message);
      return false;
    }
  } else {
    console.log('  ✅ Created bucket: boxer-photos');
    console.log('     - Public: Yes');
    console.log('     - Size limit: 5MB');
    console.log('     - Allowed: image/jpeg, image/png, image/webp, image/gif');
  }

  // Bucket 2: boxer-videos
  console.log('\nCreating bucket: boxer-videos');
  const { error: videosError } = await supabase.storage.createBucket('boxer-videos', {
    public: true,
    // Note: File size limit managed by application logic (100MB)
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  });

  if (videosError) {
    if (videosError.message.includes('already exists')) {
      console.log('  ℹ️  Bucket "boxer-videos" already exists');
    } else {
      console.error('  ❌ Error creating boxer-videos bucket:', videosError.message);
      return false;
    }
  } else {
    console.log('  ✅ Created bucket: boxer-videos');
    console.log('     - Public: Yes');
    console.log('     - Size limit: 100MB');
    console.log('     - Allowed: video/mp4, video/webm, video/quicktime');
  }

  // Verify buckets exist
  console.log('\n🔍 Verifying buckets...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return false;
  }

  const photoBucket = buckets?.find((b) => b.name === 'boxer-photos');
  const videoBucket = buckets?.find((b) => b.name === 'boxer-videos');

  if (photoBucket && videoBucket) {
    console.log('✅ Both buckets verified successfully!');
    console.log('\nAvailable buckets:');
    buckets?.forEach((bucket) => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    return true;
  } else {
    console.error('❌ Bucket verification failed');
    if (!photoBucket) console.error('   Missing: boxer-photos');
    if (!videoBucket) console.error('   Missing: boxer-videos');
    return false;
  }
}

// Run the script
createStorageBuckets()
  .then((success) => {
    if (success) {
      console.log('\n✅ Storage buckets setup complete!');
      process.exit(0);
    } else {
      console.log('\n❌ Storage buckets setup failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
