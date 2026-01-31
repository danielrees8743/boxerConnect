import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  BoxerProfile,
  CreateBoxerData,
  UpdateBoxerData,
  BoxerSearchParams,
  PaginationInfo,
} from '@/types';
import { boxerService } from '@/services/boxerService';

interface BoxerState {
  boxers: BoxerProfile[];
  myBoxer: BoxerProfile | null;
  selectedBoxer: BoxerProfile | null;
  pagination: PaginationInfo | null;
  searchParams: BoxerSearchParams;
  isLoading: boolean;
  error: string | null;
}

const initialState: BoxerState = {
  boxers: [],
  myBoxer: null,
  selectedBoxer: null,
  pagination: null,
  searchParams: {},
  isLoading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Create a new boxer profile
 */
export const createBoxer = createAsyncThunk<
  BoxerProfile,
  CreateBoxerData,
  { rejectValue: string }
>('boxer/createBoxer', async (data, { rejectWithValue }) => {
  try {
    return await boxerService.createBoxer(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create boxer profile';
    return rejectWithValue(message);
  }
});

/**
 * Fetch the current user's boxer profile
 */
export const fetchMyBoxer = createAsyncThunk<
  BoxerProfile,
  void,
  { rejectValue: string }
>('boxer/fetchMyBoxer', async (_, { rejectWithValue }) => {
  try {
    return await boxerService.getMyBoxer();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch boxer profile';
    return rejectWithValue(message);
  }
});

/**
 * Fetch a boxer by ID
 */
export const fetchBoxerById = createAsyncThunk<
  BoxerProfile,
  string,
  { rejectValue: string }
>('boxer/fetchBoxerById', async (id, { rejectWithValue }) => {
  try {
    return await boxerService.getBoxer(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch boxer';
    return rejectWithValue(message);
  }
});

/**
 * Update a boxer profile
 */
export const updateBoxer = createAsyncThunk<
  BoxerProfile,
  { id: string; data: UpdateBoxerData },
  { rejectValue: string }
>('boxer/updateBoxer', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await boxerService.updateBoxer(id, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update boxer profile';
    return rejectWithValue(message);
  }
});

/**
 * Search boxers with filters
 */
export const searchBoxers = createAsyncThunk<
  { data: BoxerProfile[]; pagination: PaginationInfo },
  BoxerSearchParams | undefined,
  { rejectValue: string }
>('boxer/searchBoxers', async (params, { rejectWithValue }) => {
  try {
    const response = await boxerService.searchBoxers(params);
    return {
      data: response.data,
      pagination: response.pagination,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search boxers';
    return rejectWithValue(message);
  }
});

/**
 * Delete a boxer profile
 */
export const deleteBoxer = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('boxer/deleteBoxer', async (id, { rejectWithValue }) => {
  try {
    await boxerService.deleteBoxer(id);
    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete boxer';
    return rejectWithValue(message);
  }
});

// ============================================================================
// Slice
// ============================================================================

const boxerSlice = createSlice({
  name: 'boxer',
  initialState,
  reducers: {
    clearSelectedBoxer: (state) => {
      state.selectedBoxer = null;
    },
    clearMyBoxer: (state) => {
      state.myBoxer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSearchParams: (state, action: PayloadAction<BoxerSearchParams>) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearSearchParams: (state) => {
      state.searchParams = {};
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.searchParams.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Create boxer
    builder
      .addCase(createBoxer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBoxer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBoxer = action.payload;
      })
      .addCase(createBoxer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to create boxer profile';
      });

    // Fetch my boxer
    builder
      .addCase(fetchMyBoxer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyBoxer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myBoxer = action.payload;
      })
      .addCase(fetchMyBoxer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch boxer profile';
      });

    // Fetch boxer by ID
    builder
      .addCase(fetchBoxerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBoxerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedBoxer = action.payload;
      })
      .addCase(fetchBoxerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch boxer';
      });

    // Update boxer
    builder
      .addCase(updateBoxer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBoxer.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update myBoxer if it's the same boxer
        if (state.myBoxer?.id === action.payload.id) {
          state.myBoxer = action.payload;
        }
        // Update selectedBoxer if it's the same boxer
        if (state.selectedBoxer?.id === action.payload.id) {
          state.selectedBoxer = action.payload;
        }
        // Update in boxers list if present
        const index = state.boxers.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.boxers[index] = action.payload;
        }
      })
      .addCase(updateBoxer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to update boxer profile';
      });

    // Search boxers
    builder
      .addCase(searchBoxers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchBoxers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.boxers = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchBoxers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to search boxers';
      });

    // Delete boxer
    builder
      .addCase(deleteBoxer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBoxer.fulfilled, (state, action) => {
        state.isLoading = false;
        // Clear myBoxer if it's the deleted boxer
        if (state.myBoxer?.id === action.payload) {
          state.myBoxer = null;
        }
        // Clear selectedBoxer if it's the deleted boxer
        if (state.selectedBoxer?.id === action.payload) {
          state.selectedBoxer = null;
        }
        // Remove from boxers list
        state.boxers = state.boxers.filter((b) => b.id !== action.payload);
      })
      .addCase(deleteBoxer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to delete boxer';
      });
  },
});

export const {
  clearSelectedBoxer,
  clearMyBoxer,
  clearError,
  setSearchParams,
  clearSearchParams,
  setPage,
} = boxerSlice.actions;

export default boxerSlice.reducer;
