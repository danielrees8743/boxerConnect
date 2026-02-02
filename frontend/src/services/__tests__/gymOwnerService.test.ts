// Gym Owner Service Tests
// Tests for gym owner API service methods

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gymOwnerService } from '../gymOwnerService';
import { apiClient } from '../apiClient';
import type { Club } from '@/types';
import type { ClubWithMembers } from '@/features/gym-owner/gymOwnerSlice';

// Mock the API client
vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'test-club-id',
    name: 'Test Boxing Club',
    region: 'Test Region',
    address: '123 Test St',
    city: 'Test City',
    postcode: 'TE1 1ST',
    phone: '01234567890',
    email: 'test@club.com',
    website: 'https://testclub.com',
    latitude: 51.5074,
    longitude: -0.1278,
    ownerId: 'owner-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockClubWithMembers(): ClubWithMembers {
  return {
    ...createMockClub(),
    owner: {
      id: 'owner-id',
      name: 'Gym Owner',
      email: 'owner@test.com',
      role: 'GYM_OWNER',
    },
    boxers: [
      {
        id: 'boxer-1',
        name: 'Test Boxer',
        userId: 'user-1',
        weightKg: 75.5,
        experienceLevel: 'INTERMEDIATE',
        wins: 10,
        losses: 2,
        draws: 1,
      },
    ],
    coaches: [
      {
        id: 'coach-rel-1',
        coachUserId: 'coach-1',
        isHead: true,
        coach: {
          id: 'coach-1',
          name: 'Test Coach',
          email: 'coach@test.com',
          role: 'COACH',
        },
      },
    ],
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('gymOwnerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // getMyClubs Tests
  // ==========================================================================

  describe('getMyClubs', () => {
    it('should fetch clubs successfully', async () => {
      const mockClubs = [
        createMockClub({ id: 'club-1', name: 'Club One' }),
        createMockClub({ id: 'club-2', name: 'Club Two' }),
      ];

      const mockResponse = {
        data: {
          success: true,
          data: { clubs: mockClubs },
          message: 'Clubs retrieved successfully',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gymOwnerService.getMyClubs();

      expect(apiClient.get).toHaveBeenCalledWith('/clubs/my-clubs');
      expect(result).toEqual(mockClubs);
    });

    it('should return empty array if no clubs in response', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: null,
          message: 'No clubs found',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gymOwnerService.getMyClubs();

      expect(result).toEqual([]);
    });

    it('should return empty array if clubs array is missing', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {},
          message: 'Clubs retrieved successfully',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gymOwnerService.getMyClubs();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(gymOwnerService.getMyClubs()).rejects.toThrow('Network error');
    });

    it('should handle 403 Forbidden errors for non-gym-owners', async () => {
      const error = {
        response: {
          status: 403,
          data: {
            success: false,
            message: 'Only gym owners can access this endpoint',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(gymOwnerService.getMyClubs()).rejects.toEqual(error);
    });
  });

  // ==========================================================================
  // getClubWithMembers Tests
  // ==========================================================================

  describe('getClubWithMembers', () => {
    it('should fetch club with members successfully', async () => {
      const clubId = 'test-club-id';
      const mockClubWithMembers = createMockClubWithMembers();

      const mockResponse = {
        data: {
          success: true,
          data: { club: mockClubWithMembers },
          message: 'Club members retrieved successfully',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gymOwnerService.getClubWithMembers(clubId);

      expect(apiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/members`);
      expect(result).toEqual(mockClubWithMembers);
      expect(result.boxers).toHaveLength(1);
      expect(result.coaches).toHaveLength(1);
    });

    it('should throw error if club not found', async () => {
      const clubId = 'non-existent-club';

      const mockResponse = {
        data: {
          success: false,
          data: null,
          message: 'Club not found',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await expect(gymOwnerService.getClubWithMembers(clubId)).rejects.toThrow('Club not found');
    });

    it('should throw error if club data is missing', async () => {
      const clubId = 'test-club-id';

      const mockResponse = {
        data: {
          success: true,
          data: null,
          message: 'Success',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await expect(gymOwnerService.getClubWithMembers(clubId)).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const clubId = 'test-club-id';
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(gymOwnerService.getClubWithMembers(clubId)).rejects.toThrow('Network error');
    });

    it('should handle 404 Not Found errors', async () => {
      const clubId = 'non-existent-club';
      const error = {
        response: {
          status: 404,
          data: {
            success: false,
            message: 'Club not found',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(gymOwnerService.getClubWithMembers(clubId)).rejects.toEqual(error);
    });

    it('should handle clubs with no members', async () => {
      const clubId = 'empty-club-id';
      const mockClubWithNoMembers = {
        ...createMockClub({ id: clubId }),
        owner: null,
        boxers: [],
        coaches: [],
      };

      const mockResponse = {
        data: {
          success: true,
          data: { club: mockClubWithNoMembers },
          message: 'Club members retrieved successfully',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await gymOwnerService.getClubWithMembers(clubId);

      expect(result.boxers).toEqual([]);
      expect(result.coaches).toEqual([]);
      expect(result.owner).toBeNull();
    });
  });

  // ==========================================================================
  // API Endpoint Tests
  // ==========================================================================

  describe('API endpoint calls', () => {
    it('should call correct endpoint for getMyClubs', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { clubs: [] },
          message: 'Success',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await gymOwnerService.getMyClubs();

      expect(apiClient.get).toHaveBeenCalledWith('/clubs/my-clubs');
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should call correct endpoint for getClubWithMembers with ID', async () => {
      const clubId = 'abc-123-def';
      const mockClubWithMembers = createMockClubWithMembers();

      const mockResponse = {
        data: {
          success: true,
          data: { club: mockClubWithMembers },
          message: 'Success',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      await gymOwnerService.getClubWithMembers(clubId);

      expect(apiClient.get).toHaveBeenCalledWith(`/clubs/${clubId}/members`);
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });
});
