import { apiClient } from './apiClient';
import type {
  Availability,
  CreateAvailabilityData,
  UpdateAvailabilityData,
  ApiResponse,
} from '@/types';

/**
 * Availability service for managing boxer availability slots.
 * Handles CRUD operations for training/sparring availability.
 */
export const availabilityService = {
  /**
   * Create a new availability slot for a boxer
   */
  async createAvailability(
    boxerId: string,
    data: CreateAvailabilityData
  ): Promise<Availability> {
    const response = await apiClient.post<ApiResponse<Availability>>(
      `/boxers/${boxerId}/availability`,
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create availability slot');
    }
    return response.data.data;
  },

  /**
   * Get availability slots for a boxer within a date range
   */
  async getAvailability(
    boxerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Availability[]> {
    const response = await apiClient.get<ApiResponse<Availability[]>>(
      `/boxers/${boxerId}/availability`,
      {
        params: {
          startDate,
          endDate,
        },
      }
    );
    return response.data.data || [];
  },

  /**
   * Get the current authenticated user's availability
   */
  async getMyAvailability(startDate?: string, endDate?: string): Promise<Availability[]> {
    const response = await apiClient.get<ApiResponse<Availability[]>>(
      '/boxers/me/availability',
      {
        params: {
          startDate,
          endDate,
        },
      }
    );
    return response.data.data || [];
  },

  /**
   * Update an availability slot
   */
  async updateAvailability(
    boxerId: string,
    availabilityId: string,
    data: UpdateAvailabilityData
  ): Promise<Availability> {
    const response = await apiClient.patch<ApiResponse<Availability>>(
      `/boxers/${boxerId}/availability/${availabilityId}`,
      data
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update availability slot');
    }
    return response.data.data;
  },

  /**
   * Delete an availability slot
   */
  async deleteAvailability(boxerId: string, availabilityId: string): Promise<void> {
    await apiClient.delete(`/boxers/${boxerId}/availability/${availabilityId}`);
  },

  /**
   * Bulk create availability slots
   */
  async bulkCreateAvailability(
    boxerId: string,
    slots: CreateAvailabilityData[]
  ): Promise<Availability[]> {
    const response = await apiClient.post<ApiResponse<Availability[]>>(
      `/boxers/${boxerId}/availability/bulk`,
      { slots }
    );
    return response.data.data || [];
  },

  /**
   * Check if a boxer is available at a specific date and time
   */
  async checkAvailability(
    boxerId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const response = await apiClient.get<ApiResponse<{ isAvailable: boolean }>>(
      `/boxers/${boxerId}/availability/check`,
      {
        params: {
          date,
          startTime,
          endTime,
        },
      }
    );
    return response.data.data?.isAvailable || false;
  },
};

export default availabilityService;
