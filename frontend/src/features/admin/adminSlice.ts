import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminService } from '@/services/adminService';
import type {
  User,
  BoxerProfile,
  Club,
  AdminStats,
  PaginationInfo,
  CreateUserData,
  UpdateUserData,
  AdminBoxerData,
  UpdateAdminBoxerData,
  CreateClubData,
  UpdateClubData,
  AdminUserSearchParams,
  AdminBoxerSearchParams,
  AdminClubSearchParams,
} from '@/types';

// ============================================================================
// State Types
// ============================================================================

interface AdminState {
  stats: AdminStats | null;
  users: {
    data: User[];
    pagination: PaginationInfo | null;
    loading: boolean;
    error: string | null;
  };
  boxers: {
    data: BoxerProfile[];
    pagination: PaginationInfo | null;
    loading: boolean;
    error: string | null;
  };
  clubs: {
    data: Club[];
    pagination: PaginationInfo | null;
    loading: boolean;
    error: string | null;
  };
  selectedUser: User | null;
  selectedBoxer: BoxerProfile | null;
  selectedClub: Club | null;
  statsLoading: boolean;
  statsError: string | null;
}

const initialState: AdminState = {
  stats: null,
  users: {
    data: [],
    pagination: null,
    loading: false,
    error: null,
  },
  boxers: {
    data: [],
    pagination: null,
    loading: false,
    error: null,
  },
  clubs: {
    data: [],
    pagination: null,
    loading: false,
    error: null,
  },
  selectedUser: null,
  selectedBoxer: null,
  selectedClub: null,
  statsLoading: false,
  statsError: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

// Stats
export const fetchAdminStats = createAsyncThunk(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminService.getStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch stats';
      return rejectWithValue(message);
    }
  }
);

// Users
export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params: AdminUserSearchParams, { rejectWithValue }) => {
    try {
      return await adminService.getUsers(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'admin/fetchUserById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await adminService.getUser(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      return rejectWithValue(message);
    }
  }
);

export const createUser = createAsyncThunk(
  'admin/createUser',
  async (data: CreateUserData, { rejectWithValue }) => {
    try {
      return await adminService.createUser(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create user';
      return rejectWithValue(message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ id, data }: { id: string; data: UpdateUserData }, { rejectWithValue }) => {
    try {
      return await adminService.updateUser(id, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      return rejectWithValue(message);
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'admin/updateUserStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      return await adminService.updateUserStatus(id, isActive);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status';
      return rejectWithValue(message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminService.deleteUser(id);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      return rejectWithValue(message);
    }
  }
);

// Boxers
export const fetchBoxers = createAsyncThunk(
  'admin/fetchBoxers',
  async (params: AdminBoxerSearchParams, { rejectWithValue }) => {
    try {
      return await adminService.getBoxers(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch boxers';
      return rejectWithValue(message);
    }
  }
);

export const fetchBoxerById = createAsyncThunk(
  'admin/fetchBoxerById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await adminService.getBoxer(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch boxer';
      return rejectWithValue(message);
    }
  }
);

export const createBoxer = createAsyncThunk(
  'admin/createBoxer',
  async (data: AdminBoxerData, { rejectWithValue }) => {
    try {
      return await adminService.createBoxer(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create boxer';
      return rejectWithValue(message);
    }
  }
);

export const updateBoxer = createAsyncThunk(
  'admin/updateBoxer',
  async ({ id, data }: { id: string; data: UpdateAdminBoxerData }, { rejectWithValue }) => {
    try {
      return await adminService.updateBoxer(id, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update boxer';
      return rejectWithValue(message);
    }
  }
);

export const verifyBoxer = createAsyncThunk(
  'admin/verifyBoxer',
  async ({ id, isVerified }: { id: string; isVerified: boolean }, { rejectWithValue }) => {
    try {
      return await adminService.verifyBoxer(id, isVerified);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify boxer';
      return rejectWithValue(message);
    }
  }
);

export const deleteBoxer = createAsyncThunk(
  'admin/deleteBoxer',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminService.deleteBoxer(id);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete boxer';
      return rejectWithValue(message);
    }
  }
);

// Clubs
export const fetchClubs = createAsyncThunk(
  'admin/fetchClubs',
  async (params: AdminClubSearchParams, { rejectWithValue }) => {
    try {
      return await adminService.getClubs(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch clubs';
      return rejectWithValue(message);
    }
  }
);

export const fetchClubById = createAsyncThunk(
  'admin/fetchClubById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await adminService.getClub(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch club';
      return rejectWithValue(message);
    }
  }
);

export const createClub = createAsyncThunk(
  'admin/createClub',
  async (data: CreateClubData, { rejectWithValue }) => {
    try {
      return await adminService.createClub(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create club';
      return rejectWithValue(message);
    }
  }
);

export const updateClub = createAsyncThunk(
  'admin/updateClub',
  async ({ id, data }: { id: string; data: UpdateClubData }, { rejectWithValue }) => {
    try {
      return await adminService.updateClub(id, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update club';
      return rejectWithValue(message);
    }
  }
);

export const deleteClub = createAsyncThunk(
  'admin/deleteClub',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminService.deleteClub(id);
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete club';
      return rejectWithValue(message);
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
    clearSelectedBoxer(state) {
      state.selectedBoxer = null;
    },
    clearSelectedClub(state) {
      state.selectedClub = null;
    },
    clearUsersError(state) {
      state.users.error = null;
    },
    clearBoxersError(state) {
      state.boxers.error = null;
    },
    clearClubsError(state) {
      state.clubs.error = null;
    },
    clearStatsError(state) {
      state.statsError = null;
    },
  },
  extraReducers: (builder) => {
    // Stats
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      });

    // Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload.data;
        state.users.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload as string;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.selectedUser = action.payload;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.data.unshift(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.data.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users.data[index] = action.payload;
        }
        if (state.selectedUser?.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        const index = state.users.data.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users.data[index] = action.payload;
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users.data = state.users.data.filter((u) => u.id !== action.payload);
      });

    // Boxers
    builder
      .addCase(fetchBoxers.pending, (state) => {
        state.boxers.loading = true;
        state.boxers.error = null;
      })
      .addCase(fetchBoxers.fulfilled, (state, action) => {
        state.boxers.loading = false;
        state.boxers.data = action.payload.data;
        state.boxers.pagination = action.payload.pagination;
      })
      .addCase(fetchBoxers.rejected, (state, action) => {
        state.boxers.loading = false;
        state.boxers.error = action.payload as string;
      })
      .addCase(fetchBoxerById.fulfilled, (state, action) => {
        state.selectedBoxer = action.payload;
      })
      .addCase(createBoxer.fulfilled, (state, action) => {
        state.boxers.data.unshift(action.payload);
      })
      .addCase(updateBoxer.fulfilled, (state, action) => {
        const index = state.boxers.data.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.boxers.data[index] = action.payload;
        }
        if (state.selectedBoxer?.id === action.payload.id) {
          state.selectedBoxer = action.payload;
        }
      })
      .addCase(verifyBoxer.fulfilled, (state, action) => {
        const index = state.boxers.data.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.boxers.data[index] = action.payload;
        }
      })
      .addCase(deleteBoxer.fulfilled, (state, action) => {
        state.boxers.data = state.boxers.data.filter((b) => b.id !== action.payload);
      });

    // Clubs
    builder
      .addCase(fetchClubs.pending, (state) => {
        state.clubs.loading = true;
        state.clubs.error = null;
      })
      .addCase(fetchClubs.fulfilled, (state, action) => {
        state.clubs.loading = false;
        state.clubs.data = action.payload.data;
        state.clubs.pagination = action.payload.pagination;
      })
      .addCase(fetchClubs.rejected, (state, action) => {
        state.clubs.loading = false;
        state.clubs.error = action.payload as string;
      })
      .addCase(fetchClubById.fulfilled, (state, action) => {
        state.selectedClub = action.payload;
      })
      .addCase(createClub.fulfilled, (state, action) => {
        state.clubs.data.unshift(action.payload);
      })
      .addCase(updateClub.fulfilled, (state, action) => {
        const index = state.clubs.data.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.clubs.data[index] = action.payload;
        }
        if (state.selectedClub?.id === action.payload.id) {
          state.selectedClub = action.payload;
        }
      })
      .addCase(deleteClub.fulfilled, (state, action) => {
        state.clubs.data = state.clubs.data.filter((c) => c.id !== action.payload);
      });
  },
});

export const {
  clearSelectedUser,
  clearSelectedBoxer,
  clearSelectedClub,
  clearUsersError,
  clearBoxersError,
  clearClubsError,
  clearStatsError,
} = adminSlice.actions;

export default adminSlice.reducer;
