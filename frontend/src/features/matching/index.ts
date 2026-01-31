/**
 * Matching feature exports
 */

export { default as matchingReducer } from './matchingSlice';
export {
  fetchCompatibleMatches,
  fetchSuggestedMatches,
  fetchSimilarBoxers,
  fetchNearbyBoxers,
  setFilters,
  clearFilters,
  clearError,
  clearMatches,
} from './matchingSlice';
