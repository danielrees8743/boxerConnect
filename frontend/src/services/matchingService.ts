import { apiClient } from './apiClient';
import type {
  MatchSuggestion,
  CompatibleMatchOptions,
  ApiResponse,
  BoxerProfile,
} from '@/types';

/**
 * Backend match response format (different from frontend MatchSuggestion)
 */
interface BackendMatchResponse {
  boxerId: string;
  boxer: BoxerProfile;
  score: number;
  weightDifference: number;
  fightsDifference: number;
  sameCity: boolean;
  sameCountry: boolean;
  compatibleExperience: boolean;
}

/**
 * Transform backend match response to frontend MatchSuggestion format
 */
function transformMatch(match: BackendMatchResponse): MatchSuggestion {
  const matchReasons: string[] = [];

  if (match.compatibleExperience) {
    matchReasons.push('Similar experience');
  }
  if (match.weightDifference <= 2) {
    matchReasons.push('Close weight');
  }
  if (match.fightsDifference <= 2) {
    matchReasons.push('Similar record');
  }
  if (match.sameCity) {
    matchReasons.push('Same city');
  } else if (match.sameCountry) {
    matchReasons.push('Same country');
  }

  return {
    boxer: match.boxer,
    compatibilityScore: match.score,
    matchReasons: matchReasons.length > 0 ? matchReasons : ['Compatible match'],
  };
}

/**
 * Matching service for boxer match suggestions.
 * Provides compatibility-based and AI-suggested matches.
 */
export const matchingService = {
  /**
   * Get compatible matches for a specific boxer
   * Matches are based on experience level, weight, and location
   * GET /api/v1/boxers/:id/matches
   */
  async getCompatibleMatches(
    boxerId: string,
    options?: CompatibleMatchOptions
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<{ matches: BackendMatchResponse[]; total: number }>>(
      `/boxers/${boxerId}/matches`,
      { params: options }
    );
    const matches = response.data.data?.matches || [];
    return matches.map(transformMatch);
  },

  /**
   * Get AI-suggested matches for the current user's boxer
   * GET /api/v1/boxers/me/suggestions
   */
  async getSuggestedMatches(limit?: number): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<{ suggestions: BackendMatchResponse[]; total: number }>>(
      '/boxers/me/suggestions',
      { params: { limit } }
    );
    const suggestions = response.data.data?.suggestions || [];
    return suggestions.map(transformMatch);
  },

  /**
   * Get matches based on similar experience and weight class
   * Uses the same endpoint as compatible matches with different options
   */
  async getSimilarBoxers(
    boxerId: string,
    options?: { limit?: number }
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<{ matches: BackendMatchResponse[]; total: number }>>(
      `/boxers/${boxerId}/matches`,
      { params: options }
    );
    const matches = response.data.data?.matches || [];
    return matches.map(transformMatch);
  },

  /**
   * Get nearby boxers within a certain distance
   * Uses the same endpoint as compatible matches with location filter
   */
  async getNearbyBoxers(
    boxerId: string,
    maxDistanceKm?: number,
    limit?: number
  ): Promise<MatchSuggestion[]> {
    const response = await apiClient.get<ApiResponse<{ matches: BackendMatchResponse[]; total: number }>>(
      `/boxers/${boxerId}/matches`,
      { params: { maxDistanceKm, limit } }
    );
    const matches = response.data.data?.matches || [];
    return matches.map(transformMatch);
  },
};

export default matchingService;
