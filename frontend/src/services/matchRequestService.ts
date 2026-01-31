import { apiClient } from './apiClient';
import type {
  MatchRequest,
  CreateMatchRequestData,
  MatchRequestSearchParams,
  MatchRequestStats,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

/**
 * Match request service for managing sparring/fight requests.
 * Handles creating, accepting, declining, and cancelling match requests.
 */
export const matchRequestService = {
  /**
   * Create a new match request
   */
  async createMatchRequest(data: CreateMatchRequestData): Promise<MatchRequest> {
    const response = await apiClient.post<ApiResponse<MatchRequest>>(
      '/match-requests',
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create match request');
    }
    return response.data.data;
  },

  /**
   * Get match requests (incoming or outgoing)
   * @param type - 'incoming' for requests received, 'outgoing' for requests sent
   * @param params - Search parameters including status filter and pagination
   */
  async getMatchRequests(
    type: 'incoming' | 'outgoing',
    params?: MatchRequestSearchParams
  ): Promise<PaginatedResponse<MatchRequest>> {
    const response = await apiClient.get<PaginatedResponse<MatchRequest>>(
      `/match-requests/${type}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get a single match request by ID
   */
  async getMatchRequest(id: string): Promise<MatchRequest> {
    const response = await apiClient.get<ApiResponse<MatchRequest>>(
      `/match-requests/${id}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Match request not found');
    }
    return response.data.data;
  },

  /**
   * Accept a match request
   */
  async acceptMatchRequest(id: string, responseMessage?: string): Promise<MatchRequest> {
    const response = await apiClient.post<ApiResponse<MatchRequest>>(
      `/match-requests/${id}/accept`,
      { responseMessage }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to accept match request');
    }
    return response.data.data;
  },

  /**
   * Decline a match request
   */
  async declineMatchRequest(id: string, responseMessage?: string): Promise<MatchRequest> {
    const response = await apiClient.post<ApiResponse<MatchRequest>>(
      `/match-requests/${id}/decline`,
      { responseMessage }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to decline match request');
    }
    return response.data.data;
  },

  /**
   * Cancel a match request (only by the requester)
   */
  async cancelMatchRequest(id: string): Promise<MatchRequest> {
    const response = await apiClient.post<ApiResponse<MatchRequest>>(
      `/match-requests/${id}/cancel`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to cancel match request');
    }
    return response.data.data;
  },

  /**
   * Get match request statistics for the current user
   */
  async getMatchRequestStats(): Promise<MatchRequestStats> {
    const response = await apiClient.get<ApiResponse<MatchRequestStats>>(
      '/match-requests/stats'
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch statistics');
    }
    return response.data.data;
  },

  /**
   * Get all match requests (both incoming and outgoing)
   */
  async getAllMatchRequests(
    params?: MatchRequestSearchParams
  ): Promise<PaginatedResponse<MatchRequest>> {
    const response = await apiClient.get<PaginatedResponse<MatchRequest>>(
      '/match-requests',
      { params }
    );
    return response.data;
  },
};

export default matchRequestService;
