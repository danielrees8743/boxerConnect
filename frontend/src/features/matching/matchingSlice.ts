import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { MatchSuggestion, CompatibleMatchOptions, ExperienceLevel } from '@/types';
import { matchingService } from '@/services/matchingService';

interface MatchingFilters {
  experienceLevel?: ExperienceLevel;
  minWeight?: number;
  maxWeight?: number;
  maxDistanceKm?: number;
  city?: string;
  country?: string;
}

interface MatchingState {
  compatibleMatches: MatchSuggestion[];
  suggestedMatches: MatchSuggestion[];
  nearbyMatches: MatchSuggestion[];
  filters: MatchingFilters;
  isLoading: boolean;
  isSuggestionsLoading: boolean;
  error: string | null;
}

const initialState: MatchingState = {
  compatibleMatches: [],
  suggestedMatches: [],
  nearbyMatches: [],
  filters: {},
  isLoading: false,
  isSuggestionsLoading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch compatible matches for a boxer
 */
export const fetchCompatibleMatches = createAsyncThunk<
  MatchSuggestion[],
  { boxerId: string; options?: CompatibleMatchOptions },
  { rejectValue: string }
>('matching/fetchCompatibleMatches', async ({ boxerId, options }, { rejectWithValue }) => {
  try {
    return await matchingService.getCompatibleMatches(boxerId, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch compatible matches';
    return rejectWithValue(message);
  }
});

/**
 * Fetch AI-suggested matches
 */
export const fetchSuggestedMatches = createAsyncThunk<
  MatchSuggestion[],
  number | undefined,
  { rejectValue: string }
>('matching/fetchSuggestedMatches', async (limit, { rejectWithValue }) => {
  try {
    return await matchingService.getSuggestedMatches(limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suggested matches';
    return rejectWithValue(message);
  }
});

/**
 * Fetch similar boxers
 */
export const fetchSimilarBoxers = createAsyncThunk<
  MatchSuggestion[],
  { boxerId: string; limit?: number },
  { rejectValue: string }
>('matching/fetchSimilarBoxers', async ({ boxerId, limit }, { rejectWithValue }) => {
  try {
    return await matchingService.getSimilarBoxers(boxerId, { limit });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch similar boxers';
    return rejectWithValue(message);
  }
});

/**
 * Fetch nearby boxers
 */
export const fetchNearbyBoxers = createAsyncThunk<
  MatchSuggestion[],
  { boxerId: string; maxDistanceKm?: number; limit?: number },
  { rejectValue: string }
>('matching/fetchNearbyBoxers', async ({ boxerId, maxDistanceKm, limit }, { rejectWithValue }) => {
  try {
    return await matchingService.getNearbyBoxers(boxerId, maxDistanceKm, limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch nearby boxers';
    return rejectWithValue(message);
  }
});

// ============================================================================
// Slice
// ============================================================================

const matchingSlice = createSlice({
  name: 'matching',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<MatchingFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMatches: (state) => {
      state.compatibleMatches = [];
      state.suggestedMatches = [];
      state.nearbyMatches = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch compatible matches
    builder
      .addCase(fetchCompatibleMatches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompatibleMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.compatibleMatches = action.payload;
      })
      .addCase(fetchCompatibleMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch compatible matches';
      });

    // Fetch suggested matches
    builder
      .addCase(fetchSuggestedMatches.pending, (state) => {
        state.isSuggestionsLoading = true;
        state.error = null;
      })
      .addCase(fetchSuggestedMatches.fulfilled, (state, action) => {
        state.isSuggestionsLoading = false;
        state.suggestedMatches = action.payload;
      })
      .addCase(fetchSuggestedMatches.rejected, (state, action) => {
        state.isSuggestionsLoading = false;
        state.error = action.payload ?? 'Failed to fetch suggested matches';
      });

    // Fetch similar boxers
    builder
      .addCase(fetchSimilarBoxers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSimilarBoxers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.compatibleMatches = action.payload;
      })
      .addCase(fetchSimilarBoxers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch similar boxers';
      });

    // Fetch nearby boxers
    builder
      .addCase(fetchNearbyBoxers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNearbyBoxers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearbyMatches = action.payload;
      })
      .addCase(fetchNearbyBoxers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch nearby boxers';
      });
  },
});

export const { setFilters, clearFilters, clearError, clearMatches } = matchingSlice.actions;

export default matchingSlice.reducer;
