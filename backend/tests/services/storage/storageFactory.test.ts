// Storage Factory Integration Tests
// Tests for storage provider selection and factory pattern

// ============================================================================
// Mock Setup
// ============================================================================

// Store original environment
const originalEnv = { ...process.env };

// Mock localStorage service
const mockLocalStorageService = {
  upload: jest.fn(),
  uploadRaw: jest.fn(),
  delete: jest.fn(),
  getUrl: jest.fn(),
};

// Mock supabaseStorage service
const mockSupabaseStorageService = {
  upload: jest.fn(),
  uploadRaw: jest.fn(),
  delete: jest.fn(),
  getUrl: jest.fn(),
};

jest.mock('../../../src/services/storage/localStorage.service', () => ({
  localStorageService: mockLocalStorageService,
}));

jest.mock('../../../src/services/storage/supabaseStorage.service', () => ({
  supabaseStorageService: mockSupabaseStorageService,
}));

// ============================================================================
// Test Suites
// ============================================================================

describe('Storage Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // getStorageService Tests
  // ==========================================================================

  describe('getStorageService', () => {
    it('should return local storage service when provider is "local"', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('local');

      // Assert
      expect(service).toBe(mockLocalStorageService);
    });

    it('should return supabase storage service when provider is "supabase"', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('supabase');

      // Assert
      expect(service).toBe(mockSupabaseStorageService);
    });

    it('should throw error for S3 provider (not yet implemented)', () => {
      // Act & Assert
      const { getStorageService } = require('../../../src/services/storage/index');
      expect(() => getStorageService('s3')).toThrow('S3 storage not yet implemented');
    });

    it('should default to local storage when no provider specified', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService();

      // Assert
      expect(service).toBe(mockLocalStorageService);
    });

    it('should default to local storage for invalid provider', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      // Testing invalid provider type
      const service = getStorageService('invalid' as any);

      // Assert
      expect(service).toBe(mockLocalStorageService);
    });
  });

  // ==========================================================================
  // Environment-Based Provider Selection Tests
  // ==========================================================================

  describe('storageService (default export)', () => {
    it('should use local storage when STORAGE_PROVIDER is not set', () => {
      // Arrange
      delete process.env['STORAGE_PROVIDER'];

      // Act
      const { storageService } = require('../../../src/services/storage/index');

      // Assert
      expect(storageService).toBe(mockLocalStorageService);
    });

    it('should use local storage when STORAGE_PROVIDER is "local"', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'local';

      // Act
      const { storageService } = require('../../../src/services/storage/index');

      // Assert
      expect(storageService).toBe(mockLocalStorageService);
    });

    it('should use supabase storage when STORAGE_PROVIDER is "supabase"', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';

      // Act
      const { storageService } = require('../../../src/services/storage/index');

      // Assert
      expect(storageService).toBe(mockSupabaseStorageService);
    });

    it('should default to local storage for invalid STORAGE_PROVIDER value', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'invalid-provider';

      // Act
      const { storageService } = require('../../../src/services/storage/index');

      // Assert
      expect(storageService).toBe(mockLocalStorageService);
    });

    it('should default to local storage for empty STORAGE_PROVIDER', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = '';

      // Act
      const { storageService } = require('../../../src/services/storage/index');

      // Assert
      expect(storageService).toBe(mockLocalStorageService);
    });
  });

  // ==========================================================================
  // Module Exports Tests
  // ==========================================================================

  describe('module exports', () => {
    it('should export localStorageService', () => {
      // Act
      const { localStorageService } = require('../../../src/services/storage/index');

      // Assert
      expect(localStorageService).toBe(mockLocalStorageService);
    });

    it('should export supabaseStorageService', () => {
      // Act
      const { supabaseStorageService } = require('../../../src/services/storage/index');

      // Assert
      expect(supabaseStorageService).toBe(mockSupabaseStorageService);
    });

    it('should export getStorageService function', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');

      // Assert
      expect(typeof getStorageService).toBe('function');
    });

    it('should export storageService as default', () => {
      // Act
      const storageModule = require('../../../src/services/storage/index');

      // Assert
      expect(storageModule.default).toBeDefined();
    });
  });

  // ==========================================================================
  // StorageService Interface Compliance Tests
  // ==========================================================================

  describe('StorageService interface compliance', () => {
    it('should return service with upload method', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('local');

      // Assert
      expect(service).toHaveProperty('upload');
      expect(typeof service.upload).toBe('function');
    });

    it('should return service with uploadRaw method', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('local');

      // Assert
      expect(service).toHaveProperty('uploadRaw');
      expect(typeof service.uploadRaw).toBe('function');
    });

    it('should return service with delete method', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('local');

      // Assert
      expect(service).toHaveProperty('delete');
      expect(typeof service.delete).toBe('function');
    });

    it('should return service with getUrl method', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('local');

      // Assert
      expect(service).toHaveProperty('getUrl');
      expect(typeof service.getUrl).toBe('function');
    });

    it('should return supabase service with all required methods', () => {
      // Act
      const { getStorageService } = require('../../../src/services/storage/index');
      const service = getStorageService('supabase');

      // Assert
      expect(service).toHaveProperty('upload');
      expect(service).toHaveProperty('uploadRaw');
      expect(service).toHaveProperty('delete');
      expect(service).toHaveProperty('getUrl');
    });
  });

  // ==========================================================================
  // Type Safety Tests
  // ==========================================================================

  describe('StorageProvider type', () => {
    it('should accept "local" as valid provider type', () => {
      // Act & Assert - TypeScript compile-time check
      const { getStorageService } = require('../../../src/services/storage/index');
      const provider: 'local' | 'supabase' | 's3' = 'local';
      expect(() => getStorageService(provider)).not.toThrow();
    });

    it('should accept "supabase" as valid provider type', () => {
      // Act & Assert - TypeScript compile-time check
      const { getStorageService } = require('../../../src/services/storage/index');
      const provider: 'local' | 'supabase' | 's3' = 'supabase';
      expect(() => getStorageService(provider)).not.toThrow();
    });

    it('should accept "s3" as valid provider type (even if not implemented)', () => {
      // Act & Assert - TypeScript compile-time check
      const { getStorageService } = require('../../../src/services/storage/index');
      const provider: 'local' | 'supabase' | 's3' = 's3';
      expect(() => getStorageService(provider)).toThrow('S3 storage not yet implemented');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('provider switching', () => {
    it('should be able to switch between providers dynamically', () => {
      // Arrange
      const { getStorageService } = require('../../../src/services/storage/index');

      // Act
      const localService = getStorageService('local');
      const supabaseService = getStorageService('supabase');
      const defaultService = getStorageService();

      // Assert
      expect(localService).toBe(mockLocalStorageService);
      expect(supabaseService).toBe(mockSupabaseStorageService);
      expect(defaultService).toBe(mockLocalStorageService);
    });

    it('should maintain separate instances for different providers', () => {
      // Arrange
      const { getStorageService } = require('../../../src/services/storage/index');

      // Act
      const service1 = getStorageService('local');
      const service2 = getStorageService('supabase');

      // Assert
      expect(service1).not.toBe(service2);
    });

    it('should return same instance for same provider', () => {
      // Arrange
      const { getStorageService } = require('../../../src/services/storage/index');

      // Act
      const service1 = getStorageService('local');
      const service2 = getStorageService('local');

      // Assert
      expect(service1).toBe(service2);
    });
  });
});
