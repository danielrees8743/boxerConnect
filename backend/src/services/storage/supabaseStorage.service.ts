// Supabase Storage Service
// Implements StorageService interface for Supabase Storage
// Provides image processing with Sharp and file management

import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { getSupabaseAdminClient } from '../../config/supabase';
import {
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  IMAGE_QUALITY,
  OUTPUT_FORMAT,
} from '../../config';
import type {
  StorageService,
  StorageResult,
  UploadOptions,
} from './storage.interface';

// ============================================================================
// Supabase Storage Service Implementation
// ============================================================================

/**
 * Supabase storage service
 * Processes images with sharp and stores them in Supabase Storage buckets
 */
class SupabaseStorageService implements StorageService {
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucketName = 'uploads'; // Supabase bucket name
    const supabaseUrl = process.env['SUPABASE_URL'];
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    this.publicUrl = `${supabaseUrl}/storage/v1/object/public/${this.bucketName}`;
  }

  /**
   * Get Supabase client
   * Uses admin client for full storage access
   */
  private getClient() {
    return getSupabaseAdminClient();
  }

  /**
   * Sanitize directory path to prevent path traversal attacks
   * @param directory - Directory path to sanitize
   * @returns Sanitized directory path
   * @throws Error if path contains illegal characters or traversal attempts
   */
  private sanitizeDirectory(directory: string): string {
    // Remove leading/trailing slashes
    const cleaned = directory.replace(/^\/+|\/+$/g, '');

    // Prevent path traversal
    if (cleaned.includes('..') || cleaned.includes('//') || cleaned.startsWith('/')) {
      throw new Error('Invalid directory path: path traversal detected');
    }

    // Only allow alphanumeric, hyphens, underscores, and single slashes
    if (!/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/.test(cleaned)) {
      throw new Error('Invalid directory path: contains illegal characters');
    }

    return cleaned;
  }

  /**
   * Process image with sharp
   * - Converts to WebP format
   * - Resizes to fit within max dimensions
   * - Strips EXIF metadata for security
   * - Applies quality compression
   */
  private async processImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      // Rotate based on EXIF orientation then strip all metadata
      .rotate()
      // Resize to fit within max dimensions, maintaining aspect ratio
      .resize(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      // Convert to WebP with specified quality
      .webp({ quality: IMAGE_QUALITY })
      // Remove all metadata (EXIF, IPTC, XMP, etc.) for security
      .toBuffer();
  }

  /**
   * Upload a file to Supabase storage
   * Processes images before uploading
   */
  async upload(
    buffer: Buffer,
    _filename: string,
    _mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    const client = this.getClient();

    // Generate UUID filename to prevent path traversal attacks
    const uuid = uuidv4();
    const outputFilename = `${uuid}.${OUTPUT_FORMAT}`;

    // Build storage path (with optional subdirectory)
    const sanitizedDirectory = options?.directory ? this.sanitizeDirectory(options.directory) : '';
    const storagePath = sanitizedDirectory ? `${sanitizedDirectory}/${outputFilename}` : outputFilename;

    // Process image
    const processedBuffer = await this.processImage(buffer);

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(this.bucketName)
      .upload(storagePath, processedBuffer, {
        contentType: `image/${OUTPUT_FORMAT}`,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    if (!data || !data.path) {
      throw new Error('Supabase upload returned no data');
    }

    // Build the public URL
    const url = `${this.publicUrl}/${data.path}`;

    return {
      key: data.path,
      url,
      size: processedBuffer.length,
      mimeType: `image/${OUTPUT_FORMAT}`,
    };
  }

  /**
   * Upload a file to storage without processing (for videos and other raw files)
   * Stores file as-is with original extension
   */
  async uploadRaw(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    const client = this.getClient();

    // Generate UUID filename with original extension
    const uuid = uuidv4();
    const extension = this.getExtension(filename);
    const outputFilename = `${uuid}${extension}`;

    // Build storage path (with optional subdirectory)
    const sanitizedDirectory = options?.directory ? this.sanitizeDirectory(options.directory) : '';
    const storagePath = sanitizedDirectory ? `${sanitizedDirectory}/${outputFilename}` : outputFilename;

    // Upload to Supabase Storage without processing
    const { data, error } = await client.storage
      .from(this.bucketName)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    if (!data || !data.path) {
      throw new Error('Supabase upload returned no data');
    }

    // Build the public URL
    const url = `${this.publicUrl}/${data.path}`;

    return {
      key: data.path,
      url,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Delete a file from Supabase storage
   */
  async delete(key: string): Promise<void> {
    const client = this.getClient();

    // Validate key to prevent path traversal
    if (key.includes('..') || key.startsWith('/')) {
      throw new Error('Invalid file key');
    }

    const { error } = await client.storage.from(this.bucketName).remove([key]);

    if (error) {
      // Don't throw on file not found - just log it
      if (error.message.includes('not found')) {
        console.warn(`File not found in Supabase: ${key}`);
        return;
      }
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  /**
   * Get the URL for a stored file
   */
  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Extract file extension from filename
   */
  private getExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex);
  }

  /**
   * Check if Supabase storage bucket exists
   * Useful for health checks and initialization
   */
  async checkBucket(): Promise<boolean> {
    const client = this.getClient();

    const { data, error } = await client.storage.getBucket(this.bucketName);

    if (error) {
      console.error(`Supabase bucket check failed: ${error.message}`);
      return false;
    }

    return !!data;
  }

  /**
   * Create Supabase storage bucket if it doesn't exist
   * Only needed during initial setup
   */
  async createBucket(): Promise<void> {
    const client = this.getClient();

    const exists = await this.checkBucket();
    if (exists) {
      console.log(`Supabase bucket '${this.bucketName}' already exists`);
      return;
    }

    const { error } = await client.storage.createBucket(this.bucketName, {
      public: true, // Make bucket publicly accessible
      fileSizeLimit: 104857600, // 100MB max file size
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
      ],
    });

    if (error) {
      throw new Error(`Failed to create Supabase bucket: ${error.message}`);
    }

    console.log(`✓ Supabase bucket '${this.bucketName}' created successfully`);
  }

  /**
   * Get storage statistics
   * Useful for monitoring and health checks
   */
  async getStorageStats(): Promise<{
    bucketName: string;
    publicUrl: string;
    fileCount?: number | undefined;
  }> {
    const bucketExists = await this.checkBucket();

    const stats: {
      bucketName: string;
      publicUrl: string;
      fileCount?: number | undefined;
    } = {
      bucketName: this.bucketName,
      publicUrl: this.publicUrl,
    };

    if (!bucketExists) {
      stats.fileCount = 0;
    }

    return stats;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const supabaseStorageService = new SupabaseStorageService();

export default supabaseStorageService;
