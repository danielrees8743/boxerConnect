// Boxer Controller Unit Tests
// Tests for boxer controller HTTP request handling with gym owner authorization

import { Response, NextFunction } from 'express';
import { updateBoxer } from '../../src/controllers/boxer.controller';
import * as boxerService from '../../src/services/boxer.service';
import * as coachService from '../../src/services/coach.service';
import * as clubService from '../../src/services/club.service';
import * as matchingService from '../../src/services/matching.service';
import { CoachPermission } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../../src/middleware';
import { createMockBoxer } from '../utils/testUtils';
import type { AuthenticatedUserRequest } from '../../src/types';

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('../../src/services/boxer.service');
jest.mock('../../src/services/coach.service');
jest.mock('../../src/services/club.service');
jest.mock('../../src/services/matching.service');
jest.mock('../../src/validators/boxer.validators', () => ({
  boxerIdSchema: {
    parse: jest.fn((params) => params),
  },
  updateBoxerSchema: {
    parse: jest.fn((body) => body),
  },
}));

// ============================================================================
// Test Suites
// ============================================================================

describe('Boxer Controller - updateBoxer', () => {
  let mockRequest: Partial<AuthenticatedUserRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  // ==========================================================================
  // Gym Owner Authorization Tests
  // ==========================================================================

  describe('Gym Owner Authorization', () => {
    it('should allow gym owner to update boxer in their club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const updateData = { name: 'Updated Boxer Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
        clubId,
      });

      const updatedBoxer = { ...mockBoxer, ...updateData };

      mockRequest = {
        user: {
          userId: gymOwnerId,
          role: 'GYM_OWNER',
          email: 'gymowner@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      // Mock service calls
      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (clubService.isClubOwner as jest.Mock).mockResolvedValue(true);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue(updatedBoxer);
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(clubService.isClubOwner).toHaveBeenCalledWith(gymOwnerId, clubId);
      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        gymOwnerId,
        'GYM_OWNER',
        updateData,
        { skipOwnershipCheck: true }
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Boxer profile updated successfully',
          data: expect.objectContaining({
            boxer: updatedBoxer,
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny gym owner from updating boxer NOT in their club', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const updateData = { name: 'Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
        clubId,
      });

      mockRequest = {
        user: {
          userId: gymOwnerId,
          role: 'GYM_OWNER',
          email: 'gymowner@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (clubService.isClubOwner as jest.Mock).mockResolvedValue(false); // Not owner of this club

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(clubService.isClubOwner).toHaveBeenCalledWith(gymOwnerId, clubId);
      expect(boxerService.updateBoxer).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Not authorized to update this profile');
    });

    it('should deny gym owner from updating boxer without clubId', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerId = 'boxer-1';
      const updateData = { name: 'Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
        clubId: null, // No club association
      });

      mockRequest = {
        user: {
          userId: gymOwnerId,
          role: 'GYM_OWNER',
          email: 'gymowner@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(clubService.isClubOwner).not.toHaveBeenCalled();
      expect(boxerService.updateBoxer).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Not authorized to update this profile');
    });

    it('should invalidate match cache after gym owner updates boxer', async () => {
      const gymOwnerId = 'gym-owner-1';
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const updateData = { weightKg: 80 };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
        clubId,
      });

      mockRequest = {
        user: {
          userId: gymOwnerId,
          role: 'GYM_OWNER',
          email: 'gymowner@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (clubService.isClubOwner as jest.Mock).mockResolvedValue(true);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(matchingService.invalidateMatchCache).toHaveBeenCalledWith(boxerId);
    });
  });

  // ==========================================================================
  // Existing Authorization Tests
  // ==========================================================================

  describe('Existing Authorization', () => {
    it('should allow boxer owner to update their own profile', async () => {
      const userId = 'boxer-user-1';
      const boxerId = 'boxer-1';
      const updateData = { name: 'My Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId,
      });

      mockRequest = {
        user: {
          userId,
          role: 'BOXER',
          email: 'boxer@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        userId,
        'BOXER',
        updateData,
        { skipOwnershipCheck: false }
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow coach with EDIT_PROFILE permission to update linked boxer', async () => {
      const coachId = 'coach-1';
      const boxerId = 'boxer-1';
      const updateData = { name: 'Coach Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockRequest = {
        user: {
          userId: coachId,
          role: 'COACH',
          email: 'coach@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (coachService.hasPermission as jest.Mock).mockResolvedValue(true);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(coachService.hasPermission).toHaveBeenCalledWith(
        coachId,
        boxerId,
        CoachPermission.EDIT_PROFILE
      );
      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        coachId,
        'COACH',
        updateData,
        { skipOwnershipCheck: true }
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow coach with FULL_ACCESS permission to update linked boxer', async () => {
      const coachId = 'coach-1';
      const boxerId = 'boxer-1';
      const updateData = { bio: 'Updated bio' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockRequest = {
        user: {
          userId: coachId,
          role: 'COACH',
          email: 'coach@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      // First check EDIT_PROFILE returns false, but hasPermission includes FULL_ACCESS check
      (coachService.hasPermission as jest.Mock).mockResolvedValue(true);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        coachId,
        'COACH',
        updateData,
        { skipOwnershipCheck: true }
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny unauthorized user from updating boxer profile', async () => {
      const unauthorizedUserId = 'unauthorized-user';
      const boxerId = 'boxer-1';
      const updateData = { name: 'Unauthorized Update' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockRequest = {
        user: {
          userId: unauthorizedUserId,
          role: 'BOXER',
          email: 'unauthorized@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (coachService.hasPermission as jest.Mock).mockResolvedValue(false);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(boxerService.updateBoxer).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Not authorized to update this profile');
    });

    it('should deny coach without proper permission from updating boxer', async () => {
      const coachId = 'coach-1';
      const boxerId = 'boxer-1';
      const updateData = { name: 'Unauthorized Coach Update' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
      });

      mockRequest = {
        user: {
          userId: coachId,
          role: 'COACH',
          email: 'coach@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (coachService.hasPermission as jest.Mock).mockResolvedValue(false);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(boxerService.updateBoxer).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Not authorized to update this profile');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return 404 when boxer not found', async () => {
      const userId = 'user-1';
      const boxerId = 'non-existent-boxer';
      const updateData = { name: 'Updated Name' };

      mockRequest = {
        user: {
          userId,
          role: 'BOXER',
          email: 'user@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(null);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(boxerService.updateBoxer).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeDefined();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Boxer profile not found');
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-1';
      const boxerId = 'boxer-1';
      const updateData = { name: 'Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId,
      });

      mockRequest = {
        user: {
          userId,
          role: 'BOXER',
          email: 'user@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      const serviceError = new Error('Database connection error');
      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (boxerService.updateBoxer as jest.Mock).mockRejectedValue(serviceError);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  // ==========================================================================
  // Authorization Priority Tests
  // ==========================================================================

  describe('Authorization Priority', () => {
    it('should prioritize owner check before gym owner check', async () => {
      const userId = 'user-1';
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const updateData = { name: 'Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId, // User is the owner
        clubId,
      });

      mockRequest = {
        user: {
          userId,
          role: 'GYM_OWNER', // Also a gym owner
          email: 'owner@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      // Should not check club ownership since user is the owner
      expect(clubService.isClubOwner).not.toHaveBeenCalled();
      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        userId,
        'GYM_OWNER',
        updateData,
        { skipOwnershipCheck: false }
      );
    });

    it('should check coach permission before gym owner check', async () => {
      const coachId = 'coach-1';
      const boxerId = 'boxer-1';
      const clubId = 'club-1';
      const updateData = { name: 'Updated Name' };

      const mockBoxer = createMockBoxer({
        id: boxerId,
        userId: 'different-user-id',
        clubId,
      });

      mockRequest = {
        user: {
          userId: coachId,
          role: 'COACH',
          email: 'coach@test.com',
        },
        params: { id: boxerId },
        body: updateData,
      };

      (boxerService.getBoxerById as jest.Mock).mockResolvedValue(mockBoxer);
      (coachService.hasPermission as jest.Mock).mockResolvedValue(true);
      (boxerService.updateBoxer as jest.Mock).mockResolvedValue({ ...mockBoxer, ...updateData });
      (matchingService.invalidateMatchCache as jest.Mock).mockResolvedValue(undefined);

      await updateBoxer(
        mockRequest as AuthenticatedUserRequest,
        mockResponse as Response,
        mockNext
      );

      // Should not check club ownership since coach has permission
      expect(clubService.isClubOwner).not.toHaveBeenCalled();
      expect(boxerService.updateBoxer).toHaveBeenCalledWith(
        boxerId,
        coachId,
        'COACH',
        updateData,
        { skipOwnershipCheck: true }
      );
    });
  });
});
