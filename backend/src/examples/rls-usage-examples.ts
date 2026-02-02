/**
 * Row Level Security (RLS) Usage Examples
 * 
 * This file demonstrates how to use RLS with the database context utilities.
 */

import { Request, Response } from 'express';
import { withUserContext, withRequestContext } from '../utils/database-context';

/**
 * Example 1: Basic query with user context
 */
export async function getMyBoxerProfile(req: Request, res: Response) {
  try {
    const boxer = await withRequestContext(req, async (tx) => {
      return await tx.boxer.findUnique({
        where: { userId: req.user.id },
        include: {
          fightHistory: true,
          availability: true,
          videos: true,
        },
      });
    });

    if (!boxer) {
      return res.status(404).json({ error: 'Boxer profile not found' });
    }

    res.json(boxer);
  } catch (error) {
    console.error('Failed to fetch boxer profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 2: Search for boxers (public profiles)
 */
export async function searchBoxers(req: Request, res: Response) {
  try {
    const { city, experienceLevel, minWeight, maxWeight } = req.query;

    const boxers = await withRequestContext(req, async (tx) => {
      return await tx.boxer.findMany({
        where: {
          isSearchable: true,
          isVerified: true,
          ...(city && { city: city as string }),
          ...(experienceLevel && { experienceLevel: experienceLevel as any }),
          ...(minWeight && { weightKg: { gte: Number(minWeight) } }),
          ...(maxWeight && { weightKg: { lte: Number(maxWeight) } }),
        },
        include: {
          club: true,
          fightHistory: {
            orderBy: { date: 'desc' },
            take: 5,
          },
        },
      });
    });

    res.json({ boxers, count: boxers.length });
  } catch (error) {
    console.error('Failed to search boxers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 3: Coach viewing assigned boxers
 */
export async function getMyBoxers(req: Request, res: Response) {
  try {
    // RLS will automatically filter to only boxers this coach manages
    const boxers = await withRequestContext(req, async (tx) => {
      return await tx.boxer.findMany({
        include: {
          fightHistory: true,
          availability: true,
          videos: true,
          coaches: {
            where: { coachUserId: req.user.id },
          },
        },
      });
    });

    res.json({ boxers, count: boxers.length });
  } catch (error) {
    console.error('Failed to fetch assigned boxers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 4: GYM_OWNER viewing boxers in their clubs
 */
export async function getClubBoxers(req: Request, res: Response) {
  try {
    const { clubId } = req.params;

    // RLS will verify ownership before returning results
    const boxers = await withRequestContext(req, async (tx) => {
      return await tx.boxer.findMany({
        where: { clubId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              isActive: true,
            },
          },
          fightHistory: true,
          coaches: {
            include: {
              coach: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    res.json({ boxers, count: boxers.length });
  } catch (error) {
    console.error('Failed to fetch club boxers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 5: Create match request (BOXER)
 */
export async function createMatchRequest(req: Request, res: Response) {
  try {
    const { targetBoxerId, message, proposedDate, proposedVenue } = req.body;

    const matchRequest = await withRequestContext(req, async (tx) => {
      // First, get the requester's boxer profile
      const requesterBoxer = await tx.boxer.findUnique({
        where: { userId: req.user.id },
      });

      if (!requesterBoxer) {
        throw new Error('Requester boxer profile not found');
      }

      // Create match request
      // RLS will verify the requester has permission to create this request
      return await tx.matchRequest.create({
        data: {
          requesterBoxerId: requesterBoxer.id,
          targetBoxerId,
          message,
          proposedDate: proposedDate ? new Date(proposedDate) : null,
          proposedVenue,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        include: {
          requesterBoxer: {
            select: {
              name: true,
              weightKg: true,
              experienceLevel: true,
            },
          },
          targetBoxer: {
            select: {
              name: true,
              weightKg: true,
              experienceLevel: true,
            },
          },
        },
      });
    });

    res.status(201).json(matchRequest);
  } catch (error) {
    console.error('Failed to create match request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 6: Update match request status (BOXER or COACH)
 */
export async function updateMatchRequestStatus(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const { status, responseMessage } = req.body;

    const updatedRequest = await withRequestContext(req, async (tx) => {
      // RLS will verify the user has permission to update this request
      return await tx.matchRequest.update({
        where: { id: requestId },
        data: {
          status,
          responseMessage,
          updatedAt: new Date(),
        },
        include: {
          requesterBoxer: {
            select: { name: true },
          },
          targetBoxer: {
            select: { name: true },
          },
        },
      });
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Failed to update match request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 7: Admin viewing all users
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const users = await withRequestContext(req, async (tx) => {
      return await tx.user.findMany({
        include: {
          boxer: true,
          ownedClubs: true,
          clubCoach: true,
        },
      });
    });

    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 8: Upload boxer video (BOXER or COACH)
 */
export async function uploadBoxerVideo(req: Request, res: Response) {
  try {
    const { boxerId } = req.params;
    const { url, filename, size, mimeType } = req.body;

    const video = await withRequestContext(req, async (tx) => {
      // RLS will verify the user has permission to add videos for this boxer
      return await tx.boxerVideo.create({
        data: {
          boxerId,
          url,
          filename,
          size,
          mimeType,
        },
      });
    });

    res.status(201).json(video);
  } catch (error) {
    console.error('Failed to upload video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 9: Batch operation with transaction
 */
export async function updateBoxerProfile(req: Request, res: Response) {
  try {
    const updates = req.body;

    const result = await withRequestContext(req, async (tx) => {
      // Get boxer profile
      const boxer = await tx.boxer.findUnique({
        where: { userId: req.user.id },
      });

      if (!boxer) {
        throw new Error('Boxer profile not found');
      }

      // Update boxer profile
      const updatedBoxer = await tx.boxer.update({
        where: { id: boxer.id },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      // Update user record if name changed
      if (updates.name) {
        await tx.user.update({
          where: { id: req.user.id },
          data: { name: updates.name },
        });
      }

      return updatedBoxer;
    });

    res.json(result);
  } catch (error) {
    console.error('Failed to update boxer profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example 10: Direct context usage (without request object)
 */
export async function processBackgroundJob(userId: string, userRole: string) {
  try {
    const result = await withUserContext(userId, userRole, async (tx) => {
      // Perform database operations with user context
      const boxer = await tx.boxer.findUnique({
        where: { userId },
      });

      if (boxer) {
        // Update statistics
        const fightHistory = await tx.fightHistory.findMany({
          where: { boxerId: boxer.id },
        });

        const wins = fightHistory.filter(f => f.result === 'WIN').length;
        const losses = fightHistory.filter(f => f.result === 'LOSS').length;
        const draws = fightHistory.filter(f => f.result === 'DRAW').length;

        await tx.boxer.update({
          where: { id: boxer.id },
          data: { wins, losses, draws },
        });
      }

      return boxer;
    });

    return result;
  } catch (error) {
    console.error('Background job failed:', error);
    throw error;
  }
}
