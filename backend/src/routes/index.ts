// Routes Module
// Combines all routes under /api/v1

import { Router } from 'express';
import authRoutes from './auth.routes';
import boxerRoutes from './boxer.routes';
import availabilityRoutes, { boxerAvailabilityRouter } from './availability.routes';
import matchRequestRoutes from './matchRequest.routes';
import coachRoutes from './coach.routes';
import adminRoutes from './admin.routes';
import clubRoutes from './club.routes';

const router = Router();

// ============================================================================
// API Routes
// ============================================================================

/**
 * Authentication routes
 * Base path: /api/v1/auth
 */
router.use('/auth', authRoutes);

/**
 * Boxer routes
 * Base path: /api/v1/boxers
 */
router.use('/boxers', boxerRoutes);

/**
 * Boxer availability routes (nested under boxers)
 * Base path: /api/v1/boxers/:boxerId/availability
 */
router.use('/boxers/:boxerId/availability', boxerAvailabilityRouter);

/**
 * Availability routes (standalone for /me endpoint)
 * Base path: /api/v1/availability
 */
router.use('/availability', availabilityRoutes);

/**
 * Match request routes
 * Base path: /api/v1/match-requests
 */
router.use('/match-requests', matchRequestRoutes);

/**
 * Coach routes
 * Base path: /api/v1/coach
 */
router.use('/coach', coachRoutes);

/**
 * Admin routes
 * Base path: /api/v1/admin
 */
router.use('/admin', adminRoutes);

/**
 * Club routes
 * Base path: /api/v1/clubs
 */
router.use('/clubs', clubRoutes);

export default router;
