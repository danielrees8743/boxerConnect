import { apiClient, uploadFile } from './apiClient';
import type {
  BoxerProfile,
  CreateBoxerData,
  UpdateBoxerData,
  BoxerSearchParams,
  ApiResponse,
  PaginatedResponse,
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
};

export default boxerService;
