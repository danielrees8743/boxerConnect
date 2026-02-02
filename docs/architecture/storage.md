# Storage Architecture

Documentation for the file storage system used for profile photos and other uploaded assets.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [StorageService Interface](#storageservice-interface)
  - [LocalStorageService Implementation](#localstorageservice-implementation)
- [Configuration](#configuration)
- [Image Processing](#image-processing)
- [Security Considerations](#security-considerations)
- [Adding Cloud Storage](#adding-cloud-storage)
  - [S3 Implementation Example](#s3-implementation-example)
  - [Cloudinary Implementation Example](#cloudinary-implementation-example)
- [Testing](#testing)

---

## Overview

BoxerConnect uses a storage abstraction layer to handle file uploads. This architecture allows the application to switch between storage providers (local filesystem, Supabase Storage, AWS S3, Cloudinary, etc.) without modifying business logic.

**Current Implementation:** Supabase Storage with sharp-based image processing.

**Supported Providers:**

- **Supabase Storage** (default) - Cloud storage with CDN
- **Local filesystem** - Development and testing
- **AWS S3** (implementation available) - Enterprise cloud storage

**Key Features:**

- Provider-agnostic interface for storage operations
- Automatic image optimization (resize, format conversion, compression)
- Security-first design (UUID filenames, metadata stripping, path traversal prevention)
- Easy extensibility for cloud storage providers
- CDN delivery for fast global access (Supabase)

---

## Architecture

### StorageService Interface

The storage system is built around a TypeScript interface that defines the contract for all storage implementations.

**Location:** `backend/src/services/storage/storage.interface.ts`

```typescript
interface StorageService {
  /**
   * Upload a file to storage
   * @param buffer - File contents as a buffer
   * @param filename - Original filename (used for extension if not preserving)
   * @param mimeType - MIME type of the file
   * @param options - Optional upload configuration
   * @returns Promise resolving to storage result with file details
   */
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult>;

  /**
   * Delete a file from storage
   * @param key - The file key/identifier returned from upload
   */
  delete(key: string): Promise<void>;

  /**
   * Get the URL for a stored file
   * @param key - The file key/identifier
   */
  getUrl(key: string): string;
}
```

#### StorageResult

```typescript
interface StorageResult {
  key: string;      // Unique identifier for the stored file
  url: string;      // URL to access the stored file
  size: number;     // Size of the stored file in bytes
  mimeType: string; // MIME type of the stored file
}
```

#### UploadOptions

```typescript
interface UploadOptions {
  directory?: string;        // Optional subdirectory
  preserveFilename?: boolean; // Keep original filename (default: false)
}
```

### SupabaseStorageService Implementation

The default implementation stores files in Supabase Storage with global CDN delivery.

**Location:** `backend/src/services/storage/supabaseStorage.service.ts`

**Key Behaviors:**

1. **Cloud Storage**: Files stored in Supabase Storage buckets
2. **Image Processing**: Uses sharp to process all uploaded images
3. **UUID Filenames**: Generates UUID-based filenames to prevent conflicts and attacks
4. **Public CDN URLs**: Files accessible via Supabase CDN
5. **Bucket Management**: Separate buckets for different file types

**Buckets**:
- `boxer-photos` - Profile photos (5MB limit, images only)
- `boxer-videos` - Training videos (100MB limit, video + thumbnails)

### LocalStorageService Implementation

An alternative implementation for local filesystem storage (development/testing).

**Location:** `backend/src/services/storage/localStorage.service.ts`

**Key Behaviors:**

1. **Directory Management**: Automatically creates upload directories if they do not exist
2. **Image Processing**: Uses sharp to process all uploaded images
3. **UUID Filenames**: Generates UUID-based filenames to prevent conflicts and attacks
4. **Path Validation**: Validates file paths to prevent directory traversal

```typescript
// Upload flow
async upload(buffer, filename, mimeType, options?) {
  // 1. Ensure upload directory exists
  await this.ensureDirectory(uploadDir);

  // 2. Generate UUID filename
  const outputFilename = `${uuidv4()}.webp`;

  // 3. Process image with sharp
  const processedBuffer = await this.processImage(buffer);

  // 4. Write to disk
  await fs.writeFile(outputPath, processedBuffer);

  // 5. Return result with URL
  return { key, url, size, mimeType };
}
```

---

## Configuration

Storage configuration is centralized in `backend/src/config/storage.ts`.

### File Upload Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `MAX_FILE_SIZE` | 5 MB | Maximum allowed file size |
| `ALLOWED_MIME_TYPES` | jpeg, png, webp, gif | Accepted image formats |
| `UPLOAD_DIR` | `uploads/profile-photos` | Storage directory (relative to backend root) |
| `UPLOAD_URL_PREFIX` | `/uploads/profile-photos` | URL path for serving files |

### Image Processing Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `IMAGE_MAX_WIDTH` | 400 | Maximum output width in pixels |
| `IMAGE_MAX_HEIGHT` | 400 | Maximum output height in pixels |
| `IMAGE_QUALITY` | 80 | WebP quality (0-100) |
| `OUTPUT_FORMAT` | webp | Output format for all images |

### Example Configuration

```typescript
export const storageConfig = {
  maxFileSize: 5 * 1024 * 1024,  // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  uploadDir: 'uploads/profile-photos',
  uploadPath: path.join(process.cwd(), 'uploads/profile-photos'),
  uploadUrlPrefix: '/uploads/profile-photos',
  image: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
    outputFormat: 'webp',
  },
};
```

---

## Image Processing

All uploaded images are processed using [sharp](https://sharp.pixelplumbing.com/), a high-performance image processing library.

### Processing Pipeline

```typescript
private async processImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()                    // Auto-rotate based on EXIF orientation
    .resize(400, 400, {
      fit: 'inside',             // Fit within dimensions
      withoutEnlargement: true,  // Don't upscale small images
    })
    .webp({ quality: 80 })       // Convert to WebP
    .toBuffer();                 // Strip all metadata
}
```

### Why WebP?

- **Smaller file sizes**: 25-34% smaller than JPEG at equivalent quality
- **Modern browser support**: Supported by all major browsers
- **Alpha channel support**: Preserves transparency from PNG/GIF sources
- **Better compression**: Superior compression algorithm

---

## Security Considerations

### UUID Filenames

Original filenames are never used. Files are stored with UUID-generated names:

```
550e8400-e29b-41d4-a716-446655440000.webp
```

**Benefits:**

- Prevents filename-based attacks (XSS via filename, null byte injection)
- Eliminates filename collisions
- Obscures original file information

### EXIF Metadata Stripping

All metadata is removed from uploaded images:

- **EXIF**: Camera info, GPS coordinates, timestamps
- **IPTC**: Copyright, captions, keywords
- **XMP**: Extended metadata

This protects user privacy by preventing inadvertent location disclosure.

### Path Traversal Prevention

The delete operation validates file keys to prevent directory traversal attacks:

```typescript
async delete(key: string): Promise<void> {
  // Reject keys with ".." or absolute paths
  if (key.includes('..') || path.isAbsolute(key)) {
    throw new Error('Invalid file key');
  }

  const filePath = path.join(this.basePath, key);
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(this.basePath);

  // Ensure resolved path is within base directory
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid file path');
  }

  await fs.unlink(filePath);
}
```

### File Type Validation

MIME types are validated at the middleware layer before processing:

```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
```

---

## Adding Cloud Storage

The storage abstraction makes it straightforward to add cloud storage providers.

### Storage Service Factory

The factory pattern in `backend/src/services/storage/index.ts` manages provider selection:

```typescript
export type StorageProvider = 'local' | 'supabase' | 's3';

export function getStorageService(provider: StorageProvider = 'supabase'): StorageService {
  switch (provider) {
    case 'local':
      return localStorageService;
    case 'supabase':
      return supabaseStorageService;
    case 's3':
      return s3StorageService;      // Available implementation
    default:
      return supabaseStorageService;
  }
}
```

**Configuration**: Set the `STORAGE_PROVIDER` environment variable to switch providers:

```env
STORAGE_PROVIDER=supabase  # Default
# STORAGE_PROVIDER=local   # For local development
# STORAGE_PROVIDER=s3      # For AWS S3
```

### S3 Implementation Example

To add AWS S3 support, create a new implementation:

**File:** `backend/src/services/storage/s3Storage.service.ts`

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { StorageService, StorageResult, UploadOptions } from './storage.interface';

class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'boxerconnect-uploads';
    this.client = new S3Client({ region: this.region });
  }

  private async processImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }

  async upload(
    buffer: Buffer,
    _filename: string,
    _mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    const uuid = uuidv4();
    const key = options?.directory
      ? `${options.directory}/${uuid}.webp`
      : `profile-photos/${uuid}.webp`;

    const processedBuffer = await this.processImage(buffer);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: processedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'max-age=31536000', // 1 year cache
      })
    );

    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      size: processedBuffer.length,
      mimeType: 'image/webp',
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

export const s3StorageService = new S3StorageService();
```

**Required environment variables:**

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=boxerconnect-uploads
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Cloudinary Implementation Example

For Cloudinary integration:

**File:** `backend/src/services/storage/cloudinaryStorage.service.ts`

```typescript
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import type { StorageService, StorageResult, UploadOptions } from './storage.interface';

class CloudinaryStorageService implements StorageService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    buffer: Buffer,
    _filename: string,
    _mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    const uuid = uuidv4();
    const folder = options?.directory || 'profile-photos';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uuid,
          folder,
          format: 'webp',
          transformation: [
            { width: 400, height: 400, crop: 'limit' },
            { quality: 80 },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve({
            key: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            mimeType: 'image/webp',
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key);
  }

  getUrl(key: string): string {
    return cloudinary.url(key, { format: 'webp', secure: true });
  }
}

export const cloudinaryStorageService = new CloudinaryStorageService();
```

**Required environment variables:**

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Supabase Storage Implementation

BoxerConnect includes a production-ready Supabase Storage implementation.

**File:** `backend/src/services/storage/supabaseStorage.service.ts`

**Features:**
- Public CDN URLs for fast global delivery
- Automatic bucket creation and management
- Sharp-based image processing before upload
- Support for both processed images and raw files
- Cache control headers (1 hour cache)
- Comprehensive error handling

**Example usage:**

```typescript
import { supabaseStorageService } from './services/storage/supabaseStorage.service';

// Upload and process a profile photo
const result = await supabaseStorageService.upload(
  imageBuffer,
  'profile.jpg',
  'image/jpeg',
  { directory: 'profile-photos' }
);

// Returns:
// {
//   key: 'profile-photos/uuid.webp',
//   url: 'https://project.supabase.co/storage/v1/object/public/boxer-photos/profile-photos/uuid.webp',
//   size: 12345,
//   mimeType: 'image/webp'
// }

// Delete a file
await supabaseStorageService.delete('profile-photos/uuid.webp');

// Get public URL
const url = supabaseStorageService.getUrl('profile-photos/uuid.webp');
```

**Configuration:**

Required environment variables:
```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

See [Supabase Setup Guide](../../docs/SUPABASE_SETUP.md) for detailed configuration instructions.

### Switching Providers

To switch storage providers:

1. Set environment variable:

   ```env
   STORAGE_PROVIDER=supabase  # or 'local' or 's3'
   ```

2. Configure provider-specific environment variables
3. Restart the backend server

The storage service is automatically selected based on the `STORAGE_PROVIDER` variable.

---

## Testing

### Unit Testing Storage Services

Example test structure for storage services:

```typescript
describe('LocalStorageService', () => {
  describe('upload', () => {
    it('should process and store an image', async () => {
      const buffer = await fs.readFile('test-fixtures/sample.jpg');
      const result = await storageService.upload(buffer, 'test.jpg', 'image/jpeg');

      expect(result.key).toMatch(/^[a-f0-9-]+\.webp$/);
      expect(result.mimeType).toBe('image/webp');
      expect(result.size).toBeLessThan(buffer.length);
    });

    it('should reject invalid file types', async () => {
      const buffer = Buffer.from('not an image');
      await expect(
        storageService.upload(buffer, 'test.txt', 'text/plain')
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should prevent path traversal attacks', async () => {
      await expect(storageService.delete('../../../etc/passwd')).rejects.toThrow();
      await expect(storageService.delete('/etc/passwd')).rejects.toThrow();
    });
  });
});
```

### Integration Testing

For integration tests, consider using temporary directories:

```typescript
beforeEach(() => {
  process.env.UPLOAD_PATH = '/tmp/test-uploads';
});

afterEach(async () => {
  await fs.rm('/tmp/test-uploads', { recursive: true, force: true });
});
```

---

## Related Documentation

- [Profile Photo API](../api/profile-photo.md) - API endpoint documentation
- [Development Guide](../DEVELOPMENT.md) - Local development setup
- [Security Review](../SECURITY_REVIEW.md) - Security considerations
