// Local Storage Service
// Implements StorageService interface for local filesystem storage

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import {
  UPLOAD_PATH,
  UPLOAD_URL_PREFIX,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  IMAGE_QUALITY,
  OUTPUT_FORMAT,
} from '../../config';
import type { StorageService, StorageResult, UploadOptions } from './storage.interface';

// ============================================================================
// Local Storage Service Implementation
// ============================================================================

/**
 * Local filesystem storage service
 * Processes images with sharp and stores them locally
 */
class LocalStorageService implements StorageService {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor() {
    this.basePath = UPLOAD_PATH;
    this.baseUrl = UPLOAD_URL_PREFIX;
  }

  /**
   * Ensure the upload directory exists
   */
  private async ensureDirectory(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
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
   * Upload a file to local storage
   * Processes images before saving
   */
  async upload(
    buffer: Buffer,
    _filename: string,
    _mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    // Ensure upload directory exists
    const uploadDir = options?.directory
      ? path.join(this.basePath, options.directory)
      : this.basePath;
    await this.ensureDirectory(uploadDir);

    // Generate UUID filename to prevent path traversal attacks
    const uuid = uuidv4();
    const outputFilename = `${uuid}.${OUTPUT_FORMAT}`;
    const outputPath = path.join(uploadDir, outputFilename);

    // Process image
    const processedBuffer = await this.processImage(buffer);

    // Write to disk
    await fs.writeFile(outputPath, processedBuffer);

    // Build the relative key (for storage reference)
    const key = options?.directory
      ? `${options.directory}/${outputFilename}`
      : outputFilename;

    // Build the URL
    const url = options?.directory
      ? `${this.baseUrl}/${options.directory}/${outputFilename}`
      : `${this.baseUrl}/${outputFilename}`;

    return {
      key,
      url,
      size: processedBuffer.length,
      mimeType: `image/${OUTPUT_FORMAT}`,
    };
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    // Validate key to prevent path traversal
    // Keys can contain subdirectories (e.g., "subdir/file.webp") but not ".." or absolute paths
    if (key.includes('..') || path.isAbsolute(key)) {
      throw new Error('Invalid file key');
    }

    const filePath = path.join(this.basePath, key);

    // Ensure the resolved path is within the base path (prevent traversal)
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.basePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('Invalid file path');
    }

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Get the URL for a stored file
   */
  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const localStorageService = new LocalStorageService();

export default localStorageService;
