import { apiClient, uploadFile } from './apiClient';
import type {
  BoxerProfile,
  BoxerVideo,
  BoxerVideoList,
  CreateBoxerData,
  UpdateBoxerData,
  BoxerSearchParams,
  ApiResponse,
  PaginatedResponse,
  FightHistory,
  CreateFightHistoryData,
  UpdateFightHistoryData,
} from '@/types';

/**
 * Boxer service for managing boxer profiles.
 * Handles CRUD operations and search functionality.
 */
export const boxerService = {
  /**
   * Create a new boxer profile for the current user
   */
  async createBoxer(data: CreateBoxerData): Promise<BoxerProfile> {
    const response = await apiClient.post<ApiResponse<{ boxer: BoxerProfile }>>('/boxers', data);
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to create boxer profile');
    }
    return response.data.data.boxer;
  },

  /**
   * Get the current authenticated user's boxer profile
   */
  async getMyBoxer(): Promise<BoxerProfile> {
    const response = await apiClient.get<ApiResponse<{ boxer: BoxerProfile }>>('/boxers/me');
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Boxer profile not found');
    }
    return response.data.data.boxer;
  },

  /**
   * Get a boxer profile by ID
   */
  async getBoxer(id: string): Promise<BoxerProfile> {
    const response = await apiClient.get<ApiResponse<{ boxer: BoxerProfile }>>(`/boxers/${id}`);
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Boxer not found');
    }
    return response.data.data.boxer;
  },

  /**
   * Update a boxer profile
   */
  async updateBoxer(id: string, data: UpdateBoxerData): Promise<BoxerProfile> {
    const response = await apiClient.put<ApiResponse<{ boxer: BoxerProfile }>>(`/boxers/${id}`, data);
    if (!response.data.data?.boxer) {
      throw new Error(response.data.message || 'Failed to update boxer profile');
    }
    return response.data.data.boxer;
  },

  /**
   * Search boxers with filters
   */
  async searchBoxers(params?: BoxerSearchParams): Promise<PaginatedResponse<BoxerProfile>> {
    const response = await apiClient.get<PaginatedResponse<BoxerProfile>>('/boxers', {
      params,
    });
    return response.data;
  },

  /**
   * Delete a boxer profile
   */
  async deleteBoxer(id: string): Promise<void> {
    await apiClient.delete(`/boxers/${id}`);
  },

  /**
   * Upload a profile photo for the current user's boxer profile.
   * Uses multipart/form-data for file upload.
   *
   * @param file - The image file to upload (max 5MB, jpeg/png/webp/gif)
   * @returns Promise resolving to the new profile photo URL
   */
  async uploadProfilePhoto(file: File): Promise<{ profilePhotoUrl: string }> {
    const response = await uploadFile<ApiResponse<{ profilePhotoUrl: string }>>(
      '/boxers/me/photo',
      file,
      'photo'
    );
    if (!response.data?.profilePhotoUrl) {
      throw new Error(response.message || 'Failed to upload profile photo');
    }
    return { profilePhotoUrl: response.data.profilePhotoUrl };
  },

  /**
   * Remove the profile photo for the current user's boxer profile.
   */
  async removeProfilePhoto(): Promise<void> {
    await apiClient.delete('/boxers/me/photo');
  },

  /**
   * Upload a training video for the current user's boxer profile.
   * Uses multipart/form-data for file upload.
   *
   * @param file - The video file to upload (max 100MB, mp4/webm/mov/avi)
   * @returns Promise resolving to the uploaded video details
   */
  async uploadVideo(file: File): Promise<BoxerVideo> {
    const response = await uploadFile<ApiResponse<{ video: BoxerVideo }>>(
      '/boxers/me/videos',
      file,
      'video'
    );
    if (!response.data?.video) {
      throw new Error(response.message || 'Failed to upload video');
    }
    return response.data.video;
  },

  /**
   * Get all videos for the current user's boxer profile.
   */
  async getMyVideos(): Promise<BoxerVideoList> {
    const response = await apiClient.get<ApiResponse<BoxerVideoList>>('/boxers/me/videos');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to get videos');
    }
    return response.data.data;
  },

  /**
   * Delete a video from the current user's boxer profile.
   */
  async deleteVideo(videoId: string): Promise<void> {
    await apiClient.delete(`/boxers/me/videos/${videoId}`);
  },

  /**
   * Get videos for a boxer by ID (public).
   */
  async getBoxerVideos(boxerId: string): Promise<BoxerVideoList> {
    const response = await apiClient.get<ApiResponse<BoxerVideoList>>(`/boxers/${boxerId}/videos`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to get videos');
    }
    return response.data.data;
  },

  // ============================================================================
  // Fight History Methods
  // ============================================================================

  /**
   * Get all fight history for the current user's boxer profile.
   */
  async getMyFights(): Promise<{ fights: FightHistory[]; count: number }> {
    const response = await apiClient.get<
      ApiResponse<{ fights: FightHistory[]; count: number }>
    >('/boxers/me/fights');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to get fight history');
    }
    return response.data.data;
  },

  /**
   * @deprecated Boxers can no longer manage their own fight history.
   * Use createFightForBoxer() instead (requires coach/gym owner role).
   */
  async createFight(_data: CreateFightHistoryData): Promise<FightHistory> {
    throw new Error('Boxers cannot manage their own fight history. Please contact your coach or gym owner.');
  },

  /**
   * @deprecated Boxers can no longer manage their own fight history.
   * Use updateFightForBoxer() instead (requires coach/gym owner role).
   */
  async updateFight(_fightId: string, _data: UpdateFightHistoryData): Promise<FightHistory> {
    throw new Error('Boxers cannot manage their own fight history. Please contact your coach or gym owner.');
  },

  /**
   * @deprecated Boxers can no longer manage their own fight history.
   * Use deleteFightForBoxer() instead (requires coach/gym owner role).
   */
  async deleteFight(_fightId: string): Promise<void> {
    throw new Error('Boxers cannot manage their own fight history. Please contact your coach or gym owner.');
  },

  /**
   * Get fight history for a boxer by ID (public).
   */
  async getBoxerFights(boxerId: string): Promise<{ fights: FightHistory[]; count: number }> {
    const response = await apiClient.get<
      ApiResponse<{ fights: FightHistory[]; count: number }>
    >(`/boxers/${boxerId}/fights`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to get fight history');
    }
    return response.data.data;
  },

  // ============================================================================
  // Coach/Gym Owner Fight Management Methods
  // ============================================================================

  /**
   * Create a fight history entry for a linked boxer (coach/gym owner only).
   */
  async createFightForBoxer(
    boxerId: string,
    data: CreateFightHistoryData
  ): Promise<FightHistory> {
    const response = await apiClient.post<ApiResponse<{ fight: FightHistory }>>(
      `/boxers/${boxerId}/fights`,
      data
    );
    if (!response.data.data?.fight) {
      throw new Error(response.data.message || 'Failed to create fight history');
    }
    return response.data.data.fight;
  },

  /**
   * Update a fight history entry for a linked boxer (coach/gym owner only).
   */
  async updateFightForBoxer(
    boxerId: string,
    fightId: string,
    data: UpdateFightHistoryData
  ): Promise<FightHistory> {
    const response = await apiClient.put<ApiResponse<{ fight: FightHistory }>>(
      `/boxers/${boxerId}/fights/${fightId}`,
      data
    );
    if (!response.data.data?.fight) {
      throw new Error(response.data.message || 'Failed to update fight history');
    }
    return response.data.data.fight;
  },

  /**
   * Delete a fight history entry for a linked boxer (coach/gym owner only).
   */
  async deleteFightForBoxer(boxerId: string, fightId: string): Promise<void> {
    await apiClient.delete(`/boxers/${boxerId}/fights/${fightId}`);
  },
};

export default boxerService;
