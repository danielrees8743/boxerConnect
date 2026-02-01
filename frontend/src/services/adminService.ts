import { apiClient } from './apiClient';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  BoxerProfile,
  Club,
  AdminStats,
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

/**
 * Admin service for handling admin-related API calls.
 */
export const adminService = {
  // ============================================================================
  // Stats
  // ============================================================================

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<ApiResponse<{ stats: AdminStats }>>('/admin/stats');
    if (!response.data.data?.stats) {
      throw new Error(response.data.message || 'Failed to get stats');
    }
    return response.data.data.stats;
  },

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Get all users with optional filtering and pagination
   */
  async getUsers(params: AdminUserSearchParams = {}): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params.role) queryParams.append('role', params.role);
    if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const response = await apiClient.get<PaginatedResponse<User>>(
      `/admin/users?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Search users by name or email
   */
  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>(
      `/admin/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`);
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to get user');
    }
    return response.data.data.user;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/admin/users', data);
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to create user');
    }
    return response.data.data.user;
  },

  /**
   * Update a user
   */
  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(`/admin/users/${id}`, data);
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to update user');
    }
    return response.data.data.user;
  },

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      `/admin/users/${id}/status`,
      { isActive }
    );
    if (!response.data.data?.user) {
      throw new Error(response.data.message || 'Failed to update user status');
    }
    return response.data.data.user;
  },

  /**
   * Delete a user (soft delete)
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // ============================================================================
  // Boxer Management (Admin)
  // ============================================================================

  /**
   * Get all boxers with optional filtering and pagination
   */
  async getBoxers(params: AdminBoxerSearchParams = {}): Promise<PaginatedResponse<BoxerProfile>> {
    const queryParams = new URLSearchParams();
    if (params.isVerified !== undefined) queryParams.append('isVerified', String(params.isVerified));
    if (params.clubId) queryParams.append('clubId', params.clubId);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const response = await apiClient.get<PaginatedResponse<BoxerProfile>>(
      `/admin/boxers?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get boxers pending verification
   */
  async getPendingVerifications(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<BoxerProfile>> {
    const response = await apiClient.get<PaginatedResponse<BoxerProfile>>(
      `/admin/boxers/pending-verification?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get a single boxer by ID
   */
  async getBoxer(id: string): Promise<BoxerProfile> {
    const response = await apiClient.get<ApiResponse<{ boxer: BoxerProfile }>>(
      `/admin/boxers/${id}`
    );
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to get boxer');
    }
    return response.data.data.boxer;
  },

  /**
   * Create a boxer profile for a user
   */
  async createBoxer(data: AdminBoxerData): Promise<BoxerProfile> {
    const response = await apiClient.post<ApiResponse<{ boxer: BoxerProfile }>>(
      '/admin/boxers',
      data
    );
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to create boxer');
    }
    return response.data.data.boxer;
  },

  /**
   * Update a boxer profile
   */
  async updateBoxer(id: string, data: UpdateAdminBoxerData): Promise<BoxerProfile> {
    const response = await apiClient.put<ApiResponse<{ boxer: BoxerProfile }>>(
      `/admin/boxers/${id}`,
      data
    );
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to update boxer');
    }
    return response.data.data.boxer;
  },

  /**
   * Verify or unverify a boxer
   */
  async verifyBoxer(id: string, isVerified: boolean): Promise<BoxerProfile> {
    const response = await apiClient.put<ApiResponse<{ boxer: BoxerProfile }>>(
      `/admin/boxers/${id}/verify`,
      { isVerified }
    );
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to verify boxer');
    }
    return response.data.data.boxer;
  },

  /**
   * Delete a boxer profile
   */
  async deleteBoxer(id: string): Promise<void> {
    await apiClient.delete(`/admin/boxers/${id}`);
  },

  // ============================================================================
  // Club Management
  // ============================================================================

  /**
   * Get all clubs with optional filtering and pagination
   */
  async getClubs(params: AdminClubSearchParams = {}): Promise<PaginatedResponse<Club>> {
    const queryParams = new URLSearchParams();
    if (params.isVerified !== undefined) queryParams.append('isVerified', String(params.isVerified));
    if (params.region) queryParams.append('region', params.region);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const response = await apiClient.get<PaginatedResponse<Club>>(
      `/admin/clubs?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single club by ID
   */
  async getClub(id: string): Promise<Club> {
    const response = await apiClient.get<ApiResponse<{ club: Club }>>(`/admin/clubs/${id}`);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Failed to get club');
    }
    return response.data.data.club;
  },

  /**
   * Create a new club
   */
  async createClub(data: CreateClubData): Promise<Club> {
    const response = await apiClient.post<ApiResponse<{ club: Club }>>('/admin/clubs', data);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Failed to create club');
    }
    return response.data.data.club;
  },

  /**
   * Update a club
   */
  async updateClub(id: string, data: UpdateClubData): Promise<Club> {
    const response = await apiClient.put<ApiResponse<{ club: Club }>>(`/admin/clubs/${id}`, data);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Failed to update club');
    }
    return response.data.data.club;
  },

  /**
   * Delete a club
   */
  async deleteClub(id: string): Promise<void> {
    await apiClient.delete(`/admin/clubs/${id}`);
  },
};
