// Admin Service
// Handles all admin-related business logic

import { User, Boxer, Club, UserRole, ExperienceLevel, Prisma } from '@prisma/client';
import { prisma } from '../config';
import { hashPassword } from './auth.service';
import type {
  CreateUserInput,
  UpdateUserInput,
  CreateBoxerAdminInput,
  UpdateBoxerAdminInput,
  CreateClubInput,
  UpdateClubInput,
} from '../validators/admin.validators';

// ============================================================================
// Types
// ============================================================================

export interface PaginatedUsers {
  users: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchParams {
  role: UserRole | undefined;
  isActive: boolean | undefined;
  page: number;
  limit: number;
}

export interface PendingVerification {
  id: string;
  name: string;
  experienceLevel: string;
  city: string | null;
  country: string | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface PaginatedPendingVerifications {
  boxers: PendingVerification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemStats {
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
  usersByRole: {
    role: UserRole;
    count: number;
  }[];
  recentSignups: number; // Last 7 days
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Remove password hash from user object
 */
function sanitizeUser(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// ============================================================================
// Admin Service Methods
// ============================================================================

/**
 * Get all users with filtering and pagination
 */
export async function getAllUsers(params: UserSearchParams): Promise<PaginatedUsers> {
  const { role, isActive, page, limit } = params;

  // Build where clause
  const where: Prisma.UserWhereInput = {};

  if (role !== undefined) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(sanitizeUser),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update user active status (activate/deactivate)
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<SafeUser> {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deactivating the last admin
  if (!isActive && user.role === UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    if (adminCount <= 1) {
      throw new Error('Cannot deactivate the last active admin');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  return sanitizeUser(updatedUser);
}

/**
 * Verify or unverify a boxer
 */
export async function verifyBoxer(
  boxerId: string,
  isVerified: boolean
): Promise<Boxer> {
  // Check if boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    include: { user: { select: { isActive: true } } },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  if (!boxer.user.isActive) {
    throw new Error('Cannot verify inactive user');
  }

  return prisma.boxer.update({
    where: { id: boxerId },
    data: { isVerified },
  });
}

/**
 * Get system-wide statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Execute all counts in parallel for performance
  const [
    totalUsers,
    activeUsers,
    totalBoxers,
    verifiedBoxers,
    pendingVerifications,
    totalCoaches,
    totalGymOwners,
    totalAdmins,
    totalClubs,
    verifiedClubs,
    totalMatchRequests,
    pendingMatchRequests,
    acceptedMatchRequests,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.boxer.count(),
    prisma.boxer.count({ where: { isVerified: true } }),
    prisma.boxer.count({ where: { isVerified: false } }),
    prisma.user.count({ where: { role: UserRole.COACH } }),
    prisma.user.count({ where: { role: UserRole.GYM_OWNER } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.club.count(),
    prisma.club.count({ where: { isVerified: true } }),
    prisma.matchRequest.count(),
    prisma.matchRequest.count({ where: { status: 'PENDING' } }),
    prisma.matchRequest.count({ where: { status: 'ACCEPTED' } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ]);

  // Get user counts by role
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
  });

  return {
    totalUsers,
    activeUsers,
    totalBoxers,
    verifiedBoxers,
    pendingVerifications,
    totalCoaches,
    totalGymOwners,
    totalAdmins,
    totalClubs,
    verifiedClubs,
    totalMatchRequests,
    pendingMatchRequests,
    acceptedMatchRequests,
    usersByRole: usersByRole.map((item) => ({
      role: item.role,
      count: item._count.role,
    })),
    recentSignups,
  };
}

/**
 * Get boxers pending verification
 */
export async function getPendingVerifications(
  page: number,
  limit: number
): Promise<PaginatedPendingVerifications> {
  const skip = (page - 1) * limit;

  const [boxers, total] = await Promise.all([
    prisma.boxer.findMany({
      where: {
        isVerified: false,
        user: { isActive: true },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' }, // Oldest first (FIFO for verification queue)
      select: {
        id: true,
        name: true,
        experienceLevel: true,
        city: true,
        country: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.boxer.count({
      where: {
        isVerified: false,
        user: { isActive: true },
      },
    }),
  ]);

  return {
    boxers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Search users by name or email
 */
export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedUsers> {
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(sanitizeUser),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single user by ID (for admin viewing)
 */
export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return sanitizeUser(user);
}

// ============================================================================
// User CRUD Methods (Admin)
// ============================================================================

/**
 * Create a new user (admin only)
 */
export async function createUser(data: CreateUserInput): Promise<SafeUser> {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already in use');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      isActive: true,
      emailVerified: false,
    },
  });

  return sanitizeUser(user);
}

/**
 * Update a user's details (admin only)
 */
export async function updateUser(
  userId: string,
  data: UpdateUserInput
): Promise<SafeUser> {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If changing email, check it's not already in use
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }
  }

  // Prevent changing the last admin's role
  if (data.role && data.role !== UserRole.ADMIN && user.role === UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    if (adminCount <= 1) {
      throw new Error('Cannot change the role of the last active admin');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.email && { email: data.email }),
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role }),
    },
  });

  return sanitizeUser(updatedUser);
}

/**
 * Delete a user (soft delete by deactivating)
 */
export async function deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deleting the last admin
  if (user.role === UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });

    if (adminCount <= 1) {
      throw new Error('Cannot delete the last active admin');
    }
  }

  // Soft delete by deactivating
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

// ============================================================================
// Boxer CRUD Methods (Admin)
// ============================================================================

export interface BoxerWithUser extends Boxer {
  user: SafeUser;
}

/**
 * Get all boxers with pagination (admin)
 */
export interface PaginatedBoxers {
  boxers: BoxerWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BoxerSearchParams {
  isVerified?: boolean | undefined;
  clubId?: string | undefined;
  page: number;
  limit: number;
}

export async function getAllBoxers(params: BoxerSearchParams): Promise<PaginatedBoxers> {
  const { isVerified, clubId, page, limit } = params;

  const where: Prisma.BoxerWhereInput = {};

  if (isVerified !== undefined) {
    where.isVerified = isVerified;
  }

  if (clubId) {
    where.clubId = clubId;
  }

  const skip = (page - 1) * limit;

  const [boxers, total] = await Promise.all([
    prisma.boxer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        club: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.boxer.count({ where }),
  ]);

  return {
    boxers: boxers.map((boxer) => ({
      ...boxer,
      user: sanitizeUser(boxer.user),
    })) as BoxerWithUser[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single boxer by ID (admin)
 */
export async function getBoxerById(boxerId: string): Promise<BoxerWithUser | null> {
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    include: {
      user: true,
      club: true,
    },
  });

  if (!boxer) {
    return null;
  }

  return {
    ...boxer,
    user: sanitizeUser(boxer.user),
  } as BoxerWithUser;
}

/**
 * Create a boxer profile for a user (admin only)
 */
export async function createBoxerAsAdmin(data: CreateBoxerAdminInput): Promise<Boxer> {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user already has a boxer profile
  const existingBoxer = await prisma.boxer.findUnique({
    where: { userId: data.userId },
  });

  if (existingBoxer) {
    throw new Error('User already has a boxer profile');
  }

  // If clubId is provided, verify it exists
  if (data.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: data.clubId },
    });

    if (!club) {
      throw new Error('Club not found');
    }
  }

  const createData: Prisma.BoxerUncheckedCreateInput = {
    userId: data.userId,
    name: data.name,
    experienceLevel: data.experienceLevel ?? ExperienceLevel.BEGINNER,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    draws: data.draws ?? 0,
    isVerified: data.isVerified ?? false,
  };

  // Only add optional fields if they are defined
  if (data.gender !== undefined) createData.gender = data.gender;
  if (data.weightKg !== undefined) createData.weightKg = data.weightKg;
  if (data.heightCm !== undefined) createData.heightCm = data.heightCm;
  if (data.dateOfBirth !== undefined) createData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.city !== undefined) createData.city = data.city;
  if (data.country !== undefined) createData.country = data.country;
  if (data.gymAffiliation !== undefined) createData.gymAffiliation = data.gymAffiliation;
  if (data.bio !== undefined) createData.bio = data.bio;
  if (data.clubId !== undefined) createData.clubId = data.clubId;

  const boxer = await prisma.boxer.create({
    data: createData,
  });

  return boxer;
}

/**
 * Update any boxer profile (admin only)
 */
export async function updateBoxerAsAdmin(
  boxerId: string,
  data: UpdateBoxerAdminInput
): Promise<Boxer> {
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  // If clubId is provided, verify it exists
  if (data.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: data.clubId },
    });

    if (!club) {
      throw new Error('Club not found');
    }
  }

  const updatedBoxer = await prisma.boxer.update({
    where: { id: boxerId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
      ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
      ...(data.wins !== undefined && { wins: data.wins }),
      ...(data.losses !== undefined && { losses: data.losses }),
      ...(data.draws !== undefined && { draws: data.draws }),
      ...(data.gymAffiliation !== undefined && { gymAffiliation: data.gymAffiliation }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
      ...(data.isSearchable !== undefined && { isSearchable: data.isSearchable }),
      ...(data.clubId !== undefined && { clubId: data.clubId }),
    },
  });

  return updatedBoxer;
}

/**
 * Delete a boxer profile (admin only)
 */
export async function deleteBoxerAsAdmin(boxerId: string): Promise<void> {
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  await prisma.boxer.delete({
    where: { id: boxerId },
  });
}

// ============================================================================
// Club CRUD Methods (Admin)
// ============================================================================

export interface ClubWithMembers extends Club {
  owner: SafeUser | null;
  _count: {
    boxers: number;
    coaches: number;
  };
}

export interface PaginatedClubs {
  clubs: ClubWithMembers[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClubSearchParams {
  isVerified?: boolean | undefined;
  region?: string | undefined;
  page: number;
  limit: number;
}

/**
 * Get all clubs with pagination (admin)
 */
export async function getAllClubs(params: ClubSearchParams): Promise<PaginatedClubs> {
  const { isVerified, region, page, limit } = params;

  const where: Prisma.ClubWhereInput = {};

  if (isVerified !== undefined) {
    where.isVerified = isVerified;
  }

  if (region) {
    where.region = { contains: region, mode: 'insensitive' };
  }

  const skip = (page - 1) * limit;

  const [clubs, total] = await Promise.all([
    prisma.club.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        _count: {
          select: {
            boxers: true,
            coaches: true,
          },
        },
      },
    }),
    prisma.club.count({ where }),
  ]);

  return {
    clubs: clubs.map((club) => ({
      ...club,
      owner: club.owner ? sanitizeUser(club.owner) : null,
    })) as ClubWithMembers[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single club by ID (admin)
 */
export async function getClubById(clubId: string): Promise<ClubWithMembers | null> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      owner: true,
      _count: {
        select: {
          boxers: true,
          coaches: true,
        },
      },
    },
  });

  if (!club) {
    return null;
  }

  return {
    ...club,
    owner: club.owner ? sanitizeUser(club.owner) : null,
  } as ClubWithMembers;
}

/**
 * Create a new club (admin only)
 */
export async function createClub(data: CreateClubInput): Promise<Club> {
  // If ownerId is provided, verify the user exists and is a GYM_OWNER
  if (data.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerId },
    });

    if (!owner) {
      throw new Error('Owner user not found');
    }

    if (owner.role !== UserRole.GYM_OWNER && owner.role !== UserRole.ADMIN) {
      throw new Error('Owner must be a gym owner or admin');
    }
  }

  const createData: Prisma.ClubUncheckedCreateInput = {
    name: data.name,
    isVerified: data.isVerified ?? false,
  };

  // Only add optional fields if they are defined
  if (data.email !== undefined) createData.email = data.email;
  if (data.phone !== undefined) createData.phone = data.phone;
  if (data.contactName !== undefined) createData.contactName = data.contactName;
  if (data.postcode !== undefined) createData.postcode = data.postcode;
  if (data.region !== undefined) createData.region = data.region;
  if (data.latitude !== undefined) createData.latitude = data.latitude;
  if (data.longitude !== undefined) createData.longitude = data.longitude;
  if (data.ownerId !== undefined) createData.ownerId = data.ownerId;

  const club = await prisma.club.create({
    data: createData,
  });

  return club;
}

/**
 * Update a club (admin only)
 */
export async function updateClub(
  clubId: string,
  data: UpdateClubInput
): Promise<Club> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  // If ownerId is provided, verify the user exists
  if (data.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: data.ownerId },
    });

    if (!owner) {
      throw new Error('Owner user not found');
    }

    if (owner.role !== UserRole.GYM_OWNER && owner.role !== UserRole.ADMIN) {
      throw new Error('Owner must be a gym owner or admin');
    }
  }

  const updatedClub = await prisma.club.update({
    where: { id: clubId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.contactName !== undefined && { contactName: data.contactName }),
      ...(data.postcode !== undefined && { postcode: data.postcode }),
      ...(data.region !== undefined && { region: data.region }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
    },
  });

  return updatedClub;
}

/**
 * Delete a club (admin only)
 */
export async function deleteClub(clubId: string): Promise<void> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  await prisma.club.delete({
    where: { id: clubId },
  });
}

// Export all functions
export default {
  getAllUsers,
  updateUserStatus,
  verifyBoxer,
  getSystemStats,
  getPendingVerifications,
  searchUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllBoxers,
  getBoxerById,
  createBoxerAsAdmin,
  updateBoxerAsAdmin,
  deleteBoxerAsAdmin,
  getAllClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
};
