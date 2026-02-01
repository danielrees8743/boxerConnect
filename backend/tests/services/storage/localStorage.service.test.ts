// Local Storage Service Unit Tests
// Tests for file storage operations including upload, delete, and URL generation

// ============================================================================
// Mock Setup
// ============================================================================

// Mock fs/promises module
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
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
  UPLOAD_PATH: '/test/uploads/profile-photos',
  UPLOAD_URL_PREFIX: '/uploads/profile-photos',
  IMAGE_MAX_WIDTH: 400,
  IMAGE_MAX_HEIGHT: 400,
  IMAGE_QUALITY: 80,
  OUTPUT_FORMAT: 'webp',
}));

// Import after mocking
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { localStorageService } from '../../../src/services/storage/localStorage.service';

// Get typed references to mocks
const mockAccess = fs.access as jest.Mock;
const mockMkdir = fs.mkdir as jest.Mock;
const mockWriteFile = fs.writeFile as jest.Mock;
const mockUnlink = fs.unlink as jest.Mock;
const mockUuid = uuidv4 as jest.Mock;

// ============================================================================
// Test Suites
// ============================================================================

describe('LocalStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image-data'));
  });

  // ==========================================================================
  // Upload Tests
  // ==========================================================================

  describe('upload', () => {
    const testBuffer = Buffer.from('test-image-data');
    const testFilename = 'test-photo.jpg';
    const testMimeType = 'image/jpeg';

    it('should process and save image with UUID filename', async () => {
      // Arrange
      mockUuid.mockReturnValue('unique-uuid-1234');

      // Act
      const result = await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result).toBeDefined();
      expect(result.key).toBe('unique-uuid-1234.webp');
      expect(result.url).toBe('/uploads/profile-photos/unique-uuid-1234.webp');
      expect(result.mimeType).toBe('image/webp');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should process image through sharp pipeline', async () => {
      // Act
      await localStorageService.upload(testBuffer, testFilename, testMimeType);

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

    it('should create directory if it does not exist', async () => {
      // Arrange - directory does not exist
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      // Act
      await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockAccess).toHaveBeenCalledWith('/test/uploads/profile-photos');
      expect(mockMkdir).toHaveBeenCalledWith('/test/uploads/profile-photos', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      // Arrange - directory exists
      mockAccess.mockResolvedValue(undefined);

      // Act
      await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockAccess).toHaveBeenCalledWith('/test/uploads/profile-photos');
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    it('should write processed image to disk', async () => {
      // Arrange
      const processedBuffer = Buffer.from('processed-webp-data');
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);
      mockUuid.mockReturnValue('write-test-uuid');

      // Act
      await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/uploads/profile-photos/write-test-uuid.webp',
        processedBuffer
      );
    });

    it('should generate unique UUID for each upload', async () => {
      // Arrange
      mockUuid
        .mockReturnValueOnce('uuid-first')
        .mockReturnValueOnce('uuid-second');

      // Act
      const result1 = await localStorageService.upload(testBuffer, testFilename, testMimeType);
      const result2 = await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result1.key).toBe('uuid-first.webp');
      expect(result2.key).toBe('uuid-second.webp');
      expect(result1.key).not.toBe(result2.key);
    });

    it('should return correct size from processed buffer', async () => {
      // Arrange
      const processedBuffer = Buffer.from('x'.repeat(1024));
      mockSharpInstance.toBuffer.mockResolvedValue(processedBuffer);

      // Act
      const result = await localStorageService.upload(testBuffer, testFilename, testMimeType);

      // Assert
      expect(result.size).toBe(1024);
    });

    it('should handle upload with directory option', async () => {
      // Arrange
      mockUuid.mockReturnValue('subdir-uuid');

      // Act
      const result = await localStorageService.upload(
        testBuffer,
        testFilename,
        testMimeType,
        { directory: 'avatars' }
      );

      // Assert
      expect(result.key).toBe('avatars/subdir-uuid.webp');
      expect(result.url).toBe('/uploads/profile-photos/avatars/subdir-uuid.webp');
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/test/uploads/profile-photos/avatars/subdir-uuid.webp',
        expect.any(Buffer)
      );
    });

    it('should throw error when sharp processing fails', async () => {
      // Arrange
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Image processing failed'));

      // Act & Assert
      await expect(
        localStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Image processing failed');
    });

    it('should throw error when file write fails', async () => {
      // Arrange
      mockWriteFile.mockRejectedValue(new Error('Disk write failed'));

      // Act & Assert
      await expect(
        localStorageService.upload(testBuffer, testFilename, testMimeType)
      ).rejects.toThrow('Disk write failed');
    });
  });

  // ==========================================================================
  // Delete Tests
  // ==========================================================================

  describe('delete', () => {
    it('should successfully delete an existing file', async () => {
      // Arrange
      const fileKey = 'existing-file.webp';
      mockUnlink.mockResolvedValue(undefined);

      // Act
      await localStorageService.delete(fileKey);

      // Assert
      expect(mockUnlink).toHaveBeenCalledWith('/test/uploads/profile-photos/existing-file.webp');
    });

    it('should handle non-existent file gracefully (no error thrown)', async () => {
      // Arrange
      const fileKey = 'non-existent-file.webp';
      const enoentError = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockUnlink.mockRejectedValue(enoentError);

      // Act & Assert - should not throw
      await expect(localStorageService.delete(fileKey)).resolves.not.toThrow();
    });

    it('should throw error for path traversal attempt with double dots', async () => {
      // Arrange
      const maliciousKey = '../../../etc/passwd';

      // Act & Assert
      await expect(localStorageService.delete(maliciousKey)).rejects.toThrow('Invalid file key');
    });

    it('should throw error for absolute path', async () => {
      // Arrange
      const absolutePath = '/etc/passwd';

      // Act & Assert
      await expect(localStorageService.delete(absolutePath)).rejects.toThrow('Invalid file key');
    });

    it('should throw error when path resolves outside base directory', async () => {
      // Arrange - a key that technically doesn't contain ".." but could resolve outside
      // This tests the secondary path validation
      const maliciousKey = 'subdir/../../../etc/passwd';

      // Act & Assert
      await expect(localStorageService.delete(maliciousKey)).rejects.toThrow('Invalid file key');
    });

    it('should allow valid subdirectory keys', async () => {
      // Arrange
      const validSubdirKey = 'avatars/photo.webp';
      mockUnlink.mockResolvedValue(undefined);

      // Act
      await localStorageService.delete(validSubdirKey);

      // Assert
      expect(mockUnlink).toHaveBeenCalledWith('/test/uploads/profile-photos/avatars/photo.webp');
    });

    it('should propagate non-ENOENT errors', async () => {
      // Arrange
      const fileKey = 'permission-denied.webp';
      const permissionError = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      permissionError.code = 'EACCES';
      mockUnlink.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(localStorageService.delete(fileKey)).rejects.toThrow('EACCES: permission denied');
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
      const url = localStorageService.getUrl(key);

      // Assert
      expect(url).toBe('/uploads/profile-photos/photo-uuid.webp');
    });

    it('should return correct URL format for key with subdirectory', () => {
      // Arrange
      const key = 'avatars/photo-uuid.webp';

      // Act
      const url = localStorageService.getUrl(key);

      // Assert
      expect(url).toBe('/uploads/profile-photos/avatars/photo-uuid.webp');
    });

    it('should handle keys with multiple subdirectories', () => {
      // Arrange
      const key = 'users/2024/01/photo.webp';

      // Act
      const url = localStorageService.getUrl(key);

      // Assert
      expect(url).toBe('/uploads/profile-photos/users/2024/01/photo.webp');
    });

    it('should not modify the key', () => {
      // Arrange
      const key = 'UPPERCASE-file.WEBP';

      // Act
      const url = localStorageService.getUrl(key);

      // Assert
      expect(url).toBe('/uploads/profile-photos/UPPERCASE-file.WEBP');
    });
  });
});
