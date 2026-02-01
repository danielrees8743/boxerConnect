// Profile Photo Service Unit Tests
// Tests for profile photo upload, removal, and URL retrieval business logic

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the config module (for Prisma)
const mockPrisma = {
  boxer: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../src/config', () => ({
  prisma: mockPrisma,
}));

// Mock the storage service
const mockStorageService = {
  upload: jest.fn(),
  delete: jest.fn(),
  getUrl: jest.fn(),
};

jest.mock('../../src/services/storage', () => ({
  storageService: mockStorageService,
}));

// Import after mocking
import * as profilePhotoService from '../../src/services/profilePhoto.service';
import { prisma } from '../../src/config';
import { storageService } from '../../src/services/storage';

// Get typed references to mocks
const mockBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const mockBoxerUpdate = prisma.boxer.update as jest.Mock;
const mockStorageUpload = storageService.upload as jest.Mock;
const mockStorageDelete = storageService.delete as jest.Mock;

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock Multer file object
 */
function createMockMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'photo',
    originalname: 'test-photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 500, // 500KB
    buffer: Buffer.from('fake-image-data'),
    stream: {} as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

/**
 * Create a mock boxer object
 */
function createMockBoxer(overrides: Partial<{ id: string; userId: string; profilePhotoUrl: string | null }> = {}) {
  return {
    id: 'boxer-id-123',
    userId: 'user-id-123',
    profilePhotoUrl: null,
    ...overrides,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('ProfilePhoto Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // uploadProfilePhoto Tests
  // ==========================================================================

  describe('uploadProfilePhoto', () => {
    it('should create new photo for user without existing photo', async () => {
      // Arrange
      const userId = 'user-id-123';
      const mockFile = createMockMulterFile();
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: null });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageUpload.mockResolvedValue({
        key: 'new-photo-uuid.webp',
        url: '/uploads/profile-photos/new-photo-uuid.webp',
        size: 2048,
        mimeType: 'image/webp',
      });
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: '/uploads/profile-photos/new-photo-uuid.webp' });

      // Act
      const result = await profilePhotoService.uploadProfilePhoto(userId, mockFile);

      // Assert
      expect(result).toEqual({
        url: '/uploads/profile-photos/new-photo-uuid.webp',
        size: 2048,
        mimeType: 'image/webp',
      });
      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true, profilePhotoUrl: true },
      });
      expect(mockStorageUpload).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype
      );
      expect(mockStorageDelete).not.toHaveBeenCalled(); // No old photo to delete
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: mockBoxer.id },
        data: { profilePhotoUrl: '/uploads/profile-photos/new-photo-uuid.webp' },
      });
    });

    it('should replace existing photo (delete old, upload new)', async () => {
      // Arrange
      const userId = 'user-id-456';
      const mockFile = createMockMulterFile();
      const oldPhotoUrl = '/uploads/profile-photos/old-photo.webp';
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: oldPhotoUrl });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageDelete.mockResolvedValue(undefined);
      mockStorageUpload.mockResolvedValue({
        key: 'new-photo.webp',
        url: '/uploads/profile-photos/new-photo.webp',
        size: 3072,
        mimeType: 'image/webp',
      });
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: '/uploads/profile-photos/new-photo.webp' });

      // Act
      const result = await profilePhotoService.uploadProfilePhoto(userId, mockFile);

      // Assert
      expect(result.url).toBe('/uploads/profile-photos/new-photo.webp');
      expect(mockStorageDelete).toHaveBeenCalledWith('old-photo.webp');
      expect(mockStorageUpload).toHaveBeenCalled();
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: mockBoxer.id },
        data: { profilePhotoUrl: '/uploads/profile-photos/new-photo.webp' },
      });
    });

    it('should throw error when boxer profile not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const mockFile = createMockMulterFile();

      mockBoxerFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        profilePhotoService.uploadProfilePhoto(userId, mockFile)
      ).rejects.toThrow('Boxer profile not found');

      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockBoxerUpdate).not.toHaveBeenCalled();
    });

    it('should handle storage upload errors gracefully', async () => {
      // Arrange
      const userId = 'user-id-789';
      const mockFile = createMockMulterFile();
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: null });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageUpload.mockRejectedValue(new Error('Storage service unavailable'));

      // Act & Assert
      await expect(
        profilePhotoService.uploadProfilePhoto(userId, mockFile)
      ).rejects.toThrow('Storage service unavailable');

      expect(mockBoxerUpdate).not.toHaveBeenCalled();
    });

    it('should continue upload even if old photo deletion fails', async () => {
      // Arrange
      const userId = 'user-id-101';
      const mockFile = createMockMulterFile();
      const mockBoxer = createMockBoxer({
        userId,
        profilePhotoUrl: '/uploads/profile-photos/corrupted-old-photo.webp'
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageDelete.mockRejectedValue(new Error('Failed to delete file'));
      mockStorageUpload.mockResolvedValue({
        key: 'new-photo.webp',
        url: '/uploads/profile-photos/new-photo.webp',
        size: 1500,
        mimeType: 'image/webp',
      });
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: '/uploads/profile-photos/new-photo.webp' });

      // Act
      const result = await profilePhotoService.uploadProfilePhoto(userId, mockFile);

      // Assert - upload should succeed despite deletion failure
      expect(result.url).toBe('/uploads/profile-photos/new-photo.webp');
      expect(mockStorageDelete).toHaveBeenCalled();
      expect(mockStorageUpload).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete old profile photo:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle database update failure', async () => {
      // Arrange
      const userId = 'user-id-202';
      const mockFile = createMockMulterFile();
      const mockBoxer = createMockBoxer({ userId });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageUpload.mockResolvedValue({
        key: 'photo.webp',
        url: '/uploads/profile-photos/photo.webp',
        size: 1000,
        mimeType: 'image/webp',
      });
      mockBoxerUpdate.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(
        profilePhotoService.uploadProfilePhoto(userId, mockFile)
      ).rejects.toThrow('Database connection failed');
    });
  });

  // ==========================================================================
  // removeProfilePhoto Tests
  // ==========================================================================

  describe('removeProfilePhoto', () => {
    it('should remove photo and clear database field', async () => {
      // Arrange
      const userId = 'user-id-303';
      const photoUrl = '/uploads/profile-photos/to-delete.webp';
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: photoUrl });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageDelete.mockResolvedValue(undefined);
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: null });

      // Act
      await profilePhotoService.removeProfilePhoto(userId);

      // Assert
      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true, profilePhotoUrl: true },
      });
      expect(mockStorageDelete).toHaveBeenCalledWith('to-delete.webp');
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: mockBoxer.id },
        data: { profilePhotoUrl: null },
      });
    });

    it('should handle non-existent photo gracefully (no error)', async () => {
      // Arrange
      const userId = 'user-id-404';
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: null });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);

      // Act
      await profilePhotoService.removeProfilePhoto(userId);

      // Assert
      expect(mockStorageDelete).not.toHaveBeenCalled();
      expect(mockBoxerUpdate).not.toHaveBeenCalled();
    });

    it('should throw error when boxer profile not found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockBoxerFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        profilePhotoService.removeProfilePhoto(userId)
      ).rejects.toThrow('Boxer profile not found');

      expect(mockStorageDelete).not.toHaveBeenCalled();
      expect(mockBoxerUpdate).not.toHaveBeenCalled();
    });

    it('should continue database update even if file deletion fails', async () => {
      // Arrange
      const userId = 'user-id-505';
      const photoUrl = '/uploads/profile-photos/problematic-file.webp';
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: photoUrl });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageDelete.mockRejectedValue(new Error('File system error'));
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: null });

      // Act
      await profilePhotoService.removeProfilePhoto(userId);

      // Assert
      expect(mockStorageDelete).toHaveBeenCalledWith('problematic-file.webp');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete profile photo file:',
        expect.any(Error)
      );
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: mockBoxer.id },
        data: { profilePhotoUrl: null },
      });

      consoleSpy.mockRestore();
    });

    it('should extract correct filename from full URL path', async () => {
      // Arrange
      const userId = 'user-id-606';
      const photoUrl = '/uploads/profile-photos/subdir/complex-filename-123.webp';
      const mockBoxer = createMockBoxer({ userId, profilePhotoUrl: photoUrl });

      mockBoxerFindUnique.mockResolvedValue(mockBoxer);
      mockStorageDelete.mockResolvedValue(undefined);
      mockBoxerUpdate.mockResolvedValue({ ...mockBoxer, profilePhotoUrl: null });

      // Act
      await profilePhotoService.removeProfilePhoto(userId);

      // Assert - should extract just the filename
      expect(mockStorageDelete).toHaveBeenCalledWith('complex-filename-123.webp');
    });
  });

  // ==========================================================================
  // getProfilePhotoUrl Tests
  // ==========================================================================

  describe('getProfilePhotoUrl', () => {
    it('should return URL for existing photo', async () => {
      // Arrange
      const userId = 'user-id-707';
      const expectedUrl = '/uploads/profile-photos/existing-photo.webp';

      mockBoxerFindUnique.mockResolvedValue({
        profilePhotoUrl: expectedUrl,
      });

      // Act
      const result = await profilePhotoService.getProfilePhotoUrl(userId);

      // Assert
      expect(result).toBe(expectedUrl);
      expect(mockBoxerFindUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { profilePhotoUrl: true },
      });
    });

    it('should return null for no photo', async () => {
      // Arrange
      const userId = 'user-id-808';

      mockBoxerFindUnique.mockResolvedValue({
        profilePhotoUrl: null,
      });

      // Act
      const result = await profilePhotoService.getProfilePhotoUrl(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-existent boxer', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockBoxerFindUnique.mockResolvedValue(null);

      // Act
      const result = await profilePhotoService.getProfilePhotoUrl(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database query errors', async () => {
      // Arrange
      const userId = 'user-id-909';

      mockBoxerFindUnique.mockRejectedValue(new Error('Database timeout'));

      // Act & Assert
      await expect(
        profilePhotoService.getProfilePhotoUrl(userId)
      ).rejects.toThrow('Database timeout');
    });
  });
});
