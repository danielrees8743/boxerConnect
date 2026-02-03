import { apiClient } from './apiClient';
import type { Club, User, BoxerProfile, Gender, ExperienceLevel } from '@/types';
import type { ClubWithMembers } from '@/features/gym-owner/gymOwnerSlice';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateBoxerAccountData {
  email: string;
  password: string;
  name: string;
  experienceLevel?: ExperienceLevel;
  gender?: Gender;
  weightKg?: number;
  heightCm?: number;
  dateOfBirth?: string;
  city?: string;
  country?: string;
}

export interface CreateBoxerAccountResponse {
  user: User;
  boxer: BoxerProfile;
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

  /**
   * Create a boxer account for a club
   * Creates a new user account with BOXER role and links them to the club
   */
  async createBoxerAccount(
    clubId: string,
    data: CreateBoxerAccountData
  ): Promise<CreateBoxerAccountResponse> {
    const response = await apiClient.post<
      ApiResponse<CreateBoxerAccountResponse>
    >(`/gym-owner/clubs/${clubId}/boxers/create-account`, data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create boxer account');
    }
    return response.data.data;
  },
};

export default gymOwnerService;
