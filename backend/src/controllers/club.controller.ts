// Club Controller
// Handles HTTP requests for boxing club endpoints

import { Request, Response, NextFunction } from 'express';
import {
  getClubs as getClubsService,
  getClubById as getClubByIdService,
  getClubsByRegion as getClubsByRegionService,
  getRegions as getRegionsService,
  searchClubsByName as searchClubsByNameService,
  getClubStats as getClubStatsService,
  getClubWithMembers as getClubWithMembersService,
  assignBoxerToClub as assignBoxerToClubService,
  removeBoxerFromClub as removeBoxerFromClubService,
  assignCoachToClub as assignCoachToClubService,
  removeCoachFromClub as removeCoachFromClubService,
  setClubOwner as setClubOwnerService,
  isClubOwner as isClubOwnerService,
  getClubsByOwner as getClubsByOwnerService,
  createClub as createClubService,
  updateClub as updateClubService,
} from '../services/club.service';
import { sendSuccess, sendPaginated } from '../utils';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware';
import { z } from 'zod';
import type { AuthenticatedUserRequest } from '../types';
import {
  clubIdSchema,
  clubBoxerParamsSchema,
  clubCoachParamsSchema,
  assignCoachSchema,
  setClubOwnerSchema,
  createClubSchema,
  updateClubSchema,
} from '../validators/club.validators';

// ============================================================================
// Validation Schemas
// ============================================================================

const clubSearchSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  postcode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  acceptingMembers: z.coerce.boolean().optional(),
  includeUnpublished: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const regionParamSchema = z.object({
  region: z.string().min(1),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

// ============================================================================
// Controller Methods
// ============================================================================

/**
 * Get all clubs with optional filtering
 * GET /api/v1/clubs
 */
export async function getClubs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedParams = clubSearchSchema.parse(req.query);

    const result = await getClubsService(validatedParams);

    sendPaginated(
      res,
      result.clubs,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      'Clubs retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get club by ID
 * GET /api/v1/clubs/:id
 */
export async function getClub(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = clubIdSchema.parse(req.params);

    const club = await getClubByIdService(id);

    if (!club) {
      return next(new NotFoundError('Club not found'));
    }

    sendSuccess(res, { club }, 'Club retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get clubs by region
 * GET /api/v1/clubs/region/:region
 */
export async function getClubsByRegion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { region } = regionParamSchema.parse(req.params);

    const clubs = await getClubsByRegionService(region);

    sendSuccess(
      res,
      {
        clubs,
        total: clubs.length,
        region,
      },
      `Clubs in ${region} retrieved successfully`
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get all unique regions
 * GET /api/v1/clubs/regions
 */
export async function getRegions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const regions = await getRegionsService();

    sendSuccess(res, { regions }, 'Regions retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Search clubs by name (autocomplete)
 * GET /api/v1/clubs/search
 */
export async function searchClubs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q, limit } = searchQuerySchema.parse(req.query);

    const clubs = await searchClubsByNameService(q, limit);

    sendSuccess(
      res,
      {
        clubs,
        total: clubs.length,
        query: q,
      },
      'Search results retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get club statistics
 * GET /api/v1/clubs/stats
 */
export async function getClubStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getClubStatsService();

    sendSuccess(res, { stats }, 'Club statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get clubs owned by authenticated user
 * GET /api/v1/clubs/my-clubs
 */
export async function getMyClubs(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Verify user is a gym owner
    if (req.user.role !== 'GYM_OWNER') {
      return next(new ForbiddenError('Only gym owners can access this endpoint'));
    }

    const clubs = await getClubsByOwnerService(req.user.userId);

    sendSuccess(res, { clubs }, 'Clubs retrieved successfully');
  } catch (error: unknown) {
    next(error);
  }
}

// ============================================================================
// Club Member Management (Protected Routes)
// ============================================================================

/**
 * Get club with all members
 * GET /api/v1/clubs/:id/members
 */
export async function getClubMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = clubIdSchema.parse(req.params);

    const club = await getClubWithMembersService(id);

    if (!club) {
      return next(new NotFoundError('Club not found'));
    }

    sendSuccess(res, { club }, 'Club members retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Add boxer to club
 * POST /api/v1/clubs/:id/boxers/:boxerId
 */
export async function addBoxerToClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, boxerId } = clubBoxerParamsSchema.parse(req.params);

    // Check if user is club owner or admin
    const isOwner = await isClubOwnerService(req.user.userId, id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new ForbiddenError('Only the club owner or admin can add boxers'));
    }

    const boxer = await assignBoxerToClubService(boxerId, id);

    sendSuccess(res, { boxer }, 'Boxer added to club successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found' || error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Remove boxer from club
 * DELETE /api/v1/clubs/:id/boxers/:boxerId
 */
export async function removeBoxerFromClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, boxerId } = clubBoxerParamsSchema.parse(req.params);

    // Check if user is club owner or admin
    const isOwner = await isClubOwnerService(req.user.userId, id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new ForbiddenError('Only the club owner or admin can remove boxers'));
    }

    const boxer = await removeBoxerFromClubService(boxerId, id);

    sendSuccess(res, { boxer }, 'Boxer removed from club successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Boxer not found' || error.message === 'Boxer is not a member of this club') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Add coach to club
 * POST /api/v1/clubs/:id/coaches/:coachId
 */
export async function addCoachToClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, coachId } = clubCoachParamsSchema.parse(req.params);
    const { isHead } = assignCoachSchema.parse({ ...req.body, coachUserId: coachId });

    // Check if user is club owner or admin
    const isOwner = await isClubOwnerService(req.user.userId, id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new ForbiddenError('Only the club owner or admin can add coaches'));
    }

    const clubCoach = await assignCoachToClubService(coachId, id, isHead);

    sendSuccess(res, { clubCoach }, 'Coach added to club successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found' || error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
      if (
        error.message === 'User is not a coach' ||
        error.message === 'Coach is already assigned to this club' ||
        error.message === 'Coach is already assigned to another club'
      ) {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Remove coach from club
 * DELETE /api/v1/clubs/:id/coaches/:coachId
 */
export async function removeCoachFromClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, coachId } = clubCoachParamsSchema.parse(req.params);

    // Check if user is club owner or admin
    const isOwner = await isClubOwnerService(req.user.userId, id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new ForbiddenError('Only the club owner or admin can remove coaches'));
    }

    await removeCoachFromClubService(coachId, id);

    sendSuccess(res, null, 'Coach removed from club successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Coach is not assigned to this club') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Set club owner (ADMIN only)
 * PUT /api/v1/clubs/:id/owner
 */
export async function setClubOwner(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = clubIdSchema.parse(req.params);
    const { ownerUserId } = setClubOwnerSchema.parse(req.body);

    // Only admin can set club owner
    if (req.user.role !== 'ADMIN') {
      return next(new ForbiddenError('Only admins can set club ownership'));
    }

    const club = await setClubOwnerService(id, ownerUserId);

    sendSuccess(res, { club }, 'Club owner set successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found' || error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
      if (error.message === 'User must be a GYM_OWNER to own a club') {
        return next(new BadRequestError(error.message));
      }
    }
    next(error);
  }
}

/**
 * Create a new club (ADMIN only)
 * POST /api/v1/clubs
 */
export async function createClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only admin can create clubs
    if (req.user.role !== 'ADMIN') {
      return next(new ForbiddenError('Only admins can create clubs'));
    }

    const validatedData = createClubSchema.parse(req.body);

    // Cast to Prisma ClubCreateInput type
    const club = await createClubService(validatedData as any);

    sendSuccess(res, { club }, 'Club created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a club (ADMIN or club owner)
 * PATCH /api/v1/clubs/:id
 */
export async function updateClub(
  req: AuthenticatedUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = clubIdSchema.parse(req.params);
    const validatedData = updateClubSchema.parse(req.body);

    // Check if user is club owner or admin
    const isOwner = await isClubOwnerService(req.user.userId, id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return next(new ForbiddenError('Only the club owner or admin can update this club'));
    }

    // Only admin can update certain fields
    const adminOnlyFields = ['isVerified', 'lastVerifiedAt', 'verificationNotes'];
    if (!isAdmin) {
      adminOnlyFields.forEach((field) => {
        if (field in validatedData) {
          delete (validatedData as Record<string, unknown>)[field];
        }
      });
    }

    // Cast to Prisma ClubUpdateInput type
    const club = await updateClubService(id, validatedData as any);

    sendSuccess(res, { club }, 'Club updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Club not found') {
        return next(new NotFoundError(error.message));
      }
    }
    next(error);
  }
}

// Export all controller methods
export default {
  getClubs,
  getClub,
  getClubsByRegion,
  getRegions,
  searchClubs,
  getClubStats,
  getMyClubs,
  getClubMembers,
  addBoxerToClub,
  removeBoxerFromClub,
  addCoachToClub,
  removeCoachFromClub,
  setClubOwner,
  createClub,
  updateClub,
};
