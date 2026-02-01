// Club Routes
// Defines all boxing club-related API endpoints
// All routes are public (no authentication required)

import { Router } from 'express';
import {
  getClubs,
  getClub,
  getClubsByRegion,
  getRegions,
  searchClubs,
  getClubStats,
} from '../controllers/club.controller';
import { searchLimiter, standardLimiter } from '../middleware';

const router = Router();

// ============================================================================
// Public Routes - No Authentication Required
// ============================================================================

/**
 * GET /api/v1/clubs/regions
 * Get all unique regions
 * Rate limited by standardLimiter
 */
router.get('/regions', standardLimiter, getRegions);

/**
 * GET /api/v1/clubs/search
 * Search clubs by name (autocomplete)
 * Rate limited by searchLimiter
 */
router.get('/search', searchLimiter, searchClubs);

/**
 * GET /api/v1/clubs/stats
 * Get club statistics
 * Rate limited by standardLimiter
 */
router.get('/stats', standardLimiter, getClubStats);

/**
 * GET /api/v1/clubs/region/:region
 * Get clubs by region
 * Rate limited by standardLimiter
 */
router.get('/region/:region', standardLimiter, getClubsByRegion);

/**
 * GET /api/v1/clubs
 * List all clubs with optional filtering
 * Query params: name, region, postcode, page, limit
 * Rate limited by searchLimiter
 */
router.get('/', searchLimiter, getClubs);

/**
 * GET /api/v1/clubs/:id
 * Get club by ID
 * Rate limited by standardLimiter
 */
router.get('/:id', standardLimiter, getClub);

export default router;
