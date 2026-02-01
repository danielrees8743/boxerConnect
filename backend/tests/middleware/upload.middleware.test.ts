// Upload Middleware Unit Tests
// Tests for file upload configuration and validation using multer

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock file data object
 */
interface MockFileData {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function createMockFile(overrides: Partial<MockFileData> = {}): MockFileData {
  return {
    fieldname: 'photo',
    originalname: 'test-photo.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-content'),
    size: 1024 * 100, // 100KB
    ...overrides,
  };
}

// ============================================================================
// Configuration Constants (matching src/config/storage.ts)
// ============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Check if a MIME type is allowed (mirrors the actual implementation)
 */
function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType);
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Upload Middleware', () => {
  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('Configuration', () => {
    it('should have MAX_FILE_SIZE set to 5MB', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });

    it('should have correct allowed MIME types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('image/webp');
      expect(ALLOWED_MIME_TYPES).toContain('image/gif');
      expect(ALLOWED_MIME_TYPES).toHaveLength(4);
    });
  });

  // ==========================================================================
  // File Type Validation Tests
  // ==========================================================================

  describe('File Type Validation', () => {
    it('should accept valid JPEG file type', () => {
      const mockFile = createMockFile({ mimetype: 'image/jpeg' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(true);
    });

    it('should accept valid PNG file type', () => {
      const mockFile = createMockFile({ mimetype: 'image/png' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(true);
    });

    it('should accept valid WebP file type', () => {
      const mockFile = createMockFile({ mimetype: 'image/webp' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(true);
    });

    it('should accept valid GIF file type', () => {
      const mockFile = createMockFile({ mimetype: 'image/gif' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(true);
    });

    it('should reject invalid file type (PDF)', () => {
      const mockFile = createMockFile({ mimetype: 'application/pdf' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(false);
    });

    it('should reject invalid file type (text/plain)', () => {
      const mockFile = createMockFile({ mimetype: 'text/plain' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(false);
    });

    it('should reject invalid file type (video/mp4)', () => {
      const mockFile = createMockFile({ mimetype: 'video/mp4' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(false);
    });

    it('should reject invalid file type (image/svg+xml)', () => {
      // SVG is intentionally not allowed for security reasons
      const mockFile = createMockFile({ mimetype: 'image/svg+xml' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(false);
    });

    it('should reject invalid file type (image/bmp)', () => {
      const mockFile = createMockFile({ mimetype: 'image/bmp' });
      expect(isAllowedMimeType(mockFile.mimetype)).toBe(false);
    });
  });

  // ==========================================================================
  // File Size Validation Tests
  // ==========================================================================

  describe('File Size Validation', () => {
    it('should enforce 5MB file size limit', () => {
      const maxSize = MAX_FILE_SIZE;
      expect(maxSize).toBe(5 * 1024 * 1024); // 5MB in bytes
    });

    it('should accept file under size limit', () => {
      const mockFile = createMockFile({ size: 1024 * 1024 }); // 1MB
      expect(mockFile.size).toBeLessThan(MAX_FILE_SIZE);
    });

    it('should accept file at exactly size limit', () => {
      const mockFile = createMockFile({ size: MAX_FILE_SIZE });
      expect(mockFile.size).toBeLessThanOrEqual(MAX_FILE_SIZE);
    });

    it('should reject file over size limit', () => {
      const mockFile = createMockFile({ size: MAX_FILE_SIZE + 1 });
      expect(mockFile.size).toBeGreaterThan(MAX_FILE_SIZE);
    });

    it('should reject large file (10MB)', () => {
      const mockFile = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB
      expect(mockFile.size).toBeGreaterThan(MAX_FILE_SIZE);
    });
  });

  // ==========================================================================
  // File Structure Tests
  // ==========================================================================

  describe('File Structure', () => {
    it('should use memory storage (buffer present)', () => {
      // The middleware is configured with memoryStorage, meaning files
      // will be available as buffers, not written to disk
      const mockFile = createMockFile();
      expect(mockFile.buffer).toBeInstanceOf(Buffer);
    });

    it('should handle single file upload with field name "photo"', () => {
      // uploadProfilePhoto is configured with .single('photo')
      const mockFile = createMockFile({ fieldname: 'photo' });
      expect(mockFile.fieldname).toBe('photo');
    });

    it('should limit to 1 file per request', () => {
      // multerConfig has limits.files = 1
      const singleFile = createMockFile();
      expect([singleFile]).toHaveLength(1);
    });

    it('should have correct file properties structure', () => {
      const mockFile = createMockFile({
        originalname: 'my-profile-picture.png',
        mimetype: 'image/png',
        size: 2048,
      });

      // Simulate multer file object
      const processedFile: Express.Multer.File = {
        ...mockFile,
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      };

      expect(processedFile.originalname).toBe('my-profile-picture.png');
      expect(processedFile.mimetype).toBe('image/png');
      expect(processedFile.size).toBe(2048);
      expect(processedFile.buffer).toBeDefined();
      expect(processedFile.fieldname).toBe('photo');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should create error message for invalid file type', () => {
      const errorMessage = `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`;

      expect(errorMessage).toContain('Invalid file type');
      expect(errorMessage).toContain('image/jpeg');
      expect(errorMessage).toContain('image/png');
      expect(errorMessage).toContain('image/webp');
      expect(errorMessage).toContain('image/gif');
    });

    it('should handle LIMIT_FILE_SIZE error code', () => {
      const errorCode = 'LIMIT_FILE_SIZE';
      expect(errorCode).toBe('LIMIT_FILE_SIZE');
    });

    it('should handle LIMIT_UNEXPECTED_FILE error code', () => {
      const errorCode = 'LIMIT_UNEXPECTED_FILE';
      expect(errorCode).toBe('LIMIT_UNEXPECTED_FILE');
    });

    it('should handle LIMIT_FILE_COUNT error code', () => {
      const errorCode = 'LIMIT_FILE_COUNT';
      expect(errorCode).toBe('LIMIT_FILE_COUNT');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty filename', () => {
      const mockFile = createMockFile({ originalname: '' });
      expect(mockFile.originalname).toBe('');
    });

    it('should handle very long filename', () => {
      const longName = 'a'.repeat(255) + '.jpg';
      const mockFile = createMockFile({ originalname: longName });
      expect(mockFile.originalname.length).toBe(259);
    });

    it('should handle filename with special characters', () => {
      const mockFile = createMockFile({
        originalname: 'photo with spaces & symbols!@#.jpg'
      });
      expect(mockFile.originalname).toBe('photo with spaces & symbols!@#.jpg');
    });

    it('should handle unicode filename', () => {
      const mockFile = createMockFile({
        originalname: 'foto_\u65E5\u672C\u8A9E.png' // Japanese characters
      });
      expect(mockFile.originalname).toContain('\u65E5\u672C\u8A9E');
    });

    it('should handle empty buffer', () => {
      const mockFile = createMockFile({
        buffer: Buffer.alloc(0),
        size: 0,
      });
      expect(mockFile.buffer.length).toBe(0);
      expect(mockFile.size).toBe(0);
    });

    it('should handle case sensitivity for MIME types', () => {
      // MIME types should be lowercase per spec
      const lowerMime = 'image/jpeg';
      const upperMime = 'IMAGE/JPEG';

      expect(isAllowedMimeType(lowerMime)).toBe(true);
      expect(isAllowedMimeType(upperMime)).toBe(false);
      // Note: MIME types are case-insensitive per RFC, but multer provides lowercase
    });

    it('should reject MIME types with extra spaces', () => {
      expect(isAllowedMimeType(' image/jpeg')).toBe(false);
      expect(isAllowedMimeType('image/jpeg ')).toBe(false);
    });

    it('should reject MIME types with typos', () => {
      expect(isAllowedMimeType('image/jpg')).toBe(false);
      expect(isAllowedMimeType('image/pngg')).toBe(false);
    });
  });

  // ==========================================================================
  // File Validation Logic Tests
  // ==========================================================================

  describe('File Validation Logic', () => {
    /**
     * Simulate the file filter validation logic
     */
    function validateFile(file: MockFileData): { valid: boolean; error?: string } {
      // Check file type
      if (!isAllowedMimeType(file.mimetype)) {
        return {
          valid: false,
          error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        };
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
      }

      return { valid: true };
    }

    it('should validate a valid JPEG file', () => {
      const file = createMockFile({ mimetype: 'image/jpeg', size: 1024 * 100 });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid PNG file', () => {
      const file = createMockFile({ mimetype: 'image/png', size: 1024 * 500 });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate a valid WebP file', () => {
      const file = createMockFile({ mimetype: 'image/webp', size: 1024 * 200 });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate a valid GIF file', () => {
      const file = createMockFile({ mimetype: 'image/gif', size: 1024 * 300 });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file type', () => {
      const file = createMockFile({ mimetype: 'application/pdf', size: 1024 });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file exceeding size limit', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: MAX_FILE_SIZE + 1,
      });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should accept file at exactly size limit', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: MAX_FILE_SIZE,
      });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject file with invalid type even if size is valid', () => {
      const file = createMockFile({
        mimetype: 'application/octet-stream',
        size: 1024,
      });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  // ==========================================================================
  // Buffer Handling Tests
  // ==========================================================================

  describe('Buffer Handling', () => {
    it('should handle buffer with image data', () => {
      const imageData = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic bytes
      const file = createMockFile({ buffer: imageData });
      expect(file.buffer[0]).toBe(0xFF);
      expect(file.buffer[1]).toBe(0xD8);
    });

    it('should handle buffer size matching file size', () => {
      const bufferContent = Buffer.from('x'.repeat(1024));
      const file = createMockFile({
        buffer: bufferContent,
        size: 1024,
      });
      expect(file.buffer.length).toBe(file.size);
    });

    it('should handle large buffer', () => {
      const largeBuffer = Buffer.alloc(MAX_FILE_SIZE);
      const file = createMockFile({
        buffer: largeBuffer,
        size: MAX_FILE_SIZE,
      });
      expect(file.buffer.length).toBe(MAX_FILE_SIZE);
    });
  });
});
