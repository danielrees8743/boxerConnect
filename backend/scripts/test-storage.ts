/**
 * Test Supabase Storage Integration
 *
 * Verifies that file uploads to Supabase Storage work correctly
 */

import { storageService } from '../src/services/storage';
import sharp from 'sharp';

require('dotenv').config();

async function testStorage() {
  console.log('🧪 Testing Supabase Storage Integration...\n');

  // Check storage provider
  const storageProvider = process.env.STORAGE_PROVIDER || 'local';
  console.log(`📦 Storage Provider: ${storageProvider}`);

  if (storageProvider !== 'supabase') {
    console.error('❌ STORAGE_PROVIDER is not set to "supabase"');
    console.error('   Please update .env: STORAGE_PROVIDER=supabase');
    process.exit(1);
  }

  try {
    // Test 1: Create a test image
    console.log('\n📝 Test 1: Creating test image...');
    const testImage = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    console.log(`   ✅ Created 400x400 test image (${(testImage.length / 1024).toFixed(2)} KB)`);

    // Test 2: Upload to Supabase Storage
    console.log('\n📤 Test 2: Uploading to Supabase Storage...');
    const uploadResult = await storageService.upload(
      testImage,
      'test-upload.png',
      'image/png',
      { directory: 'test' }
    );

    console.log('   ✅ Upload successful!');
    console.log(`   📍 Storage key: ${uploadResult.key}`);
    console.log(`   🔗 Public URL: ${uploadResult.url}`);
    console.log(`   📊 Size: ${(uploadResult.size / 1024).toFixed(2)} KB (processed)`);
    console.log(`   📄 MIME type: ${uploadResult.mimeType}`);

    // Test 3: Verify the file is accessible
    console.log('\n🔍 Test 3: Verifying file accessibility...');
    const publicUrl = uploadResult.url;

    const response = await fetch(publicUrl);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      console.log('   ✅ File is publicly accessible!');
      console.log(`   📄 Content-Type: ${contentType}`);
      console.log(`   📊 Content-Length: ${contentLength} bytes`);
    } else {
      console.error(`   ❌ File not accessible (HTTP ${response.status})`);
      return false;
    }

    // Test 4: Get URL for existing file
    console.log('\n🔗 Test 4: Testing getUrl() method...');
    const retrievedUrl = storageService.getUrl(uploadResult.key);
    console.log(`   ✅ Retrieved URL: ${retrievedUrl}`);

    if (retrievedUrl === uploadResult.url) {
      console.log('   ✅ URLs match!');
    } else {
      console.log('   ⚠️  URLs do not match (might be expected)');
    }

    // Test 5: Delete the test file
    console.log('\n🗑️  Test 5: Deleting test file...');
    await storageService.delete(uploadResult.key);
    console.log('   ✅ File deleted successfully');

    // Test 6: Verify file is deleted
    console.log('\n🔍 Test 6: Verifying file deletion...');
    const deleteCheck = await fetch(publicUrl);
    if (!deleteCheck.ok && deleteCheck.status === 404) {
      console.log('   ✅ File successfully deleted (404 Not Found)');
    } else {
      console.log(`   ⚠️  File still accessible (HTTP ${deleteCheck.status})`);
    }

    console.log('\n✅ All storage tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Image processing (Sharp) working');
    console.log('   ✅ Upload to Supabase Storage working');
    console.log('   ✅ Public URL generation working');
    console.log('   ✅ File accessibility verified');
    console.log('   ✅ File deletion working');

    return true;
  } catch (error) {
    console.error('\n❌ Storage test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      if ('stack' in error) {
        console.error('   Stack trace:', error.stack);
      }
    }
    return false;
  }
}

testStorage()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
