import { apiClient } from './apiClient';
import type { Club, CreateClubData, UpdateClubData } from '@/types';

export interface ClubSearchParams {
  name?: string;
  region?: string;
  postcode?: string;
  page?: number;
  limit?: number;
}

export interface ClubStats {
  total: number;
  byRegion: { region: string; count: number }[];
  withEmail: number;
  withPhone: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Club service for fetching boxing club data.
 * All endpoints are public (no authentication required).
 */
export const clubService = {
  /**
   * Get all clubs with optional filtering
   */
  async getClubs(params?: ClubSearchParams): Promise<PaginatedResponse<Club>> {
    const response = await apiClient.get<PaginatedResponse<Club>>('/clubs', { params });
    return response.data;
  },

  /**
   * Get a single club by ID
   */
  async getClub(id: string): Promise<Club> {
    const response = await apiClient.get<ApiResponse<{ club: Club }>>(`/clubs/${id}`);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Club not found');
    }
    return response.data.data.club;
  },

  /**
   * Get all unique regions
   */
  async getRegions(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<{ regions: string[] }>>('/clubs/regions');
    return response.data.data?.regions || [];
  },

  /**
   * Get clubs by region
   */
  async getClubsByRegion(region: string): Promise<Club[]> {
    const response = await apiClient.get<ApiResponse<{ clubs: Club[]; total: number }>>(`/clubs/region/${encodeURIComponent(region)}`);
    return response.data.data?.clubs || [];
  },

  /**
   * Search clubs by name (autocomplete)
   */
  async searchClubs(query: string, limit = 10): Promise<Club[]> {
    const response = await apiClient.get<ApiResponse<{ clubs: Club[] }>>('/clubs/search', {
      params: { q: query, limit },
    });
    return response.data.data?.clubs || [];
  },

  /**
   * Get club statistics
   */
  async getStats(): Promise<ClubStats> {
    const response = await apiClient.get<ApiResponse<{ stats: ClubStats }>>('/clubs/stats');
    if (!response.data.data?.stats) {
      throw new Error('Failed to fetch club stats');
    }
    return response.data.data.stats;
  },

  /**
   * Create a new club (admin only)
   */
  async createClub(data: CreateClubData): Promise<Club> {
    const response = await apiClient.post<ApiResponse<{ club: Club }>>('/clubs', data);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Failed to create club');
    }
    return response.data.data.club;
  },

  /**
   * Update an existing club (admin or gym owner)
   */
  async updateClub(id: string, data: UpdateClubData): Promise<Club> {
    const response = await apiClient.patch<ApiResponse<{ club: Club }>>(`/clubs/${id}`, data);
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Failed to update club');
    }
    return response.data.data.club;
  },
};

export default clubService;
