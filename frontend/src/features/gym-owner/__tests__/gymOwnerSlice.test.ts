// Gym Owner Redux Slice Tests
// Tests for gym owner state management, thunks, and reducers

import { describe, it, expect, beforeEach, vi } from 'vitest';
import gymOwnerReducer, {
  fetchMyClubs,
  fetchClubWithMembers,
  fetchGymOwnerStats,
  clearSelectedClub,
  clearClubsError,
  clearSelectedClubError,
  clearStatsError,
} from '../gymOwnerSlice';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { Club } from '@/types';
import type { ClubWithMembers, GymOwnerStats } from '../gymOwnerSlice';

// Mock the service
vi.mock('@/services/gymOwnerService', () => ({
  gymOwnerService: {
    getMyClubs: vi.fn(),
    getClubWithMembers: vi.fn(),
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

function createMockClubWithMembers(overrides: Partial<ClubWithMembers> = {}): ClubWithMembers {
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
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('gymOwnerSlice', () => {
  const initialState = {
    ownedClubs: [],
    selectedClub: null,
    stats: null,
    clubsLoading: false,
    clubsError: null,
    selectedClubLoading: false,
    selectedClubError: null,
    statsLoading: false,
    statsError: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Reducer Tests
  // ==========================================================================

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(gymOwnerReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle clearSelectedClub', () => {
      const stateWithSelectedClub = {
        ...initialState,
        selectedClub: createMockClubWithMembers(),
        selectedClubError: 'Some error',
      };

      const newState = gymOwnerReducer(stateWithSelectedClub, clearSelectedClub());

      expect(newState.selectedClub).toBeNull();
      expect(newState.selectedClubError).toBeNull();
    });

    it('should handle clearClubsError', () => {
      const stateWithError = {
        ...initialState,
        clubsError: 'Failed to fetch clubs',
      };

      const newState = gymOwnerReducer(stateWithError, clearClubsError());

      expect(newState.clubsError).toBeNull();
    });

    it('should handle clearSelectedClubError', () => {
      const stateWithError = {
        ...initialState,
        selectedClubError: 'Failed to fetch club details',
      };

      const newState = gymOwnerReducer(stateWithError, clearSelectedClubError());

      expect(newState.selectedClubError).toBeNull();
    });

    it('should handle clearStatsError', () => {
      const stateWithError = {
        ...initialState,
        statsError: 'Failed to fetch stats',
      };

      const newState = gymOwnerReducer(stateWithError, clearStatsError());

      expect(newState.statsError).toBeNull();
    });
  });

  // ==========================================================================
  // fetchMyClubs Thunk Tests
  // ==========================================================================

  describe('fetchMyClubs', () => {
    it('should handle pending state', () => {
      const action = { type: fetchMyClubs.pending.type };
      const state = gymOwnerReducer(initialState, action);

      expect(state.clubsLoading).toBe(true);
      expect(state.clubsError).toBeNull();
    });

    it('should handle fulfilled state with clubs', () => {
      const mockClubs = [
        createMockClub({ id: 'club-1', name: 'Club One' }),
        createMockClub({ id: 'club-2', name: 'Club Two' }),
      ];

      const action = { type: fetchMyClubs.fulfilled.type, payload: mockClubs };
      const state = gymOwnerReducer(initialState, action);

      expect(state.clubsLoading).toBe(false);
      expect(state.ownedClubs).toEqual(mockClubs);
      expect(state.clubsError).toBeNull();
    });

    it('should handle fulfilled state with empty clubs', () => {
      const action = { type: fetchMyClubs.fulfilled.type, payload: [] };
      const state = gymOwnerReducer(initialState, action);

      expect(state.clubsLoading).toBe(false);
      expect(state.ownedClubs).toEqual([]);
    });

    it('should handle rejected state', () => {
      const errorMessage = 'Failed to fetch clubs';
      const action = { type: fetchMyClubs.rejected.type, payload: errorMessage };
      const state = gymOwnerReducer(initialState, action);

      expect(state.clubsLoading).toBe(false);
      expect(state.clubsError).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // fetchClubWithMembers Thunk Tests
  // ==========================================================================

  describe('fetchClubWithMembers', () => {
    it('should handle pending state', () => {
      const action = { type: fetchClubWithMembers.pending.type };
      const state = gymOwnerReducer(initialState, action);

      expect(state.selectedClubLoading).toBe(true);
      expect(state.selectedClubError).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const mockClubWithMembers = createMockClubWithMembers();

      const action = { type: fetchClubWithMembers.fulfilled.type, payload: mockClubWithMembers };
      const state = gymOwnerReducer(initialState, action);

      expect(state.selectedClubLoading).toBe(false);
      expect(state.selectedClub).toEqual(mockClubWithMembers);
      expect(state.selectedClubError).toBeNull();
    });

    it('should handle rejected state', () => {
      const errorMessage = 'Club not found';
      const action = { type: fetchClubWithMembers.rejected.type, payload: errorMessage };
      const state = gymOwnerReducer(initialState, action);

      expect(state.selectedClubLoading).toBe(false);
      expect(state.selectedClubError).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // fetchGymOwnerStats Thunk Tests
  // ==========================================================================

  describe('fetchGymOwnerStats', () => {
    it('should handle pending state', () => {
      const action = { type: fetchGymOwnerStats.pending.type };
      const state = gymOwnerReducer(initialState, action);

      expect(state.statsLoading).toBe(true);
      expect(state.statsError).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const mockStats: GymOwnerStats = {
        totalClubs: 2,
        totalBoxers: 15,
        totalCoaches: 4,
        pendingMatchRequests: 0,
      };

      const action = { type: fetchGymOwnerStats.fulfilled.type, payload: mockStats };
      const state = gymOwnerReducer(initialState, action);

      expect(state.statsLoading).toBe(false);
      expect(state.stats).toEqual(mockStats);
      expect(state.statsError).toBeNull();
    });

    it('should handle rejected state', () => {
      const errorMessage = 'Failed to fetch stats';
      const action = { type: fetchGymOwnerStats.rejected.type, payload: errorMessage };
      const state = gymOwnerReducer(initialState, action);

      expect(state.statsLoading).toBe(false);
      expect(state.statsError).toBe(errorMessage);
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should maintain other state when fetching clubs', () => {
      const stateWithSelectedClub = {
        ...initialState,
        selectedClub: createMockClubWithMembers(),
      };

      const action = { type: fetchMyClubs.pending.type };
      const state = gymOwnerReducer(stateWithSelectedClub, action);

      expect(state.selectedClub).toEqual(stateWithSelectedClub.selectedClub);
      expect(state.clubsLoading).toBe(true);
    });

    it('should clear previous error when retrying fetch', () => {
      const stateWithError = {
        ...initialState,
        clubsError: 'Previous error',
      };

      const action = { type: fetchMyClubs.pending.type };
      const state = gymOwnerReducer(stateWithError, action);

      expect(state.clubsError).toBeNull();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle clubs with no members', () => {
      const clubWithNoMembers = createMockClubWithMembers({
        boxers: [],
        coaches: [],
      });

      const action = { type: fetchClubWithMembers.fulfilled.type, payload: clubWithNoMembers };
      const state = gymOwnerReducer(initialState, action);

      expect(state.selectedClub?.boxers).toEqual([]);
      expect(state.selectedClub?.coaches).toEqual([]);
    });

    it('should handle clubs with null owner', () => {
      const clubWithNullOwner = createMockClubWithMembers({
        owner: null,
      });

      const action = { type: fetchClubWithMembers.fulfilled.type, payload: clubWithNullOwner };
      const state = gymOwnerReducer(initialState, action);

      expect(state.selectedClub?.owner).toBeNull();
    });

    it('should handle zero stats', () => {
      const zeroStats: GymOwnerStats = {
        totalClubs: 0,
        totalBoxers: 0,
        totalCoaches: 0,
        pendingMatchRequests: 0,
      };

      const action = { type: fetchGymOwnerStats.fulfilled.type, payload: zeroStats };
      const state = gymOwnerReducer(initialState, action);

      expect(state.stats).toEqual(zeroStats);
    });
  });
});
