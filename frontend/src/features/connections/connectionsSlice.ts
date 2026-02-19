import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Connection,
  ConnectionRequest,
  ConnectionStatusResult,
  SendConnectionRequestData,
  PaginationInfo,
} from '@/types';
import { ExperienceLevel } from '@/types';
import { connectionService } from '@/services/connectionService';

interface ConnectionsState {
  connections: Connection[];
  connectionsPagination: PaginationInfo | null;
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  incomingPagination: PaginationInfo | null;
  outgoingPagination: PaginationInfo | null;
  statusCache: Record<string, ConnectionStatusResult>;
  isLoading: boolean;
  isStatusLoading: boolean;
  error: string | null;
}

const initialState: ConnectionsState = {
  connections: [],
  connectionsPagination: null,
  incomingRequests: [],
  outgoingRequests: [],
  incomingPagination: null,
  outgoingPagination: null,
  statusCache: {},
  isLoading: false,
  isStatusLoading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

export const sendConnectionRequest = createAsyncThunk<
  ConnectionRequest,
  SendConnectionRequestData,
  { rejectValue: string }
>('connections/sendConnectionRequest', async (data, { rejectWithValue }) => {
  try {
    return await connectionService.sendConnectionRequest(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send connection request';
    return rejectWithValue(message);
  }
});

export const fetchIncomingConnectionRequests = createAsyncThunk<
  { data: ConnectionRequest[]; pagination: PaginationInfo },
  { page?: number; limit?: number } | undefined,
  { rejectValue: string }
>('connections/fetchIncoming', async (params, { rejectWithValue }) => {
  try {
    const response = await connectionService.getConnectionRequests({ type: 'incoming', ...params });
    return { data: response.data, pagination: response.pagination };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch incoming requests';
    return rejectWithValue(message);
  }
});

export const fetchOutgoingConnectionRequests = createAsyncThunk<
  { data: ConnectionRequest[]; pagination: PaginationInfo },
  { page?: number; limit?: number } | undefined,
  { rejectValue: string }
>('connections/fetchOutgoing', async (params, { rejectWithValue }) => {
  try {
    const response = await connectionService.getConnectionRequests({ type: 'outgoing', ...params });
    return { data: response.data, pagination: response.pagination };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch outgoing requests';
    return rejectWithValue(message);
  }
});

export const fetchMyConnections = createAsyncThunk<
  { data: Connection[]; pagination: PaginationInfo },
  { page?: number; limit?: number } | undefined,
  { rejectValue: string }
>('connections/fetchMyConnections', async (params, { rejectWithValue }) => {
  try {
    const response = await connectionService.getMyConnections(params);
    return { data: response.data, pagination: response.pagination };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch connections';
    return rejectWithValue(message);
  }
});

export const fetchConnectionStatus = createAsyncThunk<
  { boxerId: string; result: ConnectionStatusResult },
  string,
  { rejectValue: string }
>('connections/fetchStatus', async (boxerId, { rejectWithValue }) => {
  try {
    const result = await connectionService.getConnectionStatus(boxerId);
    return { boxerId, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch connection status';
    return rejectWithValue(message);
  }
});

export const acceptConnectionRequest = createAsyncThunk<
  { connectionRequest: ConnectionRequest; connection: Connection },
  string,
  { rejectValue: string }
>('connections/acceptRequest', async (id, { rejectWithValue }) => {
  try {
    return await connectionService.acceptConnectionRequest(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept connection request';
    return rejectWithValue(message);
  }
});

export const declineConnectionRequest = createAsyncThunk<
  ConnectionRequest,
  string,
  { rejectValue: string }
>('connections/declineRequest', async (id, { rejectWithValue }) => {
  try {
    const result = await connectionService.declineConnectionRequest(id);
    return result.connectionRequest;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decline connection request';
    return rejectWithValue(message);
  }
});

export const cancelConnectionRequest = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('connections/cancelRequest', async (id, { rejectWithValue }) => {
  try {
    await connectionService.cancelConnectionRequest(id);
    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel connection request';
    return rejectWithValue(message);
  }
});

export const disconnect = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('connections/disconnect', async (connectionId, { rejectWithValue }) => {
  try {
    await connectionService.disconnect(connectionId);
    return connectionId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disconnect';
    return rejectWithValue(message);
  }
});

// ============================================================================
// Slice
// ============================================================================

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearConnections: (state) => {
      state.connections = [];
      state.incomingRequests = [];
      state.outgoingRequests = [];
      state.statusCache = {};
      state.connectionsPagination = null;
      state.incomingPagination = null;
      state.outgoingPagination = null;
    },
  },
  extraReducers: (builder) => {
    // Send connection request
    builder
      .addCase(sendConnectionRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendConnectionRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outgoingRequests.unshift(action.payload);
        // Update status cache for the target boxer
        state.statusCache[action.payload.targetBoxerId] = {
          status: 'pending_sent',
          requestId: action.payload.id,
          connectionId: null,
        };
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to send connection request';
      });

    // Fetch incoming connection requests
    builder
      .addCase(fetchIncomingConnectionRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncomingConnectionRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = action.payload.data;
        state.incomingPagination = action.payload.pagination;
      })
      .addCase(fetchIncomingConnectionRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch incoming requests';
      });

    // Fetch outgoing connection requests
    builder
      .addCase(fetchOutgoingConnectionRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOutgoingConnectionRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.outgoingRequests = action.payload.data;
        state.outgoingPagination = action.payload.pagination;
      })
      .addCase(fetchOutgoingConnectionRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch outgoing requests';
      });

    // Fetch my connections
    builder
      .addCase(fetchMyConnections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyConnections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections = action.payload.data;
        state.connectionsPagination = action.payload.pagination;
      })
      .addCase(fetchMyConnections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to fetch connections';
      });

    // Fetch connection status
    builder
      .addCase(fetchConnectionStatus.pending, (state) => {
        state.isStatusLoading = true;
      })
      .addCase(fetchConnectionStatus.fulfilled, (state, action) => {
        state.isStatusLoading = false;
        state.statusCache[action.payload.boxerId] = action.payload.result;
      })
      .addCase(fetchConnectionStatus.rejected, (state, action) => {
        state.isStatusLoading = false;
        state.error = action.payload ?? 'Failed to fetch connection status';
      });

    // Accept connection request
    builder
      .addCase(acceptConnectionRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptConnectionRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const { connectionRequest, connection } = action.payload;
        // Remove from incoming requests
        state.incomingRequests = state.incomingRequests.filter(
          (r) => r.id !== connectionRequest.id
        );
        // Add to connections, backfilling boxer from the request if the API omitted it
        const enrichedConnection: Connection = connection.boxer
          ? connection
          : {
              ...connection,
              boxer: connectionRequest.requesterBoxer ?? {
                id: connectionRequest.requesterBoxerId,
                name: 'Unknown Boxer',
                profilePhotoUrl: null,
                experienceLevel: ExperienceLevel.BEGINNER,
                city: null,
                country: null,
                wins: 0,
                losses: 0,
                draws: 0,
              },
            };
        state.connections.unshift(enrichedConnection);
        // Update status cache for the requester boxer
        state.statusCache[connectionRequest.requesterBoxerId] = {
          status: 'connected',
          requestId: null,
          connectionId: connection.id,
        };
      })
      .addCase(acceptConnectionRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to accept connection request';
      });

    // Decline connection request
    builder
      .addCase(declineConnectionRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(declineConnectionRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = state.incomingRequests.filter(
          (r) => r.id !== action.payload.id
        );
        // Reset status cache for the requester
        state.statusCache[action.payload.requesterBoxerId] = {
          status: 'none',
          requestId: null,
          connectionId: null,
        };
      })
      .addCase(declineConnectionRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to decline connection request';
      });

    // Cancel connection request
    builder
      .addCase(cancelConnectionRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelConnectionRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const cancelledId = action.payload;
        // Find the request to get the targetBoxerId before removing
        const cancelled = state.outgoingRequests.find((r) => r.id === cancelledId);
        if (cancelled) {
          state.statusCache[cancelled.targetBoxerId] = {
            status: 'none',
            requestId: null,
            connectionId: null,
          };
        }
        state.outgoingRequests = state.outgoingRequests.filter((r) => r.id !== cancelledId);
      })
      .addCase(cancelConnectionRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to cancel connection request';
      });

    // Disconnect
    builder
      .addCase(disconnect.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disconnect.fulfilled, (state, action) => {
        state.isLoading = false;
        const removedConn = state.connections.find((c) => c.id === action.payload);
        if (removedConn) {
          state.statusCache[removedConn.boxer.id] = {
            status: 'none',
            requestId: null,
            connectionId: null,
          };
        }
        state.connections = state.connections.filter((c) => c.id !== action.payload);
      })
      .addCase(disconnect.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to disconnect';
      });
  },
});

export const { clearError, clearConnections } = connectionsSlice.actions;

export default connectionsSlice.reducer;
