// Storage Service Interface
// Defines the contract for storage implementations (local, S3, etc.)

// ============================================================================
// Types
// ============================================================================

/**
 * Result returned after a successful file upload
 */
export interface StorageResult {
  /**
   * Unique identifier/key for the stored file
   * For local storage: filename
   * For S3: object key
   */
  key: string;

  /**
   * URL to access the stored file
   */
  url: string;

  /**
   * Size of the stored file in bytes
   */
  size: number;

  /**
   * MIME type of the stored file
   */
  mimeType: string;
}

/**
 * Options for file upload
 */
export interface UploadOptions {
  /**
   * Optional subdirectory within the storage location
   */
  directory?: string;

  /**
   * Whether to preserve the original filename (default: false, use UUID)
   */
  preserveFilename?: boolean;
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Storage service interface
 * Abstraction layer for file storage operations
 */
export interface StorageService {
  /**
   * Upload a file to storage (with image processing for photos)
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
   * Upload a file to storage without processing (for videos and other raw files)
   * @param buffer - File contents as a buffer
   * @param filename - Original filename (used for extension)
   * @param mimeType - MIME type of the file
   * @param options - Optional upload configuration
   * @returns Promise resolving to storage result with file details
   */
  uploadRaw(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult>;

  /**
   * Delete a file from storage
   * @param key - The file key/identifier returned from upload
   * @returns Promise that resolves when deletion is complete
   */
  delete(key: string): Promise<void>;

  /**
   * Get the URL for a stored file
   * @param key - The file key/identifier
   * @returns The URL to access the file
   */
  getUrl(key: string): string;
}
