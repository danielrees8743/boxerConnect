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
   * POST /api/v1/match-requests
   */
  async createMatchRequest(data: CreateMatchRequestData): Promise<MatchRequest> {
    const response = await apiClient.post<ApiResponse<{ matchRequest: MatchRequest }>>(
      '/match-requests',
      data
    );
    if (!response.data.data?.matchRequest) {
      throw new Error(response.data.message || 'Failed to create match request');
    }
    return response.data.data.matchRequest;
  },

  /**
   * Get match requests (incoming or outgoing)
   * GET /api/v1/match-requests?type=incoming|outgoing
   * @param type - 'incoming' for requests received, 'outgoing' for requests sent
   * @param params - Search parameters including status filter and pagination
   */
  async getMatchRequests(
    type: 'incoming' | 'outgoing',
    params?: MatchRequestSearchParams
  ): Promise<PaginatedResponse<MatchRequest>> {
    const response = await apiClient.get<PaginatedResponse<MatchRequest>>(
      '/match-requests',
      { params: { ...params, type } }
    );
    return response.data;
  },

  /**
   * Get a single match request by ID
   * GET /api/v1/match-requests/:id
   */
  async getMatchRequest(id: string): Promise<MatchRequest> {
    const response = await apiClient.get<ApiResponse<{ matchRequest: MatchRequest }>>(
      `/match-requests/${id}`
    );
    if (!response.data.data?.matchRequest) {
      throw new Error(response.data.message || 'Match request not found');
    }
    return response.data.data.matchRequest;
  },

  /**
   * Accept a match request
   * PUT /api/v1/match-requests/:id/accept
   */
  async acceptMatchRequest(id: string, responseMessage?: string): Promise<MatchRequest> {
    const response = await apiClient.put<ApiResponse<{ matchRequest: MatchRequest }>>(
      `/match-requests/${id}/accept`,
      { responseMessage }
    );
    if (!response.data.data?.matchRequest) {
      throw new Error(response.data.message || 'Failed to accept match request');
    }
    return response.data.data.matchRequest;
  },

  /**
   * Decline a match request
   * PUT /api/v1/match-requests/:id/decline
   */
  async declineMatchRequest(id: string, responseMessage?: string): Promise<MatchRequest> {
    const response = await apiClient.put<ApiResponse<{ matchRequest: MatchRequest }>>(
      `/match-requests/${id}/decline`,
      { responseMessage }
    );
    if (!response.data.data?.matchRequest) {
      throw new Error(response.data.message || 'Failed to decline match request');
    }
    return response.data.data.matchRequest;
  },

  /**
   * Cancel a match request (only by the requester)
   * DELETE /api/v1/match-requests/:id
   */
  async cancelMatchRequest(id: string): Promise<void> {
    await apiClient.delete(`/match-requests/${id}`);
  },

  /**
   * Get match request statistics for the current user
   * GET /api/v1/match-requests/stats
   */
  async getMatchRequestStats(): Promise<MatchRequestStats> {
    const response = await apiClient.get<ApiResponse<{ stats: MatchRequestStats }>>(
      '/match-requests/stats'
    );
    if (!response.data.data?.stats) {
      throw new Error(response.data.message || 'Failed to fetch statistics');
    }
    return response.data.data.stats;
  },

  /**
   * Get all match requests (both incoming and outgoing)
   * GET /api/v1/match-requests
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
