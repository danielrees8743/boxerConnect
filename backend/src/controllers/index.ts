// Controllers Module Exports
// Centralizes all controller exports for clean imports

// Auth Controller
export {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
} from './auth.controller';

// Boxer Controller
export {
  createBoxer,
  getMyBoxer,
  getBoxer,
  updateBoxer,
  searchBoxers,
  deleteBoxerProfile,
  getCompatibleMatches,
  getMySuggestedMatches,
} from './boxer.controller';

// Availability Controller
export {
  createAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  getMyAvailability,
} from './availability.controller';

// Match Request Controller
export {
  createMatchRequest,
  getMyMatchRequests,
  getMatchRequest,
  acceptMatchRequest,
  declineMatchRequest,
  cancelMatchRequest,
  getMatchRequestStats,
} from './matchRequest.controller';

// Coach Controller
export {
  getMyBoxers,
  linkBoxer,
  unlinkBoxer,
  updateBoxerPermissions,
} from './coach.controller';

// Admin Controller
export {
  getUsers,
  updateUserStatus,
  verifyBoxer,
  getStats,
  getPendingVerifications,
} from './admin.controller';

// Profile Photo Controller
export {
  uploadPhoto,
  removePhoto,
} from './profilePhoto.controller';
