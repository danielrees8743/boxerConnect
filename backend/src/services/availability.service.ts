// Availability Service
// Handles all availability-related business logic

import { Availability, Prisma } from '@prisma/client';
import { prisma } from '../config';
import type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from '../validators/availability.validators';

// ============================================================================
// Types
// ============================================================================

export interface AvailabilityWithBoxer extends Availability {
  boxer: {
    id: string;
    name: string;
    userId: string;
  };
}

// ============================================================================
// Availability Service Methods
// ============================================================================

/**
 * Create a new availability slot
 */
export async function createAvailability(
  boxerId: string,
  data: CreateAvailabilityInput
): Promise<Availability> {
  // Verify boxer exists
  const boxer = await prisma.boxer.findUnique({
    where: { id: boxerId },
  });

  if (!boxer) {
    throw new Error('Boxer not found');
  }

  // Check for overlapping availability on the same date
  const existingAvailability = await prisma.availability.findFirst({
    where: {
      boxerId,
      date: data.date,
      OR: [
        {
          // New slot starts during existing slot
          startTime: {
            lte: data.startTime,
          },
          endTime: {
            gt: data.startTime,
          },
        },
        {
          // New slot ends during existing slot
          startTime: {
            lt: data.endTime,
          },
          endTime: {
            gte: data.endTime,
          },
        },
        {
          // New slot completely contains existing slot
          startTime: {
            gte: data.startTime,
          },
          endTime: {
            lte: data.endTime,
          },
        },
      ],
    },
  });

  if (existingAvailability) {
    throw new Error('Overlapping availability slot already exists for this date');
  }

  // Build create data, converting undefined to null for optional fields
  const createData: Prisma.AvailabilityUncheckedCreateInput = {
    boxerId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    isAvailable: data.isAvailable,
  };

  // Only set notes if provided (convert undefined to null for Prisma)
  if (data.notes !== undefined) {
    createData.notes = data.notes;
  }

  return prisma.availability.create({
    data: createData,
  });
}

/**
 * Get availability slots for a boxer within a date range
 */
export async function getAvailability(
  boxerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Availability[]> {
  const where: Prisma.AvailabilityWhereInput = {
    boxerId,
    isAvailable: true,
  };

  // Apply date filters
  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = startDate;
    }
    if (endDate) {
      where.date.lte = endDate;
    }
  } else {
    // Default to future availability only
    where.date = {
      gte: new Date(),
    };
  }

  return prisma.availability.findMany({
    where,
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
}

/**
 * Get availability by ID
 */
export async function getAvailabilityById(
  id: string
): Promise<AvailabilityWithBoxer | null> {
  return prisma.availability.findUnique({
    where: { id },
    include: {
      boxer: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
    },
  });
}

/**
 * Update an availability slot
 * Only the boxer owner can update their availability
 */
export async function updateAvailability(
  id: string,
  boxerId: string,
  data: UpdateAvailabilityInput
): Promise<Availability> {
  // Verify ownership
  const availability = await prisma.availability.findUnique({
    where: { id },
    include: {
      boxer: true,
    },
  });

  if (!availability) {
    throw new Error('Availability slot not found');
  }

  if (availability.boxerId !== boxerId) {
    throw new Error('Not authorized to update this availability slot');
  }

  // Build update data
  const updateData: Prisma.AvailabilityUpdateInput = {};

  if (data.date !== undefined) updateData.date = data.date;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // Check for overlapping availability if date or time is being updated
  if (data.date || data.startTime || data.endTime) {
    const checkDate = data.date || availability.date;
    const checkStartTime = data.startTime || availability.startTime;
    const checkEndTime = data.endTime || availability.endTime;

    const overlapping = await prisma.availability.findFirst({
      where: {
        boxerId,
        id: { not: id },
        date: checkDate,
        OR: [
          {
            startTime: { lte: checkStartTime },
            endTime: { gt: checkStartTime },
          },
          {
            startTime: { lt: checkEndTime },
            endTime: { gte: checkEndTime },
          },
          {
            startTime: { gte: checkStartTime },
            endTime: { lte: checkEndTime },
          },
        ],
      },
    });

    if (overlapping) {
      throw new Error('Overlapping availability slot already exists for this date');
    }
  }

  return prisma.availability.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete an availability slot
 * Only the boxer owner can delete their availability
 */
export async function deleteAvailability(
  id: string,
  boxerId: string
): Promise<void> {
  // Verify ownership
  const availability = await prisma.availability.findUnique({
    where: { id },
  });

  if (!availability) {
    throw new Error('Availability slot not found');
  }

  if (availability.boxerId !== boxerId) {
    throw new Error('Not authorized to delete this availability slot');
  }

  await prisma.availability.delete({
    where: { id },
  });
}

/**
 * Get all availability for a boxer (including past)
 */
export async function getAllAvailabilityForBoxer(
  boxerId: string
): Promise<Availability[]> {
  return prisma.availability.findMany({
    where: { boxerId },
    orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
  });
}

/**
 * Delete all past availability slots for a boxer
 * Useful for cleanup operations
 */
export async function deletePastAvailability(boxerId: string): Promise<number> {
  const result = await prisma.availability.deleteMany({
    where: {
      boxerId,
      date: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Check if a boxer is available on a specific date and time
 */
export async function isBoxerAvailable(
  boxerId: string,
  date: Date,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const availability = await prisma.availability.findFirst({
    where: {
      boxerId,
      isAvailable: true,
      date,
      startTime: {
        lte: startTime,
      },
      endTime: {
        gte: endTime,
      },
    },
  });

  return !!availability;
}

// Export all functions
export default {
  createAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
  deleteAvailability,
  getAllAvailabilityForBoxer,
  deletePastAvailability,
  isBoxerAvailable,
};
