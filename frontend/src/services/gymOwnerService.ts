import { apiClient } from './apiClient';
import type { Club } from '@/types';
import type { ClubWithMembers } from '@/features/gym-owner/gymOwnerSlice';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Gym owner service for managing clubs and their members.
 * All endpoints require authentication with GYM_OWNER role.
 */
export const gymOwnerService = {
  /**
   * Get all clubs owned by the authenticated gym owner
   */
  async getMyClubs(): Promise<Club[]> {
    const response = await apiClient.get<ApiResponse<{ clubs: Club[] }>>('/clubs/my-clubs');
    return response.data.data?.clubs || [];
  },

  /**
   * Get a specific club with all its members (boxers and coaches)
   */
  async getClubWithMembers(clubId: string): Promise<ClubWithMembers> {
    const response = await apiClient.get<ApiResponse<{ club: ClubWithMembers }>>(
      `/clubs/${clubId}/members`
    );
    if (!response.data.data?.club) {
      throw new Error(response.data.message || 'Club not found');
    }
    return response.data.data.club;
  },
};

export default gymOwnerService;
