import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gymOwnerService } from '@/services/gymOwnerService';
import type { Club, BoxerProfile, User } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface ClubCoach {
  id: string;
  coachUserId: string;
  isHead: boolean;
  coach: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface ClubWithMembers extends Club {
  owner: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  boxers: Pick<BoxerProfile, 'id' | 'name' | 'userId' | 'weightKg' | 'experienceLevel' | 'wins' | 'losses' | 'draws'>[];
  coaches: ClubCoach[];
}

export interface GymOwnerStats {
  totalClubs: number;
  totalBoxers: number;
  totalCoaches: number;
  pendingMatchRequests: number;
}

interface GymOwnerState {
  ownedClubs: Club[];
  selectedClub: ClubWithMembers | null;
  stats: GymOwnerStats | null;
  clubsLoading: boolean;
  clubsError: string | null;
  selectedClubLoading: boolean;
  selectedClubError: string | null;
  statsLoading: boolean;
  statsError: string | null;
}

const initialState: GymOwnerState = {
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

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch clubs owned by the authenticated gym owner
 */
export const fetchMyClubs = createAsyncThunk(
  'gymOwner/fetchMyClubs',
  async (_, { rejectWithValue }) => {
    try {
      return await gymOwnerService.getMyClubs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch clubs';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch a specific club with all its members (boxers and coaches)
 */
export const fetchClubWithMembers = createAsyncThunk(
  'gymOwner/fetchClubWithMembers',
  async (clubId: string, { rejectWithValue }) => {
    try {
      return await gymOwnerService.getClubWithMembers(clubId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch club details';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch gym owner dashboard statistics
 */
export const fetchGymOwnerStats = createAsyncThunk(
  'gymOwner/fetchStats',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get clubs from state or fetch them first
      const state = getState() as { gymOwner: GymOwnerState };
      let clubs = state.gymOwner.ownedClubs;

      // If no clubs in state, fetch them
      if (clubs.length === 0) {
        clubs = await gymOwnerService.getMyClubs();
      }

      // Fetch all club details to aggregate stats
      const clubDetails = await Promise.all(
        clubs.map(club => gymOwnerService.getClubWithMembers(club.id))
      );

      // Calculate stats
      const totalBoxers = clubDetails.reduce((sum, club) => sum + club.boxers.length, 0);
      const totalCoaches = clubDetails.reduce((sum, club) => sum + club.coaches.length, 0);

      // Note: pendingMatchRequests would need to be fetched from match requests API
      // For now, set to 0 as a placeholder
      const stats: GymOwnerStats = {
        totalClubs: clubs.length,
        totalBoxers,
        totalCoaches,
        pendingMatchRequests: 0,
      };

      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const gymOwnerSlice = createSlice({
  name: 'gymOwner',
  initialState,
  reducers: {
    clearSelectedClub(state) {
      state.selectedClub = null;
      state.selectedClubError = null;
    },
    clearClubsError(state) {
      state.clubsError = null;
    },
    clearSelectedClubError(state) {
      state.selectedClubError = null;
    },
    clearStatsError(state) {
      state.statsError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch My Clubs
    builder
      .addCase(fetchMyClubs.pending, (state) => {
        state.clubsLoading = true;
        state.clubsError = null;
      })
      .addCase(fetchMyClubs.fulfilled, (state, action) => {
        state.clubsLoading = false;
        state.ownedClubs = action.payload;
      })
      .addCase(fetchMyClubs.rejected, (state, action) => {
        state.clubsLoading = false;
        state.clubsError = action.payload as string;
      });

    // Fetch Club With Members
    builder
      .addCase(fetchClubWithMembers.pending, (state) => {
        state.selectedClubLoading = true;
        state.selectedClubError = null;
      })
      .addCase(fetchClubWithMembers.fulfilled, (state, action) => {
        state.selectedClubLoading = false;
        state.selectedClub = action.payload;
      })
      .addCase(fetchClubWithMembers.rejected, (state, action) => {
        state.selectedClubLoading = false;
        state.selectedClubError = action.payload as string;
      });

    // Fetch Gym Owner Stats
    builder
      .addCase(fetchGymOwnerStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchGymOwnerStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchGymOwnerStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      });
  },
});

export const {
  clearSelectedClub,
  clearClubsError,
  clearSelectedClubError,
  clearStatsError,
} = gymOwnerSlice.actions;

export default gymOwnerSlice.reducer;
