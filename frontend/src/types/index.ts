/**
 * Core type definitions for BoxerConnect frontend
 */

// ============================================================================
// Enums
// ============================================================================

// User roles in the system
export type UserRole = 'BOXER' | 'COACH' | 'GYM_OWNER' | 'ADMIN';

// Experience levels for boxers
export enum ExperienceLevel {
  BEGINNER = 'BEGINNER',
  AMATEUR = 'AMATEUR',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PROFESSIONAL = 'PROFESSIONAL',
}

// Gender for boxers
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

// Fight result options
export enum FightResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
  NO_CONTEST = 'NO_CONTEST',
}

// Fight method/ending
export enum FightMethod {
  DECISION = 'DECISION',
  UNANIMOUS_DECISION = 'UNANIMOUS_DECISION',
  SPLIT_DECISION = 'SPLIT_DECISION',
  MAJORITY_DECISION = 'MAJORITY_DECISION',
  KO = 'KO',
  TKO = 'TKO',
  RTD = 'RTD',
  DQ = 'DQ',
  NO_CONTEST = 'NO_CONTEST',
}

// Match request status
export enum MatchRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Coach permission levels
export enum CoachPermission {
  VIEW_PROFILE = 'VIEW_PROFILE',
  EDIT_PROFILE = 'EDIT_PROFILE',
  MANAGE_AVAILABILITY = 'MANAGE_AVAILABILITY',
  RESPOND_TO_MATCHES = 'RESPOND_TO_MATCHES',
  MANAGE_FIGHT_HISTORY = 'MANAGE_FIGHT_HISTORY',
  FULL_ACCESS = 'FULL_ACCESS',
}

// Legacy weight class type (for backwards compatibility)
export type WeightClass =
  | 'minimumweight'
  | 'light_flyweight'
  | 'flyweight'
  | 'super_flyweight'
  | 'bantamweight'
  | 'super_bantamweight'
  | 'featherweight'
  | 'super_featherweight'
  | 'lightweight'
  | 'super_lightweight'
  | 'welterweight'
  | 'super_welterweight'
  | 'middleweight'
  | 'super_middleweight'
  | 'light_heavyweight'
  | 'cruiserweight'
  | 'heavyweight';

// Boxing stance
export type Stance = 'orthodox' | 'southpaw' | 'switch';

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Boxer Types
// ============================================================================

export interface BoxerVideo {
  id: string;
  boxerId?: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface BoxerVideoList {
  videos: BoxerVideo[];
  count: number;
  maxVideos: number;
}

export interface BoxerProfile {
  id: string;
  userId: string;
  name: string;
  gender?: Gender | null;
  weightKg: number | null;
  heightCm: number | null;
  dateOfBirth: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  experienceLevel: ExperienceLevel;
  wins: number;
  losses: number;
  draws: number;
  gymAffiliation: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  isVerified: boolean;
  isSearchable: boolean;
  createdAt: string;
  updatedAt: string;
  // Optional relations
  user?: User;
  fightHistory?: FightHistory[];
  availability?: Availability[];
  videos?: BoxerVideo[];
}

export interface CreateBoxerData {
  name: string;
  gender?: Gender;
  weightKg?: number;
  heightCm?: number;
  dateOfBirth?: string;
  location?: string;
  city?: string;
  country?: string;
  experienceLevel?: ExperienceLevel;
  wins?: number;
  losses?: number;
  draws?: number;
  gymAffiliation?: string;
  bio?: string;
  profilePhotoUrl?: string;
}

export interface UpdateBoxerData {
  name?: string;
  gender?: Gender | null;
  weightKg?: number | null;
  heightCm?: number | null;
  dateOfBirth?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  experienceLevel?: ExperienceLevel;
  wins?: number;
  losses?: number;
  draws?: number;
  gymAffiliation?: string | null;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  isSearchable?: boolean;
}

export interface BoxerSearchParams {
  city?: string;
  country?: string;
  gender?: Gender;
  experienceLevel?: ExperienceLevel;
  minWeight?: number;
  maxWeight?: number;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// Fight History Types
// ============================================================================

export interface FightHistory {
  id: string;
  boxerId: string;
  opponentName: string;
  date: string;
  venue: string | null;
  result: FightResult;
  method: FightMethod | null;
  round: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFightHistoryData {
  opponentName: string;
  date: string;
  venue?: string;
  result: FightResult;
  method?: FightMethod;
  round?: number;
  notes?: string;
}

export interface UpdateFightHistoryData {
  opponentName?: string;
  date?: string;
  venue?: string | null;
  result?: FightResult;
  method?: FightMethod | null;
  round?: number | null;
  notes?: string | null;
}

// ============================================================================
// Availability Types
// ============================================================================

export interface Availability {
  id: string;
  boxerId: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityData {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  notes?: string;
}

export interface UpdateAvailabilityData {
  date?: string;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
  notes?: string | null;
}

// ============================================================================
// Match Request Types
// ============================================================================

export interface MatchRequest {
  id: string;
  requesterBoxerId: string;
  targetBoxerId: string;
  status: MatchRequestStatus;
  message: string | null;
  responseMessage: string | null;
  proposedDate: string | null;
  proposedVenue: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  // Optional relations
  requesterBoxer?: BoxerProfile;
  targetBoxer?: BoxerProfile;
}

export interface CreateMatchRequestData {
  targetBoxerId: string;
  message?: string;
  proposedDate?: string;
  proposedVenue?: string;
}

export interface MatchRequestSearchParams {
  status?: MatchRequestStatus;
  page?: number;
  limit?: number;
}

export interface MatchRequestStats {
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  cancelled: number;
  completed: number;
  total: number;
}

// ============================================================================
// Matching Types
// ============================================================================

export interface MatchSuggestion {
  boxer: BoxerProfile;
  compatibilityScore: number;
  matchReasons: string[];
  distanceKm?: number;
}

export interface CompatibleMatchOptions {
  experienceRange?: number;
  weightRangeKg?: number;
  maxDistanceKm?: number;
  limit?: number;
}

// ============================================================================
// Coach Types
// ============================================================================

export interface CoachBoxer {
  id: string;
  coachUserId: string;
  boxerId: string;
  permissions: CoachPermission;
  createdAt: string;
  updatedAt: string;
  // Optional relations
  coach?: User;
  boxer?: BoxerProfile;
}

export interface CreateCoachBoxerData {
  boxerId: string;
  permissions?: CoachPermission;
}

export interface UpdateCoachBoxerData {
  permissions: CoachPermission;
}

// ============================================================================
// Admin Types
// ============================================================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBoxers: number;
  verifiedBoxers: number;
  pendingVerifications: number;
  totalCoaches: number;
  totalGymOwners: number;
  totalAdmins: number;
  totalClubs: number;
  verifiedClubs: number;
  totalMatchRequests: number;
  pendingMatchRequests: number;
  acceptedMatchRequests: number;
  usersByRole: { role: UserRole; count: number }[];
  recentSignups: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface AdminBoxerData {
  userId: string;
  name: string;
  gender?: Gender;
  weightKg?: number;
  heightCm?: number;
  dateOfBirth?: string;
  city?: string;
  country?: string;
  experienceLevel?: ExperienceLevel;
  wins?: number;
  losses?: number;
  draws?: number;
  gymAffiliation?: string;
  bio?: string;
  isVerified?: boolean;
  clubId?: string;
}

export interface UpdateAdminBoxerData {
  name?: string;
  gender?: Gender | null;
  weightKg?: number | null;
  heightCm?: number | null;
  dateOfBirth?: string | null;
  city?: string | null;
  country?: string | null;
  experienceLevel?: ExperienceLevel;
  wins?: number;
  losses?: number;
  draws?: number;
  gymAffiliation?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  isSearchable?: boolean;
  clubId?: string | null;
}

// ============================================================================
// Club Types
// ============================================================================

export interface OperatingHours {
  [day: string]: DaySchedule;
}

export interface DaySchedule {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface PricingTier {
  name: string;
  price: number;
  interval: string;
  description?: string;
}

export interface Club {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  postcode?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerified: boolean;
  ownerId?: string | null;
  owner?: User | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    boxers: number;
    coaches: number;
  };
  // Enhanced Profile Fields
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  foundedYear?: number | null;
  capacity?: number | null;
  amenities?: string[];
  photos?: string[];
  operatingHours?: OperatingHours | null;
  pricingTiers?: PricingTier[] | null;
  specialties?: string[];
  ageGroupsServed?: string[];
  acceptingMembers?: boolean;
  isPublished?: boolean;
  headCoachName?: string | null;
  headCoachBio?: string | null;
  headCoachPhotoUrl?: string | null;
  achievements?: string[];
  affiliations?: string[];
  certifications?: string[];
  languages?: string[];
  parkingInfo?: string | null;
  publicTransportInfo?: string | null;
  accessibility?: string[];
  memberCount?: number | null;
  coachCount?: number | null;
  establishedDate?: string | null;
  lastVerifiedAt?: string | null;
  verificationNotes?: string | null;
}

export interface CreateClubData {
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  postcode?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  ownerId?: string;
  isVerified?: boolean;
  // Enhanced Profile Fields
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  foundedYear?: number;
  capacity?: number;
  amenities?: string[];
  photos?: string[];
  operatingHours?: OperatingHours;
  pricingTiers?: PricingTier[];
  specialties?: string[];
  ageGroupsServed?: string[];
  acceptingMembers?: boolean;
  isPublished?: boolean;
  headCoachName?: string;
  headCoachBio?: string;
  headCoachPhotoUrl?: string;
  achievements?: string[];
  affiliations?: string[];
  certifications?: string[];
  languages?: string[];
  parkingInfo?: string;
  publicTransportInfo?: string;
  accessibility?: string[];
  memberCount?: number;
  coachCount?: number;
  establishedDate?: string;
}

export interface UpdateClubData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  postcode?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ownerId?: string | null;
  isVerified?: boolean;
  // Enhanced Profile Fields
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  foundedYear?: number | null;
  capacity?: number | null;
  amenities?: string[];
  photos?: string[];
  operatingHours?: OperatingHours | null;
  pricingTiers?: PricingTier[] | null;
  specialties?: string[];
  ageGroupsServed?: string[];
  acceptingMembers?: boolean;
  isPublished?: boolean;
  headCoachName?: string | null;
  headCoachBio?: string | null;
  headCoachPhotoUrl?: string | null;
  achievements?: string[];
  affiliations?: string[];
  certifications?: string[];
  languages?: string[];
  parkingInfo?: string | null;
  publicTransportInfo?: string | null;
  accessibility?: string[];
  memberCount?: number | null;
  coachCount?: number | null;
  establishedDate?: string | null;
}

export interface AdminUserSearchParams {
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminBoxerSearchParams {
  isVerified?: boolean;
  clubId?: string;
  page?: number;
  limit?: number;
}

export interface AdminClubSearchParams {
  isVerified?: boolean;
  region?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  clubId?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: ValidationError[];
  statusCode?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  message?: string;
}
