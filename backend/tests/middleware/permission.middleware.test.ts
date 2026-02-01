// Permission Middleware Tests
// Tests for route-level permission checking middleware

import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { Permission } from '../../src/permissions';
import { AuthenticatedRequest } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the permission service
jest.mock('../../src/services/permission.service', () => ({
  hasPermission: jest.fn(),
  hasAnyPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
}));

// Import after mocking
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from '../../src/middleware/permission.middleware';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '../../src/services/permission.service';

const mockHasPermission = hasPermission as jest.Mock;
const mockHasAnyPermission = hasAnyPermission as jest.Mock;
const mockHasAllPermissions = hasAllPermissions as jest.Mock;

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

describe('Permission Middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  // ============================================================================
  // requirePermission Tests
  // ============================================================================

  describe('requirePermission', () => {
    it('should call next() when permission is granted', async () => {
      mockHasPermission.mockResolvedValue({ allowed: true });

      const middleware = requirePermission(Permission.BOXER_CREATE_PROFILE);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockHasPermission).toHaveBeenCalledWith(
        { userId: 'user-1', role: UserRole.BOXER },
        Permission.BOXER_CREATE_PROFILE,
        undefined
      );
    });

    it('should call next() with ForbiddenError when permission is denied', async () => {
      mockHasPermission.mockResolvedValue({
        allowed: false,
        reason: 'Permission denied',
      });

      const middleware = requirePermission(Permission.ADMIN_VERIFY_BOXER);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Permission denied',
        })
      );
    });

    it('should call next() with UnauthorizedError when user is not authenticated', async () => {
      const middleware = requirePermission(Permission.BOXER_CREATE_PROFILE);
      // Create request without user property
      const req = { params: {} } as AuthenticatedRequest;
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
      expect(mockHasPermission).not.toHaveBeenCalled();
    });

    it('should pass resource context when options are provided', async () => {
      mockHasPermission.mockResolvedValue({ allowed: true });

      const middleware = requirePermission(Permission.CLUB_MEMBER_ADD_BOXER, {
        resourceIdParam: 'id',
        resourceType: 'club',
      });
      const req = createMockRequest({
        user: { userId: 'owner-1', email: 'owner@example.com', role: UserRole.GYM_OWNER },
        params: { id: 'club-123' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(
        { userId: 'owner-1', role: UserRole.GYM_OWNER },
        Permission.CLUB_MEMBER_ADD_BOXER,
        { resourceType: 'club', resourceId: 'club-123' }
      );
    });

    it('should use custom error message when provided', async () => {
      mockHasPermission.mockResolvedValue({
        allowed: false,
        reason: 'Default reason',
      });

      const middleware = requirePermission(Permission.ADMIN_VERIFY_BOXER, {
        errorMessage: 'Custom error message',
      });
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom error message',
        })
      );
    });
  });

  // ============================================================================
  // requireAnyPermission Tests
  // ============================================================================

  describe('requireAnyPermission', () => {
    it('should call next() when any permission is granted', async () => {
      mockHasAnyPermission.mockResolvedValue({ allowed: true });

      const middleware = requireAnyPermission([
        Permission.BOXER_UPDATE_OWN_PROFILE,
        Permission.BOXER_UPDATE_LINKED_PROFILE,
      ]);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with error when no permission is granted', async () => {
      mockHasAnyPermission.mockResolvedValue({
        allowed: false,
        reason: 'No permission granted',
      });

      const middleware = requireAnyPermission([
        Permission.ADMIN_VERIFY_BOXER,
        Permission.CLUB_SET_OWNER,
      ]);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No permission granted',
        })
      );
    });

    it('should pass resource context when options are provided', async () => {
      mockHasAnyPermission.mockResolvedValue({ allowed: true });

      const middleware = requireAnyPermission(
        [Permission.BOXER_UPDATE_OWN_PROFILE, Permission.BOXER_UPDATE_LINKED_PROFILE],
        { resourceIdParam: 'id', resourceType: 'boxer' }
      );
      const req = createMockRequest({
        params: { id: 'boxer-123' },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockHasAnyPermission).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { resourceType: 'boxer', resourceId: 'boxer-123' }
      );
    });
  });

  // ============================================================================
  // requireAllPermissions Tests
  // ============================================================================

  describe('requireAllPermissions', () => {
    it('should call next() when all permissions are granted', async () => {
      mockHasAllPermissions.mockResolvedValue({ allowed: true });

      const middleware = requireAllPermissions([
        Permission.ADMIN_READ_ALL_USERS,
        Permission.ADMIN_UPDATE_USER_STATUS,
      ]);
      const req = createMockRequest({
        user: { userId: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN },
      });
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() with error when not all permissions are granted', async () => {
      mockHasAllPermissions.mockResolvedValue({
        allowed: false,
        reason: 'Missing permissions',
      });

      const middleware = requireAllPermissions([
        Permission.ADMIN_READ_ALL_USERS,
        Permission.ADMIN_UPDATE_USER_STATUS,
      ]);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing permissions',
        })
      );
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error handling', () => {
    it('should pass errors to next() when service throws', async () => {
      mockHasPermission.mockRejectedValue(new Error('Service error'));

      const middleware = requirePermission(Permission.BOXER_CREATE_PROFILE);
      const req = createMockRequest();
      const res = createMockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service error',
        })
      );
    });
  });
});
