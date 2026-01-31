// Validators Module Exports
// Centralizes all validator exports for clean imports

export {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshTokenInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './auth.validators';

export {
  createBoxerSchema,
  updateBoxerSchema,
  boxerSearchSchema,
  boxerIdSchema,
  type CreateBoxerInput,
  type UpdateBoxerInput,
  type BoxerSearchInput,
  type BoxerIdInput,
} from './boxer.validators';

export {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  availabilityQuerySchema,
  availabilityIdSchema,
  availabilityBoxerIdSchema,
  type CreateAvailabilityInput,
  type UpdateAvailabilityInput,
  type AvailabilityQueryInput,
  type AvailabilityIdInput,
  type AvailabilityBoxerIdInput,
} from './availability.validators';

export {
  createMatchRequestSchema,
  updateMatchRequestStatusSchema,
  matchRequestSearchSchema,
  matchRequestIdSchema,
  matchRequestResponseSchema,
  type CreateMatchRequestInput,
  type UpdateMatchRequestStatusInput,
  type MatchRequestSearchInput,
  type MatchRequestIdInput,
  type MatchRequestResponseInput,
} from './matchRequest.validators';

export {
  linkBoxerSchema,
  updatePermissionsSchema,
  coachBoxerIdSchema,
  type LinkBoxerInput,
  type UpdatePermissionsInput,
  type CoachBoxerIdInput,
} from './coach.validators';

export {
  updateUserStatusSchema,
  verifyBoxerSchema,
  userSearchSchema,
  userIdSchema,
  adminBoxerIdSchema,
  paginationSchema,
  type UpdateUserStatusInput,
  type VerifyBoxerInput,
  type UserSearchInput,
  type UserIdInput,
  type AdminBoxerIdInput,
  type PaginationInput,
} from './admin.validators';
