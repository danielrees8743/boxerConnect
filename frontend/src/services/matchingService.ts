import { apiClient } from './apiClient';
import type {
  MatchSuggestion,
  CompatibleMatchOptions,
  ApiResponse,
} from '@/types';

/**
 * Matching service for boxer match suggestions.
 * Provides compatibility-based and AI-suggested matches.
 */
export const matchingService = {
  /**
   * Get compatible matches for a specific boxer
   * Matches are based on experience level, weight, and location
   */
  async getCompatibleMatches(
    boxerId: string,
    options?: CompatibleMatchOptions
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<MatchSuggestion[]>>(
      `/matching/${boxerId}/compatible`,
      { params: options }
    );
    return response.data.data || [];
  },

  /**
   * Get AI-suggested matches for the current user's boxer
   * Uses machine learning to suggest optimal matchups
   */
  async getSuggestedMatches(limit?: number): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<MatchSuggestion[]>>(
      '/matching/suggestions',
      { params: { limit } }
    );
    return response.data.data || [];
  },

  /**
   * Get matches based on similar experience and weight class
   */
  async getSimilarBoxers(
    boxerId: string,
    options?: { limit?: number }
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<MatchSuggestion[]>>(
      `/matching/${boxerId}/similar`,
      { params: options }
    );
    return response.data.data || [];
  },

  /**
   * Get nearby boxers within a certain distance
   */
  async getNearbyBoxers(
    boxerId: string,
    maxDistanceKm?: number,
    limit?: number
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<MatchSuggestion[]>>(
      `/matching/${boxerId}/nearby`,
      { params: { maxDistanceKm, limit } }
    );
    return response.data.data || [];
  },
};

export default matchingService;
