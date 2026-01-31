// Services Module Exports
// Centralizes all service exports for clean imports

// Auth Service
export {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getUserById,
  requestPasswordReset,
  resetPassword,
  type TokenPayload,
  type AuthTokens,
  type AuthResult,
} from './auth.service';

// Boxer Service
export {
  createBoxer,
  getBoxerById,
  getBoxerByUserId,
  updateBoxer,
  searchBoxers,
  deleteBoxer,
  getTotalFights,
  type BoxerWithUser,
  type PaginatedBoxers,
} from './boxer.service';

// Matching Service
export {
  MATCHING_RULES,
  calculateMatchScore,
  findCompatibleBoxers,
  getSuggestedMatches,
  invalidateMatchCache,
  type MatchScore,
  type MatchingOptions,
  type CompatibleBoxersResult,
} from './matching.service';

// Availability Service
export {
  createAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  getAllAvailabilityForBoxer,
  deletePastAvailability,
  isBoxerAvailable,
  type AvailabilityWithBoxer,
} from './availability.service';

// Match Request Service
export {
  createMatchRequest as createMatchRequestService,
  getMatchRequestById,
  getMatchRequestsForBoxer,
  acceptMatchRequest as acceptMatchRequestService,
  declineMatchRequest as declineMatchRequestService,
  cancelMatchRequest as cancelMatchRequestService,
  expireOldRequests,
  getRequestStats,
  type MatchRequestWithBoxers,
  type PaginatedMatchRequests,
  type MatchRequestStats,
} from './matchRequest.service';

// Coach Service
export {
  linkBoxer,
  unlinkBoxer,
  updatePermissions,
  getCoachBoxers,
  getBoxerCoaches,
  hasPermission,
  getCoachBoxerRelation,
  type CoachBoxerWithDetails,
  type BoxerCoachWithDetails,
} from './coach.service';

// Admin Service
export {
  getAllUsers,
  updateUserStatus,
  verifyBoxer,
  getSystemStats,
  getPendingVerifications,
  searchUsers,
  getUserById as getAdminUserById,
  type PaginatedUsers,
  type SafeUser as AdminSafeUser,
  type UserSearchParams,
  type PendingVerification,
  type PaginatedPendingVerifications,
  type SystemStats,
} from './admin.service';
