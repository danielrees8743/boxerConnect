import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  MatchRequest,
  CreateMatchRequestData,
  MatchRequestSearchParams,
  MatchRequestStats,
  MatchRequestStatus,
  PaginationInfo,
} from '@/types';
import { matchRequestService } from '@/services/matchRequestService';

interface RequestsState {
  incomingRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
  selectedRequest: MatchRequest | null;
  stats: MatchRequestStats | null;
  incomingPagination: PaginationInfo | null;
  outgoingPagination: PaginationInfo | null;
  isLoading: boolean;
  isStatsLoading: boolean;
  error: string | null;
}

const initialState: RequestsState = {
  incomingRequests: [],
  outgoingRequests: [],
  selectedRequest: null,
  stats: null,
  incomingPagination: null,
  outgoingPagination: null,
  isLoading: false,
  isStatsLoading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Create a new match request
 */
export const createMatchRequest = createAsyncThunk<
  MatchRequest,
  CreateMatchRequestData,
  { rejectValue: string }
>('requests/createMatchRequest', async (data, { rejectWithValue }) => {
  try {
    return await matchRequestService.createMatchRequest(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create match request';
    return rejectWithValue(message);
  }
});

/**
 * Fetch incoming match requests
 */
export const fetchIncomingRequests = createAsyncThunk<
  { data: MatchRequest[]; pagination: PaginationInfo },
  MatchRequestSearchParams | undefined,
  { rejectValue: string }
>('requests/fetchIncoming', async (params, { rejectWithValue }) => {
  try {
    const response = await matchRequestService.getMatchRequests('incoming', params);
    return {
      data: response.data,
      pagination: response.pagination,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch incoming requests';
    return rejectWithValue(message);
  }
});

/**
 * Fetch outgoing match requests
 */
export const fetchOutgoingRequests = createAsyncThunk<
  { data: MatchRequest[]; pagination: PaginationInfo },
  MatchRequestSearchParams | undefined,
  { rejectValue: string }
>('requests/fetchOutgoing', async (params, { rejectWithValue }) => {
  try {
    const response = await matchRequestService.getMatchRequests('outgoing', params);
    return {
      data: response.data,
      pagination: response.pagination,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch outgoing requests';
    return rejectWithValue(message);
  }
});

/**
 * Fetch a single match request by ID
 */
export const fetchMatchRequest = createAsyncThunk<
  MatchRequest,
  string,
  { rejectValue: string }
>('requests/fetchMatchRequest', async (id, { rejectWithValue }) => {
  try {
    return await matchRequestService.getMatchRequest(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch match request';
    return rejectWithValue(message);
  }
});

/**
 * Accept a match request
 */
export const acceptMatchRequest = createAsyncThunk<
  MatchRequest,
  { id: string; responseMessage?: string },
  { rejectValue: string }
>('requests/acceptMatchRequest', async ({ id, responseMessage }, { rejectWithValue }) => {
  try {
    return await matchRequestService.acceptMatchRequest(id, responseMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept match request';
    return rejectWithValue(message);
  }
});

/**
 * Decline a match request
 */
export const declineMatchRequest = createAsyncThunk<
  MatchRequest,
  { id: string; responseMessage?: string },
  { rejectValue: string }
>('requests/declineMatchRequest', async ({ id, responseMessage }, { rejectWithValue }) => {
  try {
    return await matchRequestService.declineMatchRequest(id, responseMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decline match request';
    return rejectWithValue(message);
  }
});

/**
 * Cancel a match request
 */
export const cancelMatchRequest = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('requests/cancelMatchRequest', async (id, { rejectWithValue }) => {
  try {
    await matchRequestService.cancelMatchRequest(id);
    return id; // Return the ID of the cancelled request
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel match request';
    return rejectWithValue(message);
  }
});

/**
 * Fetch match request statistics
 */
export const fetchMatchRequestStats = createAsyncThunk<
  MatchRequestStats,
  void,
  { rejectValue: string }
>('requests/fetchStats', async (_, { rejectWithValue }) => {
  try {
    return await matchRequestService.getMatchRequestStats();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch statistics';
    return rejectWithValue(message);
  }
});

// ============================================================================
// Helper function to update request in lists
// ============================================================================

function updateRequestInList(
  list: MatchRequest[],
  updatedRequest: MatchRequest
): MatchRequest[] {
  const index = list.findIndex((r) => r.id === updatedRequest.id);
  if (index !== -1) {
    const newList = [...list];
    newList[index] = updatedRequest;
    return newList;
  }
  return list;
}

// ============================================================================
// Slice
// ============================================================================

const requestsSlice = createSlice({
  name: 'requests',
  initialState,
  reducers: {
    selectRequest: (state, action: PayloadAction<MatchRequest | null>) => {
      state.selectedRequest = action.payload;
    },
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearRequests: (state) => {
      state.incomingRequests = [];
      state.outgoingRequests = [];
      state.incomingPagination = null;
      state.outgoingPagination = null;
    },
    // Optimistic update for request status
    optimisticUpdateStatus: (
      state,
      action: PayloadAction<{ id: string; status: MatchRequestStatus }>
    ) => {
      const { id, status } = action.payload;
      state.incomingRequests = state.incomingRequests.map((r) =>
        r.id === id ? { ...r, status } : r
      );
      state.outgoingRequests = state.outgoingRequests.map((r) =>
        r.id === id ? { ...r, status } : r
      );
    },
  },
  extraReducers: (builder) => {
    // Create match request
    builder
      .addCase(createMatchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createMatchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outgoingRequests.unshift(action.payload);
      })
      .addCase(createMatchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to create match request';
      });

    // Fetch incoming requests
    builder
      .addCase(fetchIncomingRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncomingRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = action.payload.data;
        state.incomingPagination = action.payload.pagination;
      })
      .addCase(fetchIncomingRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch incoming requests';
      });

    // Fetch outgoing requests
    builder
      .addCase(fetchOutgoingRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOutgoingRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outgoingRequests = action.payload.data;
        state.outgoingPagination = action.payload.pagination;
      })
      .addCase(fetchOutgoingRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch outgoing requests';
      });

    // Fetch single match request
    builder
      .addCase(fetchMatchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMatchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedRequest = action.payload;
      })
      .addCase(fetchMatchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch match request';
      });

    // Accept match request
    builder
      .addCase(acceptMatchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptMatchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = updateRequestInList(state.incomingRequests, action.payload);
        state.outgoingRequests = updateRequestInList(state.outgoingRequests, action.payload);
        if (state.selectedRequest?.id === action.payload.id) {
          state.selectedRequest = action.payload;
        }
      })
      .addCase(acceptMatchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to accept match request';
      });

    // Decline match request
    builder
      .addCase(declineMatchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(declineMatchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = updateRequestInList(state.incomingRequests, action.payload);
        state.outgoingRequests = updateRequestInList(state.outgoingRequests, action.payload);
        if (state.selectedRequest?.id === action.payload.id) {
          state.selectedRequest = action.payload;
        }
      })
      .addCase(declineMatchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to decline match request';
      });

    // Cancel match request
    builder
      .addCase(cancelMatchRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelMatchRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Remove the cancelled request from both lists
        state.incomingRequests = state.incomingRequests.filter((r) => r.id !== action.payload);
        state.outgoingRequests = state.outgoingRequests.filter((r) => r.id !== action.payload);
        if (state.selectedRequest?.id === action.payload) {
          state.selectedRequest = null;
        }
      })
      .addCase(cancelMatchRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to cancel match request';
      });

    // Fetch match request stats
    builder
      .addCase(fetchMatchRequestStats.pending, (state) => {
        state.isStatsLoading = true;
        state.error = null;
      })
      .addCase(fetchMatchRequestStats.fulfilled, (state, action) => {
        state.isStatsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchMatchRequestStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        state.error = action.payload ?? 'Failed to fetch statistics';
      });
  },
});

export const {
  selectRequest,
  clearSelectedRequest,
  clearError,
  clearRequests,
  optimisticUpdateStatus,
} = requestsSlice.actions;

export default requestsSlice.reducer;
