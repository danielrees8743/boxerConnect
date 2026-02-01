// Fight History Service
// Handles fight history CRUD operations for boxer profiles

import { prisma } from '../config';
import { FightResult } from '@prisma/client';
import type {
  CreateFightHistoryInput,
  UpdateFightHistoryInput,
} from '../validators/fightHistory.validators';

// ============================================================================
// Types
// ============================================================================

export interface FightHistoryResult {
  id: string;
  boxerId: string;
  opponentName: string;
  date: Date;
  venue: string | null;
  result: FightResult;
  method: string | null;
  round: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FightHistoryListResult {
  fights: FightHistoryResult[];
  count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Recalculate boxer's win/loss/draw record based on their fight history.
 * NO_CONTEST fights are not counted in the record.
 * Accepts an optional transaction client for atomic operations.
 */
async function recalculateBoxerRecord(
  boxerId: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<void> {
  const client = tx || prisma;

  const [wins, losses, draws] = await Promise.all([
    client.fightHistory.count({
      where: { boxerId, result: FightResult.WIN },
    }),
    client.fightHistory.count({
      where: { boxerId, result: FightResult.LOSS },
    }),
    client.fightHistory.count({
      where: { boxerId, result: FightResult.DRAW },
    }),
  ]);

  await client.boxer.update({
    where: { id: boxerId },
    data: { wins, losses, draws },
  });
}

/**
 * Map a Prisma FightHistory to FightHistoryResult
 */
function mapToResult(fight: {
  id: string;
  boxerId: string;
  opponentName: string;
  date: Date;
  venue: string | null;
  result: FightResult;
  method: string | null;
  round: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): FightHistoryResult {
  return {
    id: fight.id,
    boxerId: fight.boxerId,
    opponentName: fight.opponentName,
    date: fight.date,
    venue: fight.venue,
    result: fight.result,
    method: fight.method,
    round: fight.round,
    notes: fight.notes,
    createdAt: fight.createdAt,
    updatedAt: fight.updatedAt,
  };
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Create a new fight history entry for a boxer.
 * Automatically recalculates the boxer's record within a transaction.
 *
 * @param userId - The user ID of the boxer
 * @param data - The fight history data
 * @returns The created fight history entry
 */
export async function createFight(
  userId: string,
  data: CreateFightHistoryInput
): Promise<FightHistoryResult> {
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  const fight = await prisma.$transaction(async (tx) => {
    const newFight = await tx.fightHistory.create({
      data: {
        boxerId: boxer.id,
        opponentName: data.opponentName,
        date: new Date(data.date),
        venue: data.venue || null,
        result: data.result,
        method: data.method || null,
        round: data.round || null,
        notes: data.notes || null,
      },
    });

    await recalculateBoxerRecord(boxer.id, tx);

    return newFight;
  });

  return mapToResult(fight);
}

/**
 * Get all fights for the authenticated boxer.
 *
 * @param userId - The user ID of the boxer
 * @returns List of fights ordered by date descending
 */
export async function getMyFights(userId: string): Promise<FightHistoryListResult> {
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  const fights = await prisma.fightHistory.findMany({
    where: { boxerId: boxer.id },
    orderBy: { date: 'desc' },
  });

  return {
    fights: fights.map(mapToResult),
    count: fights.length,
  };
}

/**
 * Update a fight history entry.
 * Verifies ownership and recalculates record if result changed within a transaction.
 *
 * @param userId - The user ID of the boxer
 * @param fightId - The ID of the fight to update
 * @param data - The update data
 * @returns The updated fight history entry
 */
export async function updateFight(
  userId: string,
  fightId: string,
  data: UpdateFightHistoryInput
): Promise<FightHistoryResult> {
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  const existingFight = await prisma.fightHistory.findUnique({
    where: { id: fightId },
  });

  if (!existingFight) {
    throw new Error('Fight not found');
  }

  if (existingFight.boxerId !== boxer.id) {
    throw new Error('Not authorized to update this fight');
  }

  const resultChanged = data.result !== undefined && data.result !== existingFight.result;

  const fight = await prisma.$transaction(async (tx) => {
    const updatedFight = await tx.fightHistory.update({
      where: { id: fightId },
      data: {
        ...(data.opponentName !== undefined && { opponentName: data.opponentName }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.venue !== undefined && { venue: data.venue }),
        ...(data.result !== undefined && { result: data.result }),
        ...(data.method !== undefined && { method: data.method }),
        ...(data.round !== undefined && { round: data.round }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    if (resultChanged) {
      await recalculateBoxerRecord(boxer.id, tx);
    }

    return updatedFight;
  });

  return mapToResult(fight);
}

/**
 * Delete a fight history entry.
 * Verifies ownership and recalculates record within a transaction.
 *
 * @param userId - The user ID of the boxer
 * @param fightId - The ID of the fight to delete
 */
export async function deleteFight(userId: string, fightId: string): Promise<void> {
  const boxer = await prisma.boxer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer profile not found');
  }

  const existingFight = await prisma.fightHistory.findUnique({
    where: { id: fightId },
  });

  if (!existingFight) {
    throw new Error('Fight not found');
  }

  if (existingFight.boxerId !== boxer.id) {
    throw new Error('Not authorized to delete this fight');
  }

  await prisma.$transaction(async (tx) => {
    await tx.fightHistory.delete({
      where: { id: fightId },
    });

    await recalculateBoxerRecord(boxer.id, tx);
  });
}

/**
 * Get all fights for a boxer by boxer ID (public access).
 *
 * @param boxerId - The ID of the boxer
 * @returns List of fights ordered by date descending
 */
export async function getBoxerFights(boxerId: string): Promise<FightHistoryListResult> {
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
    select: { id: true },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  const fights = await prisma.fightHistory.findMany({
    where: { boxerId },
    orderBy: { date: 'desc' },
  });

  return {
    fights: fights.map(mapToResult),
    count: fights.length,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  createFight,
  getMyFights,
  updateFight,
  deleteFight,
  getBoxerFights,
};
