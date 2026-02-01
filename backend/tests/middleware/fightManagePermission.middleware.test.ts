// Fight Manage Permission Middleware Tests
// Tests for the requireFightManagePermission middleware

import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the errorHandler module to avoid the pre-existing TypeScript error in errorHandler.ts
class MockAppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
  }
}

class MockUnauthorizedError extends MockAppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

class MockForbiddenError extends MockAppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

jest.mock('../../src/middleware/errorHandler', () => ({
  AppError: MockAppError,
  UnauthorizedError: MockUnauthorizedError,
  ForbiddenError: MockForbiddenError,
}));

// Mock the permission service
jest.mock('../../src/services/permission.service', () => ({
  hasPermission: jest.fn(),
  hasAnyPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
  checkFightManagePermissionForBoxer: jest.fn(),
}));

// Import after mocking
import { requireFightManagePermission } from '../../src/middleware/permission.middleware';
import { checkFightManagePermissionForBoxer } from '../../src/services/permission.service';

const mockCheckFightManagePermission = checkFightManagePermissionForBoxer as jest.Mock;

// Helper to create mock request
function createMockRequest(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: {
      userId: 'user-1',
      email: 'test@example.com',
      role: UserRole.BOXER,
    },
    params: {},
    ...overrides,
  } as AuthenticatedRequest;
}

// Helper to create mock response
function createMockResponse(): Response {
  return {} as Response;
}

describe('requireFightManagePermission Middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication', () => {
    it('should call next with UnauthorizedError when user is not authenticated', async () => {
      const middleware = requireFightManagePermission('boxerId');
      // Create request without user property by using unknown first
      const req = { params: { boxerId: 'boxer-123' } } as unknown as AuthenticatedRequest;
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
      expect(mockCheckFightManagePermission).not.toHaveBeenCalled();
    });

    it('should proceed with permission check when user is authenticated', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: '550e8400-e29b-41d4-a716-446655440000' }, // Valid UUID
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Boxer ID Parameter Tests
  // ============================================================================

  describe('Boxer ID parameter validation', () => {
    it('should call next with ForbiddenError when boxerId param is missing', async () => {
      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: {}, // No boxerId
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Boxer ID is required',
        })
      );
      expect(mockCheckFightManagePermission).not.toHaveBeenCalled();
    });

    it('should call next with ForbiddenError for invalid UUID format', async () => {
      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: 'invalid-uuid' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid boxer ID format',
        })
      );
      expect(mockCheckFightManagePermission).not.toHaveBeenCalled();
    });

    it('should call next with ForbiddenError for empty string boxerId', async () => {
      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: '' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Boxer ID is required',
        })
      );
    });

    it('should accept valid UUID format', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use custom param name when provided', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('id'); // Custom param name
      const req = createMockRequest({
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        expect.anything(),
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should use default param name boxerId when not specified', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission(); // Default param name
      const req = createMockRequest({
        params: { boxerId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        expect.anything(),
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });
  });

  // ============================================================================
  // Permission Check Tests
  // ============================================================================

  describe('Permission checking', () => {
    const validBoxerId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call next() when permission is granted', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'coach-1', email: 'coach@example.com', role: UserRole.COACH },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        { userId: 'coach-1', role: UserRole.COACH },
        validBoxerId
      );
    });

    it('should call next with ForbiddenError when permission is denied', async () => {
      mockCheckFightManagePermission.mockResolvedValue({
        allowed: false,
        reason: 'You do not have permission to manage this boxer\'s fight history',
      });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'coach-1', email: 'coach@example.com', role: UserRole.COACH },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to manage this boxer\'s fight history',
        })
      );
    });

    it('should use default error message when reason is not provided', async () => {
      mockCheckFightManagePermission.mockResolvedValue({
        allowed: false,
      });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Not authorized'),
        })
      );
    });
  });

  // ============================================================================
  // Role-specific Tests
  // ============================================================================

  describe('Role-specific permission checks', () => {
    const validBoxerId = '550e8400-e29b-41d4-a716-446655440000';

    it('should pass correct context for BOXER role', async () => {
      mockCheckFightManagePermission.mockResolvedValue({
        allowed: false,
        reason: 'Boxers cannot manage their own fight history',
      });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'boxer-1', email: 'boxer@example.com', role: UserRole.BOXER },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        { userId: 'boxer-1', role: UserRole.BOXER },
        validBoxerId
      );
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Boxers cannot manage'),
        })
      );
    });

    it('should pass correct context for COACH role', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'coach-1', email: 'coach@example.com', role: UserRole.COACH },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        { userId: 'coach-1', role: UserRole.COACH },
        validBoxerId
      );
    });

    it('should pass correct context for GYM_OWNER role', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'owner-1', email: 'owner@example.com', role: UserRole.GYM_OWNER },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        { userId: 'owner-1', role: UserRole.GYM_OWNER },
        validBoxerId
      );
    });

    it('should pass correct context for ADMIN role', async () => {
      mockCheckFightManagePermission.mockResolvedValue({ allowed: true });

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        user: { userId: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN },
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockCheckFightManagePermission).toHaveBeenCalledWith(
        { userId: 'admin-1', role: UserRole.ADMIN },
        validBoxerId
      );
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error handling', () => {
    const validBoxerId = '550e8400-e29b-41d4-a716-446655440000';

    it('should pass errors to next() when permission service throws', async () => {
      mockCheckFightManagePermission.mockRejectedValue(new Error('Database error'));

      const middleware = requireFightManagePermission('boxerId');
      const req = createMockRequest({
        params: { boxerId: validBoxerId },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        })
      );
    });
  });
});
