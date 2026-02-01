// Supabase Storage Service Unit Tests
// Tests for Supabase storage operations including upload, delete, and URL generation

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Supabase client
const mockStorageFrom = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockGetBucket = jest.fn();
const mockCreateBucket = jest.fn();

const mockSupabaseClient = {
  storage: {
    from: mockStorageFrom,
    getBucket: mockGetBucket,
    createBucket: mockCreateBucket,
  },
};

jest.mock('../../../src/config/supabase', () => ({
  getSupabaseAdminClient: jest.fn(() => mockSupabaseClient),
}));

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9abc-def012345678'),
}));

// Mock sharp module
const mockSharpInstance = {
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

jest.mock('sharp', () => {
  return jest.fn(() => mockSharpInstance);
});

// Mock config module
jest.mock('../../../src/config', () => ({
  IMAGE_MAX_WIDTH: 400,
  IMAGE_MAX_HEIGHT: 400,
  IMAGE_QUALITY: 80,
  OUTPUT_FORMAT: 'webp',
}));

// Set required environment variable BEFORE importing the service
process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';

// Import after mocking and setting env
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { supabaseStorageService } from '../../../src/services/storage/supabaseStorage.service';

// Get typed references to mocks
const mockUuid = uuidv4 as jest.Mock;

// Store original environment
const originalEnv = { ...process.env };

// ============================================================================
// Test Suites
// ============================================================================

describe('SupabaseStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set required environment variables
    process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';

    // Default mock implementations
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image-data'));

    // Mock storage.from() to return methods
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
    });

    // Default successful upload
    mockUpload.mockResolvedValue({
      data: { path: 'mock-uuid-1234-5678-9abc-def012345678.webp' },
      error: null,
    });

    // Default successful remove
    mockRemove.mockResolvedValue({ error: null });

    // Default bucket exists
    mockGetBucket.mockResolvedValue({
      data: { name: 'uploads', public: true },
      error: null,
    });
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should throw error when SUPABASE_URL is missing', () => {
      // Arrange
      delete process.env['SUPABASE_URL'];

      // Act & Assert
      expect(() => {
        // Force re-instantiation by requiring the module again
        jest.resetModules();
        require('../../../src/services/storage/supabaseStorage.service');
      }).toThrow('SUPABASE_URL environment variable is required');
    });

    it('should set correct bucket name and public URL', () => {
      // Act - service is already instantiated in beforeEach
      const url = supabaseStorageService.getUrl('test.webp');

      // Assert
      expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/test.webp');
    });
  });

  // ==========================================================================
  // sanitizeDirectory Tests (Critical Path - 100% Coverage)
  // ==========================================================================

  describe('sanitizeDirectory', () => {
    it('should accept valid single directory', async () => {
      // Arrange
      mockUuid.mockReturnValue('valid-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'boxer-123/valid-uuid.webp' },
        error: null,
      });

      // Act
      await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: 'boxer-123' }
      );

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'boxer-123/valid-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should accept valid nested directory', async () => {
      // Arrange
      mockUuid.mockReturnValue('nested-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'boxer-123/photos/nested-uuid.webp' },
        error: null,
      });

      // Act
      await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: 'boxer-123/photos' }
      );

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'boxer-123/photos/nested-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should reject path traversal with double dots', async () => {
      // Act & Assert
      await expect(
        supabaseStorageService.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          { directory: '../../../etc' }
        )
      ).rejects.toThrow('Invalid directory path: path traversal detected');
    });

    it('should reject double slashes', async () => {
      // Act & Assert
      await expect(
        supabaseStorageService.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          { directory: 'boxer//photos' }
        )
      ).rejects.toThrow('Invalid directory path: path traversal detected');
    });

    it('should reject special characters (@ symbol)', async () => {
      // Act & Assert
      await expect(
        supabaseStorageService.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          { directory: 'boxer@photos' }
        )
      ).rejects.toThrow('Invalid directory path: contains illegal characters');
    });

    it('should reject special characters (! symbol)', async () => {
      // Act & Assert
      await expect(
        supabaseStorageService.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          { directory: 'boxer!photos' }
        )
      ).rejects.toThrow('Invalid directory path: contains illegal characters');
    });

    it('should reject special characters (# symbol)', async () => {
      // Act & Assert
      await expect(
        supabaseStorageService.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          { directory: 'boxer#photos' }
        )
      ).rejects.toThrow('Invalid directory path: contains illegal characters');
    });

    it('should accept path with leading slash after stripping', async () => {
      // Note: Leading slashes are stripped, so /absolute/path becomes absolute/path (valid)
      // Arrange
      mockUuid.mockReturnValue('stripped-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'absolute/path/stripped-uuid.webp' },
        error: null,
      });

      // Act
      const result = await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: '/absolute/path' }
      );

      // Assert
      expect(result.key).toBe('absolute/path/stripped-uuid.webp');
    });

    it('should strip leading slashes and validate', async () => {
      // Arrange
      mockUuid.mockReturnValue('stripped-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'valid-dir/stripped-uuid.webp' },
        error: null,
      });

      // Act
      await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: '/valid-dir/' }
      );

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'valid-dir/stripped-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should allow alphanumeric characters', async () => {
      // Arrange
      mockUuid.mockReturnValue('alphanum-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'ABC123xyz789/alphanum-uuid.webp' },
        error: null,
      });

      // Act
      await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: 'ABC123xyz789' }
      );

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'ABC123xyz789/alphanum-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should allow hyphens and underscores', async () => {
      // Arrange
      mockUuid.mockReturnValue('hyphen-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'boxer-123_test/hyphen-uuid.webp' },
        error: null,
      });

      // Act
      await supabaseStorageService.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        { directory: 'boxer-123_test' }
      );

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'boxer-123_test/hyphen-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // upload Tests (Critical Path)
  // ==========================================================================

  describe('upload', () => {
    const testBuffer = Buffer.from('test-image-data');
    const testFilename = 'test-photo.jpg';
    const testMimeType = 'image/jpeg';

    it('should process and upload image with UUID filename', async () => {
      // Arrange
      mockUuid.mockReturnValue('unique-uuid-1234');
      mockUpload.mockResolvedValue({
        data: { path: 'unique-uuid-1234.webp' },
        error: null,
      });

      // Act
      const result = await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result).toBeDefined();
      expect(result.key).toBe('unique-uuid-1234.webp');
      expect(result.url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/unique-uuid-1234.webp');
      expect(result.mimeType).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should process image through sharp pipeline', async () => {
      // Act
      await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(sharp).toHaveBeenCalledWith(testBuffer);
      expect(mockSharpInstance.rotate).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 80 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    it('should upload to Supabase with correct parameters', async () => {
      // Arrange
      const processedBuffer = Buffer.from('processed-webp-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      mockUuid.mockReturnValue('upload-test-uuid');

      // Act
      await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockStorageFrom).toHaveBeenCalledWith('uploads');
      expect(mockUpload).toHaveBeenCalledWith(
        'upload-test-uuid.webp',
        processedBuffer,
        {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false,
        }
      );
    });

    it('should generate unique UUID for each upload', async () => {
      // Arrange
      mockUuid
        .mockReturnValueOnce('uuid-first')
        .mockReturnValueOnce('uuid-second');

      mockUpload
        .mockResolvedValueOnce({ data: { path: 'uuid-first.webp' }, error: null })
        .mockResolvedValueOnce({ data: { path: 'uuid-second.webp' }, error: null });

      // Act
      const result1 = await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);
      const result2 = await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result1.key).toBe('uuid-first.webp');
      expect(result2.key).toBe('uuid-second.webp');
      expect(result1.key).not.toBe(result2.key);
    });

    it('should handle upload with directory option', async () => {
      // Arrange
      mockUuid.mockReturnValue('subdir-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'avatars/subdir-uuid.webp' },
        error: null,
      });

      // Act
      const result = await supabaseStorageService.upload(
        testBuffer,
        testFilename,
        testMimeType,
        { directory: 'avatars' }
      );

      // Assert
      expect(result.key).toBe('avatars/subdir-uuid.webp');
      expect(result.url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/avatars/subdir-uuid.webp');
      expect(mockUpload).toHaveBeenCalledWith(
        'avatars/subdir-uuid.webp',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should return correct size from processed buffer', async () => {
      // Arrange
      const processedBuffer = Buffer.from('x'.repeat(2048));
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      const result = await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result.size).toBe(2048);
    });

    it('should throw error when sharp processing fails', async () => {
      // Arrange
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Image processing failed'));

      // Act & Assert
      await expect(
        supabaseStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Image processing failed');
    });

    it('should throw error when Supabase upload fails', async () => {
      // Arrange
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      // Act & Assert
      await expect(
        supabaseStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Supabase upload failed: Storage quota exceeded');
    });

    it('should throw error when upload returns no data', async () => {
      // Arrange
      mockUpload.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        supabaseStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Supabase upload returned no data');
    });

    it('should throw error when upload returns data without path', async () => {
      // Arrange
      mockUpload.mockResolvedValue({
        data: {},
        error: null,
      });

      // Act & Assert
      await expect(
        supabaseStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Supabase upload returned no data');
    });

    it('should set correct cache control header', async () => {
      // Act
      await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          cacheControl: '3600',
        })
      );
    });

    it('should set upsert to false to prevent overwriting', async () => {
      // Act
      await supabaseStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          upsert: false,
        })
      );
    });
  });

  // ==========================================================================
  // uploadRaw Tests
  // ==========================================================================

  describe('uploadRaw', () => {
    const testBuffer = Buffer.from('test-video-data');
    const testFilename = 'test-video.mp4';
    const testMimeType = 'video/mp4';

    it('should upload raw file without processing', async () => {
      // Arrange
      mockUuid.mockReturnValue('raw-uuid-1234');
      mockUpload.mockResolvedValue({
        data: { path: 'raw-uuid-1234.mp4' },
        error: null,
      });

      // Act
      const result = await supabaseStorageService.uploadRaw(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result).toBeDefined();
      expect(result.key).toBe('raw-uuid-1234.mp4');
      expect(result.url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/raw-uuid-1234.mp4');
      expect(result.mimeType).toBe('video/mp4');
      expect(result.size).toBe(testBuffer.length);
    });

    it('should not call sharp for raw upload', async () => {
      // Arrange
      mockUpload.mockResolvedValue({
        data: { path: 'test.mp4' },
        error: null,
      });

      // Act
      await supabaseStorageService.uploadRaw(testBuffer, testFilename, testMimeType);

      // Assert
      expect(sharp).not.toHaveBeenCalled();
    });

    it('should preserve original file extension', async () => {
      // Arrange
      mockUuid.mockReturnValue('preserve-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'preserve-uuid.mp4' },
        error: null,
      });

      // Act
      await supabaseStorageService.uploadRaw(testBuffer, 'video.mp4', testMimeType);

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'preserve-uuid.mp4',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should handle files without extension', async () => {
      // Arrange
      mockUuid.mockReturnValue('no-ext-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'no-ext-uuid' },
        error: null,
      });

      // Act
      await supabaseStorageService.uploadRaw(testBuffer, 'filename', 'application/octet-stream');

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        'no-ext-uuid',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should use original mime type', async () => {
      // Arrange
      mockUpload.mockResolvedValue({
        data: { path: 'test.mov' },
        error: null,
      });

      // Act
      await supabaseStorageService.uploadRaw(testBuffer, 'video.mov', 'video/quicktime');

      // Assert
      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'video/quicktime',
        })
      );
    });

    it('should support directory option for raw uploads', async () => {
      // Arrange
      mockUuid.mockReturnValue('raw-dir-uuid');
      mockUpload.mockResolvedValue({
        data: { path: 'videos/raw-dir-uuid.mp4' },
        error: null,
      });

      // Act
      const result = await supabaseStorageService.uploadRaw(
        testBuffer,
        testFilename,
        testMimeType,
        { directory: 'videos' }
      );

      // Assert
      expect(result.key).toBe('videos/raw-dir-uuid.mp4');
      expect(mockUpload).toHaveBeenCalledWith(
        'videos/raw-dir-uuid.mp4',
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // delete Tests (Error Handling)
  // ==========================================================================

  describe('delete', () => {
    it('should successfully delete an existing file', async () => {
      // Arrange
      const fileKey = 'existing-file.webp';
      mockRemove.mockResolvedValue({ error: null });

      // Act
      await supabaseStorageService.delete(fileKey);

      // Assert
      expect(mockStorageFrom).toHaveBeenCalledWith('uploads');
      expect(mockRemove).toHaveBeenCalledWith([fileKey]);
    });

    it('should handle file not found gracefully', async () => {
      // Arrange
      const fileKey = 'non-existent-file.webp';
      mockRemove.mockResolvedValue({
        error: { message: 'Object not found' },
      });

      // Act & Assert - should not throw
      await expect(supabaseStorageService.delete(fileKey)).resolves.not.toThrow();
    });

    it('should log warning when file not found', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const fileKey = 'missing-file.webp';
      mockRemove.mockResolvedValue({
        error: { message: 'File not found in storage' },
      });

      // Act
      await supabaseStorageService.delete(fileKey);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith('File not found in Supabase: missing-file.webp');

      consoleWarnSpy.mockRestore();
    });

    it('should throw error for path traversal attempt', async () => {
      // Arrange
      const maliciousKey = '../../../etc/passwd';

      // Act & Assert
      await expect(supabaseStorageService.delete(maliciousKey)).rejects.toThrow('Invalid file key');
    });

    it('should throw error for absolute path', async () => {
      // Arrange
      const absolutePath = '/etc/passwd';

      // Act & Assert
      await expect(supabaseStorageService.delete(absolutePath)).rejects.toThrow('Invalid file key');
    });

    it('should allow valid subdirectory keys', async () => {
      // Arrange
      const validSubdirKey = 'avatars/photo.webp';
      mockRemove.mockResolvedValue({ error: null });

      // Act
      await supabaseStorageService.delete(validSubdirKey);

      // Assert
      expect(mockRemove).toHaveBeenCalledWith(['avatars/photo.webp']);
    });

    it('should propagate non-404 errors', async () => {
      // Arrange
      const fileKey = 'permission-denied.webp';
      mockRemove.mockResolvedValue({
        error: { message: 'Permission denied' },
      });

      // Act & Assert
      await expect(supabaseStorageService.delete(fileKey)).rejects.toThrow(
        'Supabase delete failed: Permission denied'
      );
    });
  });

  // ==========================================================================
  // getUrl Tests
  // ==========================================================================

  describe('getUrl', () => {
    it('should return correct URL format for simple key', () => {
      // Arrange
      const key = 'photo-uuid.webp';

      // Act
      const url = supabaseStorageService.getUrl(key);

      // Assert
      expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/photo-uuid.webp');
    });

    it('should return correct URL format for key with subdirectory', () => {
      // Arrange
      const key = 'avatars/photo-uuid.webp';

      // Act
      const url = supabaseStorageService.getUrl(key);

      // Assert
      expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/avatars/photo-uuid.webp');
    });

    it('should handle keys with multiple subdirectories', () => {
      // Arrange
      const key = 'users/2024/01/photo.webp';

      // Act
      const url = supabaseStorageService.getUrl(key);

      // Assert
      expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/users/2024/01/photo.webp');
    });

    it('should not modify the key', () => {
      // Arrange
      const key = 'UPPERCASE-file.WEBP';

      // Act
      const url = supabaseStorageService.getUrl(key);

      // Assert
      expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/uploads/UPPERCASE-file.WEBP');
    });
  });

  // ==========================================================================
  // Bucket Management Tests
  // ==========================================================================

  describe('checkBucket', () => {
    it('should return true when bucket exists', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: { name: 'uploads', public: true },
        error: null,
      });

      // Act
      const exists = await supabaseStorageService.checkBucket();

      // Assert
      expect(exists).toBe(true);
      expect(mockGetBucket).toHaveBeenCalledWith('uploads');
    });

    it('should return false when bucket does not exist', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' },
      });

      // Act
      const exists = await supabaseStorageService.checkBucket();

      // Assert
      expect(exists).toBe(false);
    });

    it('should log error when bucket check fails', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetBucket.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      // Act
      await supabaseStorageService.checkBucket();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase bucket check failed: Network error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('createBucket', () => {
    it('should create bucket when it does not exist', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });
      mockCreateBucket.mockResolvedValue({ error: null });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await supabaseStorageService.createBucket();

      // Assert
      expect(mockCreateBucket).toHaveBeenCalledWith('uploads', {
        public: true,
        fileSizeLimit: 104857600,
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
      expect(consoleLogSpy).toHaveBeenCalledWith("✓ Supabase bucket 'uploads' created successfully");

      consoleLogSpy.mockRestore();
    });

    it('should not create bucket when it already exists', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: { name: 'uploads' },
        error: null,
      });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await supabaseStorageService.createBucket();

      // Assert
      expect(mockCreateBucket).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith("Supabase bucket 'uploads' already exists");

      consoleLogSpy.mockRestore();
    });

    it('should throw error when bucket creation fails', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });
      mockCreateBucket.mockResolvedValue({
        error: { message: 'Permission denied' },
      });

      // Act & Assert
      await expect(supabaseStorageService.createBucket()).rejects.toThrow(
        'Failed to create Supabase bucket: Permission denied'
      );
    });
  });

  describe('getStorageStats', () => {
    it('should return stats when bucket exists', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: { name: 'uploads' },
        error: null,
      });

      // Act
      const stats = await supabaseStorageService.getStorageStats();

      // Assert
      expect(stats).toEqual({
        bucketName: 'uploads',
        publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/uploads',
      });
    });

    it('should return file count of 0 when bucket does not exist', async () => {
      // Arrange
      mockGetBucket.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      // Act
      const stats = await supabaseStorageService.getStorageStats();

      // Assert
      expect(stats).toEqual({
        bucketName: 'uploads',
        publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/uploads',
        fileCount: 0,
      });
    });
  });
});
