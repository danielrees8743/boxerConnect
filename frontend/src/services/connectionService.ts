import { apiClient } from './apiClient';
import type {
  ConnectionRequest,
  Connection,
  ConnectionStatusResult,
  SendConnectionRequestData,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

export interface AcceptConnectionResponse {
  connectionRequest: ConnectionRequest;
  connection: Connection;
}

export interface DeclineConnectionResponse {
  connectionRequest: ConnectionRequest;
}

/**
 * Connection service — manages the full boxer-to-boxer connection lifecycle.
 */
export const connectionService = {
  /**
   * Send a connection request
   * POST /api/v1/connections
   */
  async sendConnectionRequest(data: SendConnectionRequestData): Promise<ConnectionRequest> {
    const response = await apiClient.post<ApiResponse<{ connectionRequest: ConnectionRequest }>>(
      '/connections',
      data,
    );
    return response.data.data!.connectionRequest;
  },

  /**
   * Get incoming or outgoing connection requests
   * GET /api/v1/connections/requests
   */
  async getConnectionRequests(
    params?: { type?: 'incoming' | 'outgoing'; page?: number; limit?: number },
  ): Promise<PaginatedResponse<ConnectionRequest>> {
    const response = await apiClient.get<PaginatedResponse<ConnectionRequest>>(
      '/connections/requests',
      { params },
    );
    return response.data;
  },

  /**
   * Get accepted connections for the authenticated boxer
   * GET /api/v1/connections
   */
  async getMyConnections(
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Connection>> {
    const response = await apiClient.get<PaginatedResponse<Connection>>(
      '/connections',
      { params },
    );
    return response.data;
  },

  /**
   * Get connection status between the authenticated boxer and another boxer
   * GET /api/v1/connections/status/:boxerId
   */
  async getConnectionStatus(boxerId: string): Promise<ConnectionStatusResult> {
    const response = await apiClient.get<ApiResponse<ConnectionStatusResult>>(
      `/connections/status/${boxerId}`,
    );
    return response.data.data!;
  },

  /**
   * Get a boxer's public connections list (no auth required)
   * GET /api/v1/boxers/:boxerId/connections
   */
  async getPublicBoxerConnections(
    boxerId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Connection>> {
    const response = await apiClient.get<PaginatedResponse<Connection>>(
      `/boxers/${boxerId}/connections`,
      { params },
    );
    return response.data;
  },

  /**
   * Accept an incoming connection request
   * PUT /api/v1/connections/requests/:id/accept
   */
  async acceptConnectionRequest(id: string): Promise<AcceptConnectionResponse> {
    const response = await apiClient.put<ApiResponse<AcceptConnectionResponse>>(
      `/connections/requests/${id}/accept`,
    );
    return response.data.data!;
  },

  /**
   * Decline an incoming connection request
   * PUT /api/v1/connections/requests/:id/decline
   */
  async declineConnectionRequest(id: string): Promise<DeclineConnectionResponse> {
    const response = await apiClient.put<ApiResponse<DeclineConnectionResponse>>(
      `/connections/requests/${id}/decline`,
    );
    return response.data.data!;
  },

  /**
   * Cancel an outgoing connection request
   * DELETE /api/v1/connections/requests/:id
   */
  async cancelConnectionRequest(id: string): Promise<void> {
    await apiClient.delete(`/connections/requests/${id}`);
  },

  /**
   * Disconnect two boxers (remove an accepted connection)
   * DELETE /api/v1/connections/:connectionId
   */
  async disconnect(connectionId: string): Promise<void> {
    await apiClient.delete(`/connections/${connectionId}`);
  },
};

export default connectionService;
