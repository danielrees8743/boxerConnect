// Middleware Module Exports
// Centralizes all middleware exports for clean imports

export {
  errorHandler,
  notFoundHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
} from './errorHandler';

export {
  standardLimiter,
  strictLimiter,
  authLimiter,
  passwordResetLimiter,
  createResourceLimiter,
  searchLimiter,
} from './rateLimiter';

export {
  authenticate,
  optionalAuth,
  requireRole,
  requireBoxer,
  requireCoach,
  requireGymOwner,
  requireAdmin,
  requireElevatedRole,
} from './auth.middleware';
