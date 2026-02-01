// Fight History Service Tests
// Tests for fight history CRUD operations, including coach/gym owner methods

import { FightResult, FightMethod } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Prisma transaction and models
const mockFightHistoryCreate = jest.fn();
const mockFightHistoryUpdate = jest.fn();
const mockFightHistoryDelete = jest.fn();
const mockFightHistoryCount = jest.fn();
const mockBoxerUpdate = jest.fn();

// Transaction mock - executes callback with mock transaction client
const mockTransaction = jest.fn(async (callback) => {
  const txClient = {
    fightHistory: {
      create: mockFightHistoryCreate,
      update: mockFightHistoryUpdate,
      delete: mockFightHistoryDelete,
      count: mockFightHistoryCount,
    },
    boxer: {
      update: mockBoxerUpdate,
    },
  };
  return callback(txClient);
});

jest.mock('../../src/config', () => ({
  prisma: {
    boxer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fightHistory: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Import after mocking
import {
  createFightForBoxer,
  updateFightForBoxer,
  deleteFightForBoxer,
  getBoxerFights,
} from '../../src/services/fightHistory.service';
import { prisma } from '../../src/config';

// Set up the mock references
const prismaBoxerFindUnique = prisma.boxer.findUnique as jest.Mock;
const prismaFightHistoryFindUnique = prisma.fightHistory.findUnique as jest.Mock;
const prismaFightHistoryFindMany = prisma.fightHistory.findMany as jest.Mock;
const prismaTransaction = prisma.$transaction as jest.Mock;

describe('Fight History Service', () => {
  const validBoxerId = uuidv4();
  const validFightId = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up transaction to use mock callback execution
    prismaTransaction.mockImplementation(mockTransaction);
  });

  // ============================================================================
  // createFightForBoxer Tests
  // ============================================================================

  describe('createFightForBoxer', () => {
    const validFightData = {
      opponentName: 'John Doe',
      date: '2024-06-15',
      result: FightResult.WIN,
      venue: 'Madison Square Garden',
      method: FightMethod.TKO,
      round: 5,
      notes: 'Great performance',
    };

    it('should create a fight and recalculate boxer record', async () => {
      const createdFight = {
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'John Doe',
        date: new Date('2024-06-15'),
        venue: 'Madison Square Garden',
        result: FightResult.WIN,
        method: 'TKO',
        round: 5,
        notes: 'Great performance',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      mockFightHistoryCreate.mockResolvedValue(createdFight);
      mockFightHistoryCount.mockResolvedValue(1); // For record recalculation

      const result = await createFightForBoxer(validBoxerId, validFightData);

      expect(result.id).toBe(validFightId);
      expect(result.boxerId).toBe(validBoxerId);
      expect(result.opponentName).toBe('John Doe');
      expect(result.result).toBe(FightResult.WIN);
      expect(prismaBoxerFindUnique).toHaveBeenCalledWith({
        where: { id: validBoxerId },
        select: { id: true },
      });
      expect(mockFightHistoryCreate).toHaveBeenCalled();
      expect(mockBoxerUpdate).toHaveBeenCalled(); // Record recalculation
    });

    it('should throw error when boxer not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue(null);

      await expect(createFightForBoxer(validBoxerId, validFightData))
        .rejects
        .toThrow('Boxer not found');
    });

    it('should handle optional fields correctly', async () => {
      const minimalFightData = {
        opponentName: 'Jane Doe',
        date: '2024-06-15',
        result: FightResult.LOSS,
      };

      const createdFight = {
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Jane Doe',
        date: new Date('2024-06-15'),
        venue: null,
        result: FightResult.LOSS,
        method: null,
        round: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      mockFightHistoryCreate.mockResolvedValue(createdFight);
      mockFightHistoryCount.mockResolvedValue(1);

      const result = await createFightForBoxer(validBoxerId, minimalFightData);

      expect(result.venue).toBeNull();
      expect(result.method).toBeNull();
      expect(result.round).toBeNull();
      expect(result.notes).toBeNull();
    });

    it('should recalculate record correctly within transaction', async () => {
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      mockFightHistoryCreate.mockResolvedValue({
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'John Doe',
        date: new Date('2024-06-15'),
        venue: null,
        result: FightResult.WIN,
        method: null,
        round: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock the count calls for record recalculation
      mockFightHistoryCount
        .mockResolvedValueOnce(10) // wins
        .mockResolvedValueOnce(5)  // losses
        .mockResolvedValueOnce(2); // draws

      await createFightForBoxer(validBoxerId, validFightData);

      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: validBoxerId },
        data: { wins: 10, losses: 5, draws: 2 },
      });
    });
  });

  // ============================================================================
  // updateFightForBoxer Tests
  // ============================================================================

  describe('updateFightForBoxer', () => {
    const updateData = {
      opponentName: 'Updated Opponent',
      result: FightResult.DRAW,
    };

    it('should update a fight and recalculate record when result changes', async () => {
      const existingFight = {
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Original Opponent',
        date: new Date('2024-06-15'),
        venue: 'Original Venue',
        result: FightResult.WIN,
        method: 'KO',
        round: 3,
        notes: 'Original notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedFight = {
        ...existingFight,
        opponentName: 'Updated Opponent',
        result: FightResult.DRAW,
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(existingFight);
      mockFightHistoryUpdate.mockResolvedValue(updatedFight);
      mockFightHistoryCount.mockResolvedValue(1);

      const result = await updateFightForBoxer(validBoxerId, validFightId, updateData);

      expect(result.opponentName).toBe('Updated Opponent');
      expect(result.result).toBe(FightResult.DRAW);
      expect(mockBoxerUpdate).toHaveBeenCalled(); // Record recalculated due to result change
    });

    it('should not recalculate record when result does not change', async () => {
      const existingFight = {
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Original Opponent',
        date: new Date('2024-06-15'),
        venue: 'Original Venue',
        result: FightResult.WIN,
        method: 'KO',
        round: 3,
        notes: 'Original notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedFight = {
        ...existingFight,
        opponentName: 'Updated Opponent',
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(existingFight);
      mockFightHistoryUpdate.mockResolvedValue(updatedFight);

      await updateFightForBoxer(validBoxerId, validFightId, { opponentName: 'Updated Opponent' });

      // Record should not be recalculated since result didn't change
      expect(mockBoxerUpdate).not.toHaveBeenCalled();
    });

    it('should throw error when boxer not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue(null);

      await expect(updateFightForBoxer(validBoxerId, validFightId, updateData))
        .rejects
        .toThrow('Boxer not found');
    });

    it('should throw error when fight not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(null);

      await expect(updateFightForBoxer(validBoxerId, validFightId, updateData))
        .rejects
        .toThrow('Fight not found');
    });

    it('should throw error when fight does not belong to specified boxer', async () => {
      const differentBoxerId = uuidv4();
      const existingFight = {
        id: validFightId,
        boxerId: differentBoxerId, // Different boxer
        opponentName: 'Original Opponent',
        date: new Date('2024-06-15'),
        venue: 'Original Venue',
        result: FightResult.WIN,
        method: 'KO',
        round: 3,
        notes: 'Original notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(existingFight);

      await expect(updateFightForBoxer(validBoxerId, validFightId, updateData))
        .rejects
        .toThrow('Fight does not belong to this boxer');
    });
  });

  // ============================================================================
  // deleteFightForBoxer Tests
  // ============================================================================

  describe('deleteFightForBoxer', () => {
    it('should delete a fight and recalculate boxer record', async () => {
      const existingFight = {
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Opponent',
        date: new Date('2024-06-15'),
        venue: 'Venue',
        result: FightResult.WIN,
        method: 'KO',
        round: 3,
        notes: 'Notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(existingFight);
      mockFightHistoryDelete.mockResolvedValue(existingFight);
      mockFightHistoryCount.mockResolvedValue(0);

      await deleteFightForBoxer(validBoxerId, validFightId);

      expect(mockFightHistoryDelete).toHaveBeenCalledWith({
        where: { id: validFightId },
      });
      expect(mockBoxerUpdate).toHaveBeenCalled(); // Record recalculated
    });

    it('should throw error when boxer not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue(null);

      await expect(deleteFightForBoxer(validBoxerId, validFightId))
        .rejects
        .toThrow('Boxer not found');
    });

    it('should throw error when fight not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(null);

      await expect(deleteFightForBoxer(validBoxerId, validFightId))
        .rejects
        .toThrow('Fight not found');
    });

    it('should throw error when fight does not belong to specified boxer', async () => {
      const differentBoxerId = uuidv4();
      const existingFight = {
        id: validFightId,
        boxerId: differentBoxerId, // Different boxer
        opponentName: 'Opponent',
        date: new Date('2024-06-15'),
        venue: 'Venue',
        result: FightResult.WIN,
        method: 'KO',
        round: 3,
        notes: 'Notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindUnique.mockResolvedValue(existingFight);

      await expect(deleteFightForBoxer(validBoxerId, validFightId))
        .rejects
        .toThrow('Fight does not belong to this boxer');
    });
  });

  // ============================================================================
  // getBoxerFights Tests
  // ============================================================================

  describe('getBoxerFights', () => {
    it('should return fights for a boxer ordered by date descending', async () => {
      const fights = [
        {
          id: uuidv4(),
          boxerId: validBoxerId,
          opponentName: 'Recent Opponent',
          date: new Date('2024-06-15'),
          venue: 'Venue 1',
          result: FightResult.WIN,
          method: 'KO',
          round: 3,
          notes: 'Notes 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          boxerId: validBoxerId,
          opponentName: 'Older Opponent',
          date: new Date('2024-01-15'),
          venue: 'Venue 2',
          result: FightResult.LOSS,
          method: 'Decision',
          round: null,
          notes: 'Notes 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindMany.mockResolvedValue(fights);

      const result = await getBoxerFights(validBoxerId);

      expect(result.fights).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.fights[0]?.opponentName).toBe('Recent Opponent');
      expect(result.fights[1]?.opponentName).toBe('Older Opponent');
      expect(prismaFightHistoryFindMany).toHaveBeenCalledWith({
        where: { boxerId: validBoxerId },
        orderBy: { date: 'desc' },
      });
    });

    it('should return empty array when boxer has no fights', async () => {
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      prismaFightHistoryFindMany.mockResolvedValue([]);

      const result = await getBoxerFights(validBoxerId);

      expect(result.fights).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should throw error when boxer not found', async () => {
      prismaBoxerFindUnique.mockResolvedValue(null);

      await expect(getBoxerFights(validBoxerId))
        .rejects
        .toThrow('Boxer not found');
    });
  });

  // ============================================================================
  // Record Recalculation Tests
  // ============================================================================

  describe('Record recalculation', () => {
    it('should count wins, losses, and draws correctly', async () => {
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      mockFightHistoryCreate.mockResolvedValue({
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Opponent',
        date: new Date('2024-06-15'),
        venue: null,
        result: FightResult.WIN,
        method: null,
        round: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock counts for WIN, LOSS, DRAW
      mockFightHistoryCount
        .mockResolvedValueOnce(15) // wins
        .mockResolvedValueOnce(3)  // losses
        .mockResolvedValueOnce(1); // draws

      await createFightForBoxer(validBoxerId, {
        opponentName: 'Opponent',
        date: '2024-06-15',
        result: FightResult.WIN,
      });

      // Verify count calls were made for WIN, LOSS, DRAW results
      expect(mockFightHistoryCount).toHaveBeenCalledTimes(3);
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: validBoxerId },
        data: { wins: 15, losses: 3, draws: 1 },
      });
    });

    it('should not count NO_CONTEST in record', async () => {
      // The recalculation only counts WIN, LOSS, DRAW
      // NO_CONTEST is not counted
      prismaBoxerFindUnique.mockResolvedValue({ id: validBoxerId });
      mockFightHistoryCreate.mockResolvedValue({
        id: validFightId,
        boxerId: validBoxerId,
        opponentName: 'Opponent',
        date: new Date('2024-06-15'),
        venue: null,
        result: FightResult.NO_CONTEST,
        method: null,
        round: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockFightHistoryCount
        .mockResolvedValueOnce(5)  // wins
        .mockResolvedValueOnce(2)  // losses
        .mockResolvedValueOnce(0); // draws

      await createFightForBoxer(validBoxerId, {
        opponentName: 'Opponent',
        date: '2024-06-15',
        result: FightResult.NO_CONTEST,
      });

      // Verify NO_CONTEST was not counted in update
      expect(mockBoxerUpdate).toHaveBeenCalledWith({
        where: { id: validBoxerId },
        data: { wins: 5, losses: 2, draws: 0 },
      });
    });
  });
});
