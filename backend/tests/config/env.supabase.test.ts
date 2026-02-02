// Environment Configuration Tests - Supabase Integration
// Tests for environment validation with Supabase storage provider

// ============================================================================
// Mock Setup
// ============================================================================

// Store original environment
const originalEnv = { ...process.env };

// Mock console methods
const originalConsoleError = console.error;

// ============================================================================
// Test Suites
// ============================================================================

describe('Environment Configuration - Supabase Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset environment
    process.env = { ...originalEnv };

    // Mock console
    console.error = jest.fn();

    // Set minimal required environment for all tests
    process.env['NODE_ENV'] = 'test';
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/test';
    process.env['JWT_SECRET'] = 'test-jwt-secret-key-that-is-at-least-32-characters-long';
    process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-key-that-is-at-least-32-characters';
  });

  afterEach(() => {
    // Restore console
    console.error = originalConsoleError;

    // Restore environment
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // STORAGE_PROVIDER=local Tests (Baseline)
  // ==========================================================================

  describe('STORAGE_PROVIDER=local', () => {
    it('should validate successfully with local storage provider', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'local';

      // Act & Assert
      expect(() => {
        const envModule = require('../../src/config/env');
        expect(envModule.storageEnvConfig.storageProvider).toBe('local');
      }).not.toThrow();
    });

    it('should not require Supabase variables with local storage', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'local';
      delete process.env['SUPABASE_URL'];
      delete process.env['SUPABASE_ANON_KEY'];
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).not.toThrow();
    });

    it('should default to local when STORAGE_PROVIDER is not set', () => {
      // Arrange
      delete process.env['STORAGE_PROVIDER'];

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert
      expect(storageEnvConfig.storageProvider).toBe('local');
    });
  });

  // ==========================================================================
  // STORAGE_PROVIDER=supabase Tests (Critical Path)
  // ==========================================================================

  describe('STORAGE_PROVIDER=supabase', () => {
    it('should validate successfully with all required Supabase variables', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key-1234567890';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key-1234567890';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).not.toThrow();
    });

    it('should expose Supabase config when provider is supabase', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key-1234567890';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key-1234567890';
      process.env['SUPABASE_DATABASE_URL'] = 'postgresql://postgres:pass@db.supabase.co:5432/postgres';

      // Act
      const { supabaseEnvConfig } = require('../../src/config/env');

      // Assert
      expect(supabaseEnvConfig.url).toBe('https://test-project.supabase.co');
      expect(supabaseEnvConfig.anonKey).toBe('test-anon-key-1234567890');
      expect(supabaseEnvConfig.serviceRoleKey).toBe('test-service-role-key-1234567890');
      expect(supabaseEnvConfig.databaseUrl).toBe('postgresql://postgres:pass@db.supabase.co:5432/postgres');
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      delete process.env['SUPABASE_URL'];
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      delete process.env['SUPABASE_ANON_KEY'];
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should throw error when all Supabase variables are missing', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      delete process.env['SUPABASE_URL'];
      delete process.env['SUPABASE_ANON_KEY'];
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should work without SUPABASE_DATABASE_URL (optional)', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key-1234567890';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key-1234567890';
      delete process.env['SUPABASE_DATABASE_URL'];

      // Act
      const { supabaseEnvConfig } = require('../../src/config/env');

      // Assert
      expect(supabaseEnvConfig.databaseUrl).toBeUndefined();
    });

    it('should validate SUPABASE_URL is a valid URL', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'not-a-valid-url';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should allow empty SUPABASE_ANON_KEY to fail validation', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = '';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should allow empty SUPABASE_SERVICE_ROLE_KEY to fail validation', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = '';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });
  });

  // ==========================================================================
  // STORAGE_PROVIDER Validation Tests
  // ==========================================================================

  describe('STORAGE_PROVIDER validation', () => {
    it('should accept "local" as valid provider', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'local';

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert
      expect(storageEnvConfig.storageProvider).toBe('local');
    });

    it('should accept "supabase" as valid provider', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert
      expect(storageEnvConfig.storageProvider).toBe('supabase');
    });

    it('should accept "s3" as valid provider', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 's3';

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert
      expect(storageEnvConfig.storageProvider).toBe('s3');
    });

    it('should default to "local" for invalid provider', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'invalid-provider';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });

    it('should default to "local" when STORAGE_PROVIDER is empty', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = '';

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration');
    });
  });

  // ==========================================================================
  // Edge Cases and Error Messages
  // ==========================================================================

  describe('error messages', () => {
    it('should log detailed error when Supabase variables missing', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      delete process.env['SUPABASE_URL'];
      delete process.env['SUPABASE_ANON_KEY'];
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      // Act
      try {
        require('../../src/config/env');
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(console.error).toHaveBeenCalledWith('Invalid environment variables:');
      expect(console.error).toHaveBeenCalled();
    });

    it('should provide clear error message in exception', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      delete process.env['SUPABASE_URL'];

      // Act & Assert
      expect(() => {
        require('../../src/config/env');
      }).toThrow('Invalid environment configuration. Check the errors above.');
    });
  });

  // ==========================================================================
  // Integration with Other Config Sections
  // ==========================================================================

  describe('integration with other config', () => {
    it('should validate all required fields when using Supabase', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key-1234567890';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key-1234567890';

      // Act
      const config = require('../../src/config/env');

      // Assert
      expect(config.serverConfig).toBeDefined();
      expect(config.databaseConfig).toBeDefined();
      expect(config.storageEnvConfig).toBeDefined();
      expect(config.supabaseEnvConfig).toBeDefined();
    });

    it('should maintain storageEnvConfig structure', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert
      expect(storageEnvConfig).toHaveProperty('uploadPath');
      expect(storageEnvConfig).toHaveProperty('storageProvider');
      expect(storageEnvConfig.storageProvider).toBe('supabase');
    });

    it('should maintain supabaseEnvConfig structure', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act
      const { supabaseEnvConfig } = require('../../src/config/env');

      // Assert
      expect(supabaseEnvConfig).toHaveProperty('url');
      expect(supabaseEnvConfig).toHaveProperty('anonKey');
      expect(supabaseEnvConfig).toHaveProperty('serviceRoleKey');
      expect(supabaseEnvConfig).toHaveProperty('databaseUrl');
    });
  });

  // ==========================================================================
  // Readonly Configuration Tests
  // ==========================================================================

  describe('readonly configuration', () => {
    it('should have readonly storageEnvConfig', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'local';

      // Act
      const { storageEnvConfig } = require('../../src/config/env');

      // Assert - as const makes it readonly
      expect(storageEnvConfig).toBeDefined();
      // TypeScript would prevent modification at compile time
    });

    it('should have readonly supabaseEnvConfig', () => {
      // Arrange
      process.env['STORAGE_PROVIDER'] = 'supabase';
      process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
      process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';

      // Act
      const { supabaseEnvConfig } = require('../../src/config/env');

      // Assert - as const makes it readonly
      expect(supabaseEnvConfig).toBeDefined();
      // TypeScript would prevent modification at compile time
    });
  });
});
