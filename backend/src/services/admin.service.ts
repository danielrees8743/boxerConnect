// Admin Service
// Handles all admin-related business logic

import { User, Boxer, UserRole, Prisma } from '@prisma/client';
import { prisma } from '../config';

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

// Export all functions
export default {
  getAllUsers,
  updateUserStatus,
  verifyBoxer,
  getSystemStats,
  getPendingVerifications,
  searchUsers,
  getUserById,
};
