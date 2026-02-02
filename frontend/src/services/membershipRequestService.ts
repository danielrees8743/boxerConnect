import { apiClient } from './apiClient';

/**
 * Membership request status
 */
export enum MembershipRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Membership request interface
 */
export interface MembershipRequest {
  id: string;
  userId: string;
  clubId: string;
  status: MembershipRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    experienceLevel?: string;
    weightKg?: number | null;
  };
  club: {
    id: string;
    name: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface PendingRequestsResponse {
  requests: MembershipRequest[];
  total: number;
}

/**
 * Membership request service for gym owners to manage boxer membership requests.
 * All endpoints require authentication with GYM_OWNER role.
 */
export const membershipRequestService = {
  /**
   * Get all pending membership requests for the gym owner's clubs
   */
  async getPendingRequests(): Promise<MembershipRequest[]> {
    const response = await apiClient.get<ApiResponse<PendingRequestsResponse>>(
      '/gym-owner/membership-requests'
    );
    return response.data.data?.requests || [];
  },

  /**
   * Approve a membership request
   * @param requestId - The ID of the membership request to approve
   */
  async approveRequest(requestId: string): Promise<void> {
    await apiClient.post<ApiResponse<{ request: MembershipRequest }>>(
      `/gym-owner/membership-requests/${requestId}/approve`
    );
  },

  /**
   * Reject a membership request
   * @param requestId - The ID of the membership request to reject
   * @param notes - Optional notes explaining the rejection
   */
  async rejectRequest(requestId: string, notes?: string): Promise<void> {
    await apiClient.post<ApiResponse<{ request: MembershipRequest }>>(
      `/gym-owner/membership-requests/${requestId}/reject`,
      { notes }
    );
  },
};

export default membershipRequestService;
