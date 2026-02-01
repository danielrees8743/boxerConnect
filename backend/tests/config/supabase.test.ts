// Supabase Configuration Unit Tests
// Tests for Supabase client initialization, environment validation, and connection testing

// ============================================================================
// Mock Setup
// ============================================================================

// Mock @supabase/supabase-js module
const mockCreateClient = jest.fn();
const mockListBuckets = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Store original environment
const originalEnv = { ...process.env };

// ============================================================================
// Test Suites
// ============================================================================

describe('Supabase Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset environment
    process.env = { ...originalEnv };

    // Set default valid environment
    process.env['SUPABASE_URL'] = 'https://test-project.supabase.co';
    process.env['SUPABASE_ANON_KEY'] = 'test-anon-key-1234567890';
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key-1234567890';

    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();

    // Default mock client with storage methods
    const mockClient = {
      storage: {
        listBuckets: mockListBuckets,
        getBucket: jest.fn(),
        createBucket: jest.fn(),
        from: jest.fn(),
      },
    };

    mockCreateClient.mockReturnValue(mockClient);
    mockListBuckets.mockResolvedValue({
      data: [{ name: 'uploads' }],
      error: null,
    });
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;

    // Restore environment
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // Environment Validation Tests
  // ==========================================================================

  describe('getSupabaseEnv', () => {
    it('should validate and return valid Supabase configuration', () => {
      // Act
      const { getSupabaseClient } = require('../../src/config/supabase');
      const client = getSupabaseClient();

      // Assert
      expect(client).toBeDefined();
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key-1234567890',
        expect.objectContaining({
          auth: {
            persistSession: false,
          },
        })
      );
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      // Arrange
      delete process.env['SUPABASE_URL'];

      // Act & Assert
      expect(() => {
        const { getSupabaseClient } = require('../../src/config/supabase');
        getSupabaseClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should throw error when SUPABASE_URL is not a valid URL', () => {
      // Arrange
      process.env['SUPABASE_URL'] = 'not-a-valid-url';

      // Act & Assert
      expect(() => {
        const { getSupabaseClient } = require('../../src/config/supabase');
        getSupabaseClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      // Arrange
      delete process.env['SUPABASE_ANON_KEY'];

      // Act & Assert
      expect(() => {
        const { getSupabaseClient } = require('../../src/config/supabase');
        getSupabaseClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should throw error when SUPABASE_ANON_KEY is empty', () => {
      // Arrange
      process.env['SUPABASE_ANON_KEY'] = '';

      // Act & Assert
      expect(() => {
        const { getSupabaseClient } = require('../../src/config/supabase');
        getSupabaseClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      // Arrange
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      // Act & Assert
      expect(() => {
        const { getSupabaseAdminClient } = require('../../src/config/supabase');
        getSupabaseAdminClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is empty', () => {
      // Arrange
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = '';

      // Act & Assert
      expect(() => {
        const { getSupabaseAdminClient } = require('../../src/config/supabase');
        getSupabaseAdminClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should accept optional SUPABASE_DATABASE_URL', () => {
      // Arrange
      process.env['SUPABASE_DATABASE_URL'] = 'postgresql://user:pass@host:5432/db';

      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert
      expect(supabaseConfig.databaseUrl).toBe('postgresql://user:pass@host:5432/db');
    });

    it('should validate SUPABASE_DATABASE_URL is a valid URL when provided', () => {
      // Arrange
      process.env['SUPABASE_DATABASE_URL'] = 'not-a-valid-url';

      // Act & Assert
      expect(() => {
        const { getSupabaseClient } = require('../../src/config/supabase');
        getSupabaseClient();
      }).toThrow('Invalid Supabase configuration');
    });

    it('should work without SUPABASE_DATABASE_URL', () => {
      // Arrange
      delete process.env['SUPABASE_DATABASE_URL'];

      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert
      expect(supabaseConfig.databaseUrl).toBeUndefined();
    });
  });

  // ==========================================================================
  // Client Initialization Tests
  // ==========================================================================

  describe('getSupabaseClient', () => {
    it('should create client with anon key and correct options', () => {
      // Act
      const { getSupabaseClient } = require('../../src/config/supabase');
      getSupabaseClient();

      // Assert
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-anon-key-1234567890',
        {
          auth: {
            persistSession: false,
          },
        }
      );
    });

    it('should return cached client on subsequent calls', () => {
      // Arrange
      const { getSupabaseClient } = require('../../src/config/supabase');

      // Act
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      // Assert
      expect(client1).toBe(client2);
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should disable session persistence for server-side use', () => {
      // Act
      const { getSupabaseClient } = require('../../src/config/supabase');
      getSupabaseClient();

      // Assert
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          auth: {
            persistSession: false,
          },
        })
      );
    });
  });

  describe('getSupabaseAdminClient', () => {
    it('should create admin client with service role key', () => {
      // Act
      const { getSupabaseAdminClient } = require('../../src/config/supabase');
      getSupabaseAdminClient();

      // Assert
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test-project.supabase.co',
        'test-service-role-key-1234567890',
        {
          auth: {
            persistSession: false,
          },
        }
      );
    });

    it('should return cached admin client on subsequent calls', () => {
      // Arrange
      const { getSupabaseAdminClient } = require('../../src/config/supabase');

      // Act
      const client1 = getSupabaseAdminClient();
      const client2 = getSupabaseAdminClient();

      // Assert
      expect(client1).toBe(client2);
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should maintain separate instances for anon and admin clients', () => {
      // Arrange
      // Create different mock clients for anon and admin
      const mockAnonClient = {
        storage: { listBuckets: jest.fn() },
      };
      const mockAdminClient = {
        storage: { listBuckets: jest.fn() },
      };

      mockCreateClient
        .mockReturnValueOnce(mockAnonClient)
        .mockReturnValueOnce(mockAdminClient);

      const { getSupabaseClient, getSupabaseAdminClient } = require('../../src/config/supabase');

      // Act
      const anonClient = getSupabaseClient();
      const adminClient = getSupabaseAdminClient();

      // Assert
      expect(anonClient).not.toBe(adminClient);
      expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Configuration Object Tests
  // ==========================================================================

  describe('supabaseConfig', () => {
    it('should expose URL getter', () => {
      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert
      expect(supabaseConfig.url).toBe('https://test-project.supabase.co');
    });

    it('should expose anonKey getter', () => {
      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert
      expect(supabaseConfig.anonKey).toBe('test-anon-key-1234567890');
    });

    it('should expose serviceRoleKey getter', () => {
      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert
      expect(supabaseConfig.serviceRoleKey).toBe('test-service-role-key-1234567890');
    });

    it('should be readonly (as const)', () => {
      // Act
      const { supabaseConfig } = require('../../src/config/supabase');

      // Assert - TypeScript would prevent this at compile time
      // Runtime test to ensure the object structure
      expect(supabaseConfig).toHaveProperty('url');
      expect(supabaseConfig).toHaveProperty('anonKey');
      expect(supabaseConfig).toHaveProperty('serviceRoleKey');
    });
  });

  // ==========================================================================
  // Reset Clients Tests
  // ==========================================================================

  describe('resetSupabaseClients', () => {
    it('should clear cached client instances', () => {
      // Arrange
      const { getSupabaseClient, resetSupabaseClients } = require('../../src/config/supabase');
      getSupabaseClient();
      mockCreateClient.mockClear();

      // Act
      resetSupabaseClients();
      getSupabaseClient();

      // Assert
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
    });

    it('should force fresh connection on next access', () => {
      // Arrange
      // Create different mock clients for before and after reset
      const mockClient1 = { storage: { listBuckets: jest.fn() } };
      const mockAdminClient1 = { storage: { listBuckets: jest.fn() } };
      const mockClient2 = { storage: { listBuckets: jest.fn() } };
      const mockAdminClient2 = { storage: { listBuckets: jest.fn() } };

      mockCreateClient
        .mockReturnValueOnce(mockClient1)
        .mockReturnValueOnce(mockAdminClient1)
        .mockReturnValueOnce(mockClient2)
        .mockReturnValueOnce(mockAdminClient2);

      const { getSupabaseClient, getSupabaseAdminClient, resetSupabaseClients } = require('../../src/config/supabase');
      const client1 = getSupabaseClient();
      const adminClient1 = getSupabaseAdminClient();

      // Act
      resetSupabaseClients();
      const client2 = getSupabaseClient();
      const adminClient2 = getSupabaseAdminClient();

      // Assert
      expect(client1).not.toBe(client2);
      expect(adminClient1).not.toBe(adminClient2);
    });
  });

  // ==========================================================================
  // Connection Testing Tests
  // ==========================================================================

  describe('testSupabaseConnection', () => {
    it('should successfully test connection with valid credentials', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: [{ name: 'uploads' }, { name: 'avatars' }],
        error: null,
      });

      // Act
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await testSupabaseConnection();

      // Assert
      expect(mockListBuckets).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✓ Supabase connected successfully');
      expect(console.log).toHaveBeenCalledWith('  Available buckets: uploads, avatars');
    });

    it('should throw error when connection fails', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: null,
        error: { message: 'Authentication failed' },
      });

      // Act & Assert
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await expect(testSupabaseConnection()).rejects.toThrow(
        'Supabase connection failed: Authentication failed'
      );
    });

    it('should throw error when no data returned', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await expect(testSupabaseConnection()).rejects.toThrow(
        'Supabase connection failed: No data returned'
      );
    });

    it('should handle error objects without message property', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: null,
        error: { code: 'NETWORK_ERROR' },
      });

      // Act & Assert
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await expect(testSupabaseConnection()).rejects.toThrow(
        'Supabase connection failed: Unknown error'
      );
    });

    it('should use anon client for connection test', async () => {
      // Arrange
      const { testSupabaseConnection } = require('../../src/config/supabase');

      // Act
      await testSupabaseConnection();

      // Assert
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        'test-anon-key-1234567890', // Uses anon key, not service role
        expect.any(Object)
      );
    });

    it('should list available bucket names', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: [
          { name: 'uploads' },
          { name: 'avatars' },
          { name: 'documents' },
        ],
        error: null,
      });

      // Act
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await testSupabaseConnection();

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '  Available buckets: uploads, avatars, documents'
      );
    });

    it('should handle empty bucket list', async () => {
      // Arrange
      mockListBuckets.mockResolvedValue({
        data: [],
        error: null,
      });

      // Act
      const { testSupabaseConnection } = require('../../src/config/supabase');
      await testSupabaseConnection();

      // Assert
      expect(console.log).toHaveBeenCalledWith('✓ Supabase connected successfully');
      expect(console.log).toHaveBeenCalledWith('  Available buckets: ');
    });
  });

  // ==========================================================================
  // Default Export Tests
  // ==========================================================================

  describe('default export', () => {
    it('should export all functions and config', () => {
      // Act
      const supabase = require('../../src/config/supabase').default;

      // Assert
      expect(supabase).toHaveProperty('getClient');
      expect(supabase).toHaveProperty('getAdminClient');
      expect(supabase).toHaveProperty('config');
      expect(supabase).toHaveProperty('testConnection');
      expect(supabase).toHaveProperty('resetClients');
    });

    it('should have getClient function that works', () => {
      // Act
      const supabase = require('../../src/config/supabase').default;
      const client = supabase.getClient();

      // Assert
      expect(client).toBeDefined();
      expect(mockCreateClient).toHaveBeenCalled();
    });

    it('should have config object with correct properties', () => {
      // Act
      const supabase = require('../../src/config/supabase').default;

      // Assert
      expect(supabase.config.url).toBe('https://test-project.supabase.co');
      expect(supabase.config.anonKey).toBe('test-anon-key-1234567890');
      expect(supabase.config.serviceRoleKey).toBe('test-service-role-key-1234567890');
    });
  });
});
