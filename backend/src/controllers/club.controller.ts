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
} from '../services/club.service';
import { sendSuccess, sendPaginated } from '../utils';
import { NotFoundError } from '../middleware';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

const clubSearchSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  postcode: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const clubIdSchema = z.object({
  id: z.string().uuid(),
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

// Export all controller methods
export default {
  getClubs,
  getClub,
  getClubsByRegion,
  getRegions,
  searchClubs,
  getClubStats,
};
