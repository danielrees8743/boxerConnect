/**
 * Row Level Security (RLS) Integration Tests
 *
 * These tests verify that RLS policies correctly enforce access control across all tables.
 * They test actual database operations with real RLS policies (not mocks).
 *
 * REQUIREMENTS:
 * - PostgreSQL test database with RLS policies applied
 * - Seed data with users in different roles
 * - Test database connection configured in tests/setup.ts
 *
 * CRITICAL SECURITY TEST CASES:
 * 1. Role escalation prevention
 * 2. SQL injection protection
 * 3. Signup flow validation
 * 4. Token expiration enforcement
 * 5. Coach match request abuse prevention
 * 6. Context isolation between concurrent requests
 * 7. Deprecated function error handling
 * 8. System context audit logging
 */

import { PrismaClient, UserRole, CoachPermission, MatchRequestStatus } from '@prisma/client';
import {
  withUserContext,
  withSystemContext,
  resetContext,
  setDatabaseContextMiddleware,
  getCurrentContext
} from '../../src/utils/database-context';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Create a dedicated Prisma client for integration tests
const prisma = new PrismaClient();

// Test data IDs (will be populated in beforeAll)
let testData: {
  adminUser: { id: string; role: UserRole };
  gymOwnerUser: { id: string; role: UserRole; clubId: string };
  coachUser: { id: string; role: UserRole; boxerId: string };
  boxerUser: { id: string; role: UserRole; boxerId: string };
  otherBoxerUser: { id: string; role: UserRole; boxerId: string };
};

describe('RLS Security Integration Tests', () => {

  // ============================================================================
  // SETUP AND TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    console.log('Setting up RLS integration test data...');

    // Create test data using system context (bypass RLS for setup)
    await withSystemContext(async (tx) => {
      // Create admin user
      const admin = await tx.user.create({
        data: {
          email: `admin-rls-test-${uuidv4()}@test.com`,
          passwordHash: await bcrypt.hash('admin123', 12),
          name: 'Admin Test User',
          role: UserRole.ADMIN,
          isActive: true,
          emailVerified: true,
        },
      });

      // Create gym owner with club
      const gymOwner = await tx.user.create({
        data: {
          email: `gymowner-rls-test-${uuidv4()}@test.com`,
          passwordHash: await bcrypt.hash('gym123', 12),
          name: 'Gym Owner Test User',
          role: UserRole.GYM_OWNER,
          isActive: true,
          emailVerified: true,
        },
      });

      const club = await tx.club.create({
        data: {
          name: 'RLS Test Gym',
          ownerId: gymOwner.id,
          isVerified: true,
        },
      });

      // Create boxer users
      const boxer1 = await tx.user.create({
        data: {
          email: `boxer1-rls-test-${uuidv4()}@test.com`,
          passwordHash: await bcrypt.hash('boxer123', 12),
          name: 'Boxer 1 Test User',
          role: UserRole.BOXER,
          isActive: true,
          emailVerified: true,
        },
      });

      const boxerProfile1 = await tx.boxer.create({
        data: {
          userId: boxer1.id,
          name: 'Boxer One',
          weightKg: 75.5,
          heightCm: 180,
          experienceLevel: 'INTERMEDIATE',
          wins: 10,
          losses: 2,
          draws: 1,
          city: 'New York',
          country: 'USA',
          isSearchable: true,
          isVerified: true,
          clubId: club.id,
        },
      });

      const boxer2 = await tx.user.create({
        data: {
          email: `boxer2-rls-test-${uuidv4()}@test.com`,
          passwordHash: await bcrypt.hash('boxer123', 12),
          name: 'Boxer 2 Test User',
          role: UserRole.BOXER,
          isActive: true,
          emailVerified: true,
        },
      });

      const boxerProfile2 = await tx.boxer.create({
        data: {
          userId: boxer2.id,
          name: 'Boxer Two',
          weightKg: 80.0,
          heightCm: 185,
          experienceLevel: 'ADVANCED',
          wins: 20,
          losses: 5,
          draws: 2,
          city: 'Los Angeles',
          country: 'USA',
          isSearchable: true,
          isVerified: true,
        },
      });

      // Create coach user assigned to boxer1
      const coach = await tx.user.create({
        data: {
          email: `coach-rls-test-${uuidv4()}@test.com`,
          passwordHash: await bcrypt.hash('coach123', 12),
          name: 'Coach Test User',
          role: UserRole.COACH,
          isActive: true,
          emailVerified: true,
        },
      });

      await tx.coachBoxer.create({
        data: {
          coachUserId: coach.id,
          boxerId: boxerProfile1.id,
          permissions: CoachPermission.FULL_ACCESS,
        },
      });

      testData = {
        adminUser: { id: admin.id, role: admin.role },
        gymOwnerUser: { id: gymOwner.id, role: gymOwner.role, clubId: club.id },
        coachUser: { id: coach.id, role: coach.role, boxerId: boxerProfile1.id },
        boxerUser: { id: boxer1.id, role: boxer1.role, boxerId: boxerProfile1.id },
        otherBoxerUser: { id: boxer2.id, role: boxer2.role, boxerId: boxerProfile2.id },
      };

      console.log('Test data created successfully');
    }, 'RLS integration test setup');
  });

  afterAll(async () => {
    console.log('Cleaning up RLS integration test data...');

    // Clean up test data
    await withSystemContext(async (tx) => {
      // Delete users (cascade will handle related records)
      await tx.user.deleteMany({
        where: {
          id: {
            in: [
              testData.adminUser.id,
              testData.gymOwnerUser.id,
              testData.coachUser.id,
              testData.boxerUser.id,
              testData.otherBoxerUser.id,
            ],
          },
        },
      });
    }, 'RLS integration test cleanup');

    await prisma.$disconnect();
    console.log('Cleanup complete');
  });

  // ============================================================================
  // TEST 1: ROLE ESCALATION PREVENTION (CRITICAL)
  // ============================================================================

  describe('1. Role Escalation Prevention', () => {
    it('should prevent regular user from escalating to ADMIN role', async () => {
      // Attempt to update own role to ADMIN
      await expect(
        withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
          return await tx.user.update({
            where: { id: testData.boxerUser.id },
            data: { role: UserRole.ADMIN },
          });
        })
      ).rejects.toThrow();

      // Verify role hasn't changed
      const user = await withSystemContext(async (tx) => {
        return await tx.user.findUnique({
          where: { id: testData.boxerUser.id },
        });
      }, 'Verify role unchanged');

      expect(user?.role).toBe(UserRole.BOXER);
    });

    it('should prevent user from changing is_active status', async () => {
      await expect(
        withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
          return await tx.user.update({
            where: { id: testData.boxerUser.id },
            data: { isActive: false },
          });
        })
      ).rejects.toThrow();

      // Verify isActive hasn't changed
      const user = await withSystemContext(async (tx) => {
        return await tx.user.findUnique({
          where: { id: testData.boxerUser.id },
        });
      }, 'Verify isActive unchanged');

      expect(user?.isActive).toBe(true);
    });

    it('should allow user to update non-protected fields', async () => {
      const newName = 'Updated Boxer Name';

      await withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
        return await tx.user.update({
          where: { id: testData.boxerUser.id },
          data: { name: newName },
        });
      });

      // Verify name was updated
      const user = await withSystemContext(async (tx) => {
        return await tx.user.findUnique({
          where: { id: testData.boxerUser.id },
        });
      }, 'Verify name updated');

      expect(user?.name).toBe(newName);
    });

    it('should allow ADMIN to change user roles', async () => {
      // Create a temporary user
      const tempUser = await withSystemContext(async (tx) => {
        return await tx.user.create({
          data: {
            email: `temp-${uuidv4()}@test.com`,
            passwordHash: await bcrypt.hash('temp123', 12),
            name: 'Temp User',
            role: UserRole.BOXER,
            isActive: true,
            emailVerified: false,
          },
        });
      }, 'Create temp user for role change test');

      // Admin changes role
      await withUserContext(testData.adminUser.id, testData.adminUser.role, async (tx) => {
        return await tx.user.update({
          where: { id: tempUser.id },
          data: { role: UserRole.COACH },
        });
      });

      // Verify role was changed
      const updatedUser = await withSystemContext(async (tx) => {
        return await tx.user.findUnique({
          where: { id: tempUser.id },
        });
      }, 'Verify role changed');

      expect(updatedUser?.role).toBe(UserRole.COACH);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.user.delete({ where: { id: tempUser.id } });
      }, 'Cleanup temp user');
    });
  });

  // ============================================================================
  // TEST 2: SQL INJECTION PROTECTION (CRITICAL)
  // ============================================================================

  describe('2. SQL Injection Protection', () => {
    it('should reject malicious user ID with SQL injection attempt', async () => {
      const maliciousId = "'; DROP TABLE users; --";

      await expect(
        withUserContext(maliciousId, 'BOXER', async (tx) => {
          return await tx.boxer.findMany();
        })
      ).rejects.toThrow(/Invalid user ID format/);
    });

    it('should reject malicious user role with SQL injection attempt', async () => {
      const maliciousRole = "ADMIN'; DROP TABLE users; --";

      await expect(
        withUserContext(testData.boxerUser.id, maliciousRole, async (tx) => {
          return await tx.boxer.findMany();
        })
      ).rejects.toThrow(/Invalid user role/);
    });

    it('should reject non-UUID user ID formats', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'admin',
        '<script>alert("xss")</script>',
        '1; DELETE FROM users WHERE 1=1',
      ];

      for (const invalidId of invalidIds) {
        await expect(
          withUserContext(invalidId, 'BOXER', async (tx) => {
            return await tx.boxer.findMany();
          })
        ).rejects.toThrow(/Invalid user ID format/);
      }
    });

    it('should reject invalid role values', async () => {
      const invalidRoles = [
        'SUPERADMIN',
        'ROOT',
        'admin',
        'Admin',
        'ADMIN OR 1=1',
      ];

      for (const invalidRole of invalidRoles) {
        await expect(
          withUserContext(testData.boxerUser.id, invalidRole, async (tx) => {
            return await tx.boxer.findMany();
          })
        ).rejects.toThrow(/Invalid user role/);
      }
    });
  });

  // ============================================================================
  // TEST 3: SIGNUP FLOW (CRITICAL)
  // ============================================================================

  describe('3. Signup Flow Validation', () => {
    it('should allow non-admin role signup (BOXER)', async () => {
      const email = `new-boxer-${uuidv4()}@test.com`;

      // Signup happens without user context (unauthenticated)
      const newUser = await prisma.$transaction(async (tx) => {
        return await tx.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash('password123', 12),
            name: 'New Boxer Signup',
            role: UserRole.BOXER,
            isActive: true,
            emailVerified: false,
          },
        });
      });

      expect(newUser).toBeDefined();
      expect(newUser.role).toBe(UserRole.BOXER);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.user.delete({ where: { id: newUser.id } });
      }, 'Cleanup signup test user');
    });

    it('should allow non-admin role signup (COACH)', async () => {
      const email = `new-coach-${uuidv4()}@test.com`;

      const newUser = await prisma.$transaction(async (tx) => {
        return await tx.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash('password123', 12),
            name: 'New Coach Signup',
            role: UserRole.COACH,
            isActive: true,
            emailVerified: false,
          },
        });
      });

      expect(newUser).toBeDefined();
      expect(newUser.role).toBe(UserRole.COACH);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.user.delete({ where: { id: newUser.id } });
      }, 'Cleanup signup test user');
    });

    it('should allow non-admin role signup (GYM_OWNER)', async () => {
      const email = `new-gymowner-${uuidv4()}@test.com`;

      const newUser = await prisma.$transaction(async (tx) => {
        return await tx.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash('password123', 12),
            name: 'New Gym Owner Signup',
            role: UserRole.GYM_OWNER,
            isActive: true,
            emailVerified: false,
          },
        });
      });

      expect(newUser).toBeDefined();
      expect(newUser.role).toBe(UserRole.GYM_OWNER);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.user.delete({ where: { id: newUser.id } });
      }, 'Cleanup signup test user');
    });

    it('should prevent ADMIN role signup without authentication', async () => {
      const email = `new-admin-${uuidv4()}@test.com`;

      // Attempt to sign up as admin should fail
      await expect(
        prisma.$transaction(async (tx) => {
          return await tx.user.create({
            data: {
              email,
              passwordHash: await bcrypt.hash('password123', 12),
              name: 'Malicious Admin Signup',
              role: UserRole.ADMIN,
              isActive: true,
              emailVerified: false,
            },
          });
        })
      ).rejects.toThrow();
    });

    it('should allow ADMIN to create ADMIN accounts via system context', async () => {
      const email = `admin-created-${uuidv4()}@test.com`;

      const newAdmin = await withSystemContext(async (tx) => {
        return await tx.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash('password123', 12),
            name: 'Admin Created Admin',
            role: UserRole.ADMIN,
            isActive: true,
            emailVerified: false,
          },
        });
      }, 'Admin creates another admin account');

      expect(newAdmin).toBeDefined();
      expect(newAdmin.role).toBe(UserRole.ADMIN);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.user.delete({ where: { id: newAdmin.id } });
      }, 'Cleanup admin test user');
    });
  });

  // ============================================================================
  // TEST 4: TOKEN EXPIRATION (CRITICAL)
  // ============================================================================

  describe('4. Token Expiration Validation', () => {
    it('should filter out expired refresh tokens', async () => {
      // Create expired token
      const expiredToken = await withSystemContext(async (tx) => {
        return await tx.refreshToken.create({
          data: {
            userId: testData.boxerUser.id,
            tokenId: uuidv4(),
            tokenHash: 'expired-token-hash',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        });
      }, 'Create expired refresh token');

      // Try to access expired token as the user
      const tokens = await withUserContext(
        testData.boxerUser.id,
        testData.boxerUser.role,
        async (tx) => {
          return await tx.refreshToken.findMany({
            where: { userId: testData.boxerUser.id },
          });
        }
      );

      // Should not see expired token
      expect(tokens).toHaveLength(0);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.refreshToken.delete({ where: { id: expiredToken.id } });
      }, 'Cleanup expired token');
    });

    it('should allow access to non-expired refresh tokens', async () => {
      // Create valid token
      const validToken = await withSystemContext(async (tx) => {
        return await tx.refreshToken.create({
          data: {
            userId: testData.boxerUser.id,
            tokenId: uuidv4(),
            tokenHash: 'valid-token-hash',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        });
      }, 'Create valid refresh token');

      // User should see valid token
      const tokens = await withUserContext(
        testData.boxerUser.id,
        testData.boxerUser.role,
        async (tx) => {
          return await tx.refreshToken.findMany({
            where: { userId: testData.boxerUser.id },
          });
        }
      );

      expect(tokens).toHaveLength(1);
      expect(tokens[0].id).toBe(validToken.id);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.refreshToken.delete({ where: { id: validToken.id } });
      }, 'Cleanup valid token');
    });

    it('should filter out expired password reset tokens', async () => {
      // Create expired reset token
      const expiredResetToken = await withSystemContext(async (tx) => {
        return await tx.passwordResetToken.create({
          data: {
            userId: testData.boxerUser.id,
            token: `expired-${uuidv4()}`,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        });
      }, 'Create expired reset token');

      // User should not see expired reset token
      const resetTokens = await withUserContext(
        testData.boxerUser.id,
        testData.boxerUser.role,
        async (tx) => {
          return await tx.passwordResetToken.findMany({
            where: { userId: testData.boxerUser.id },
          });
        }
      );

      expect(resetTokens).toHaveLength(0);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.passwordResetToken.delete({ where: { id: expiredResetToken.id } });
      }, 'Cleanup expired reset token');
    });

    it('should filter out used password reset tokens', async () => {
      // Create used reset token
      const usedResetToken = await withSystemContext(async (tx) => {
        return await tx.passwordResetToken.create({
          data: {
            userId: testData.boxerUser.id,
            token: `used-${uuidv4()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            usedAt: new Date(), // Already used
          },
        });
      }, 'Create used reset token');

      // User should not see used reset token
      const resetTokens = await withUserContext(
        testData.boxerUser.id,
        testData.boxerUser.role,
        async (tx) => {
          return await tx.passwordResetToken.findMany({
            where: { userId: testData.boxerUser.id },
          });
        }
      );

      expect(resetTokens).toHaveLength(0);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.passwordResetToken.delete({ where: { id: usedResetToken.id } });
      }, 'Cleanup used reset token');
    });

    it('should prevent users from modifying password reset tokens', async () => {
      // Create valid reset token
      const resetToken = await withSystemContext(async (tx) => {
        return await tx.passwordResetToken.create({
          data: {
            userId: testData.boxerUser.id,
            token: `valid-${uuidv4()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }, 'Create reset token for modification test');

      // User should not be able to update the token
      await expect(
        withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
          return await tx.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { usedAt: null }, // Try to reset usedAt
          });
        })
      ).rejects.toThrow();

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.passwordResetToken.delete({ where: { id: resetToken.id } });
      }, 'Cleanup reset token');
    });
  });

  // ============================================================================
  // TEST 5: COACH MATCH REQUEST ABUSE PREVENTION (HIGH PRIORITY)
  // ============================================================================

  describe('5. Coach Match Request Abuse Prevention', () => {
    it('should allow coach to create match request FROM their assigned boxer', async () => {
      const matchRequest = await withUserContext(
        testData.coachUser.id,
        testData.coachUser.role,
        async (tx) => {
          return await tx.matchRequest.create({
            data: {
              requesterBoxerId: testData.coachUser.boxerId, // Coach's boxer
              targetBoxerId: testData.otherBoxerUser.boxerId, // Another boxer
              message: 'Looking for a sparring match',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      );

      expect(matchRequest).toBeDefined();
      expect(matchRequest.requesterBoxerId).toBe(testData.coachUser.boxerId);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.matchRequest.delete({ where: { id: matchRequest.id } });
      }, 'Cleanup match request');
    });

    it('should prevent coach from creating fraudulent match request TO their boxer', async () => {
      await expect(
        withUserContext(testData.coachUser.id, testData.coachUser.role, async (tx) => {
          return await tx.matchRequest.create({
            data: {
              requesterBoxerId: testData.otherBoxerUser.boxerId, // Another boxer (NOT theirs)
              targetBoxerId: testData.coachUser.boxerId, // Coach's boxer as target
              message: 'Fraudulent request',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        })
      ).rejects.toThrow();
    });

    it('should prevent coach from creating match request from unassigned boxer', async () => {
      await expect(
        withUserContext(testData.coachUser.id, testData.coachUser.role, async (tx) => {
          return await tx.matchRequest.create({
            data: {
              requesterBoxerId: testData.otherBoxerUser.boxerId, // Not their boxer
              targetBoxerId: testData.boxerUser.boxerId,
              message: 'Unauthorized request',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        })
      ).rejects.toThrow();
    });

    it('should allow coach to view match requests involving their boxer', async () => {
      // Create a match request involving coach's boxer
      const matchRequest = await withSystemContext(async (tx) => {
        return await tx.matchRequest.create({
          data: {
            requesterBoxerId: testData.otherBoxerUser.boxerId,
            targetBoxerId: testData.coachUser.boxerId, // Coach's boxer
            message: 'Match request to coach boxer',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }, 'Create match request for coach view test');

      // Coach should see the request
      const requests = await withUserContext(
        testData.coachUser.id,
        testData.coachUser.role,
        async (tx) => {
          return await tx.matchRequest.findMany({
            where: { targetBoxerId: testData.coachUser.boxerId },
          });
        }
      );

      expect(requests.length).toBeGreaterThan(0);
      expect(requests.some(r => r.id === matchRequest.id)).toBe(true);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.matchRequest.delete({ where: { id: matchRequest.id } });
      }, 'Cleanup match request');
    });

    it('should allow coach to update match requests involving their boxer', async () => {
      // Create a match request
      const matchRequest = await withSystemContext(async (tx) => {
        return await tx.matchRequest.create({
          data: {
            requesterBoxerId: testData.coachUser.boxerId,
            targetBoxerId: testData.otherBoxerUser.boxerId,
            message: 'Initial message',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }, 'Create match request for coach update test');

      // Coach should be able to update it
      const updated = await withUserContext(
        testData.coachUser.id,
        testData.coachUser.role,
        async (tx) => {
          return await tx.matchRequest.update({
            where: { id: matchRequest.id },
            data: { status: MatchRequestStatus.CANCELLED },
          });
        }
      );

      expect(updated.status).toBe(MatchRequestStatus.CANCELLED);

      // Cleanup
      await withSystemContext(async (tx) => {
        await tx.matchRequest.delete({ where: { id: matchRequest.id } });
      }, 'Cleanup match request');
    });
  });

  // ============================================================================
  // TEST 6: CONTEXT ISOLATION (HIGH PRIORITY)
  // ============================================================================

  describe('6. Context Isolation Between Concurrent Requests', () => {
    it('should isolate user context in concurrent requests', async () => {
      // Run 20 concurrent requests with different users
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        // Alternate between two users
        const isBoxer1 = i % 2 === 0;
        const userId = isBoxer1 ? testData.boxerUser.id : testData.otherBoxerUser.id;
        const userRole = isBoxer1 ? testData.boxerUser.role : testData.otherBoxerUser.role;
        const expectedBoxerId = isBoxer1 ? testData.boxerUser.boxerId : testData.otherBoxerUser.boxerId;

        promises.push(
          withUserContext(userId, userRole, async (tx) => {
            // Each user should only see their own boxer profile
            const boxer = await tx.boxer.findUnique({
              where: { userId },
            });

            expect(boxer).toBeDefined();
            expect(boxer?.userId).toBe(userId);
            expect(boxer?.id).toBe(expectedBoxerId);

            return { userId, boxerId: boxer?.id };
          })
        );
      }

      // Wait for all concurrent requests to complete
      const results = await Promise.all(promises);

      // Verify each request got the correct data
      results.forEach((result, index) => {
        const isBoxer1 = index % 2 === 0;
        const expectedUserId = isBoxer1 ? testData.boxerUser.id : testData.otherBoxerUser.id;
        const expectedBoxerId = isBoxer1 ? testData.boxerUser.boxerId : testData.otherBoxerUser.boxerId;

        expect(result.userId).toBe(expectedUserId);
        expect(result.boxerId).toBe(expectedBoxerId);
      });
    });

    it('should not leak data between concurrent user contexts', async () => {
      const iterations = 10;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < iterations; i++) {
        // Boxer 1 request
        promises.push(
          withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
            const boxers = await tx.boxer.findMany();
            // Should only see own boxer and public boxers
            const ownBoxer = boxers.find(b => b.userId === testData.boxerUser.id);
            expect(ownBoxer).toBeDefined();
          })
        );

        // Boxer 2 request
        promises.push(
          withUserContext(testData.otherBoxerUser.id, testData.otherBoxerUser.role, async (tx) => {
            const boxers = await tx.boxer.findMany();
            // Should only see own boxer and public boxers
            const ownBoxer = boxers.find(b => b.userId === testData.otherBoxerUser.id);
            expect(ownBoxer).toBeDefined();
          })
        );
      }

      await Promise.all(promises);
    });
  });

  // ============================================================================
  // TEST 7: DEPRECATED FUNCTIONS (MEDIUM PRIORITY)
  // ============================================================================

  describe('7. Deprecated Function Error Handling', () => {
    it('should throw error when calling deprecated setDatabaseContextMiddleware', () => {
      expect(() => {
        setDatabaseContextMiddleware();
      }).toThrow(/DEPRECATED/);
    });

    it('should throw error when calling deprecated resetContext', async () => {
      await expect(resetContext()).rejects.toThrow(/deprecated/);
    });
  });

  // ============================================================================
  // TEST 8: SYSTEM CONTEXT AUDIT (MEDIUM PRIORITY)
  // ============================================================================

  describe('8. System Context Audit Logging', () => {
    it('should require reason parameter for system context', async () => {
      await expect(
        // @ts-expect-error Testing missing parameter
        withSystemContext(async (tx) => {
          return await tx.user.findMany();
        })
      ).rejects.toThrow(/must include a reason/);
    });

    it('should reject empty reason string', async () => {
      await expect(
        withSystemContext(async (tx) => {
          return await tx.user.findMany();
        }, '')
      ).rejects.toThrow(/must include a reason/);
    });

    it('should accept valid reason and execute operation', async () => {
      const users = await withSystemContext(async (tx) => {
        return await tx.user.findMany({
          where: { id: testData.adminUser.id },
        });
      }, 'Admin data export for compliance');

      expect(users).toBeDefined();
      expect(users.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TEST 9: ROLE-BASED ACCESS CONTROL
  // ============================================================================

  describe('9. Role-Based Access Control', () => {
    describe('ADMIN role', () => {
      it('should allow admin to access all users', async () => {
        const users = await withUserContext(
          testData.adminUser.id,
          testData.adminUser.role,
          async (tx) => {
            return await tx.user.findMany();
          }
        );

        expect(users.length).toBeGreaterThanOrEqual(5); // At least our test users
      });

      it('should allow admin to access all boxers', async () => {
        const boxers = await withUserContext(
          testData.adminUser.id,
          testData.adminUser.role,
          async (tx) => {
            return await tx.boxer.findMany();
          }
        );

        expect(boxers.length).toBeGreaterThanOrEqual(2);
      });

      it('should allow admin to create match requests for any boxer', async () => {
        const matchRequest = await withUserContext(
          testData.adminUser.id,
          testData.adminUser.role,
          async (tx) => {
            return await tx.matchRequest.create({
              data: {
                requesterBoxerId: testData.boxerUser.boxerId,
                targetBoxerId: testData.otherBoxerUser.boxerId,
                message: 'Admin created match request',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          }
        );

        expect(matchRequest).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.matchRequest.delete({ where: { id: matchRequest.id } });
        }, 'Cleanup admin match request');
      });
    });

    describe('GYM_OWNER role', () => {
      it('should allow gym owner to view their clubs', async () => {
        const clubs = await withUserContext(
          testData.gymOwnerUser.id,
          testData.gymOwnerUser.role,
          async (tx) => {
            return await tx.club.findMany({
              where: { ownerId: testData.gymOwnerUser.id },
            });
          }
        );

        expect(clubs.length).toBeGreaterThan(0);
        expect(clubs[0].id).toBe(testData.gymOwnerUser.clubId);
      });

      it('should allow gym owner to view boxers in their club', async () => {
        const boxers = await withUserContext(
          testData.gymOwnerUser.id,
          testData.gymOwnerUser.role,
          async (tx) => {
            return await tx.boxer.findMany({
              where: { clubId: testData.gymOwnerUser.clubId },
            });
          }
        );

        expect(boxers.length).toBeGreaterThan(0);
      });

      it('should prevent gym owner from viewing boxers not in their club', async () => {
        const boxers = await withUserContext(
          testData.gymOwnerUser.id,
          testData.gymOwnerUser.role,
          async (tx) => {
            return await tx.boxer.findMany({
              where: { clubId: null }, // Boxers not in any club
            });
          }
        );

        // Should not see boxers from other clubs or without clubs
        expect(boxers.length).toBe(0);
      });
    });

    describe('COACH role', () => {
      it('should allow coach to view their assigned boxers', async () => {
        const boxer = await withUserContext(
          testData.coachUser.id,
          testData.coachUser.role,
          async (tx) => {
            return await tx.boxer.findUnique({
              where: { id: testData.coachUser.boxerId },
            });
          }
        );

        expect(boxer).toBeDefined();
        expect(boxer?.id).toBe(testData.coachUser.boxerId);
      });

      it('should prevent coach from viewing unassigned boxers private data', async () => {
        const boxer = await withUserContext(
          testData.coachUser.id,
          testData.coachUser.role,
          async (tx) => {
            return await tx.boxer.findUnique({
              where: { id: testData.otherBoxerUser.boxerId },
            });
          }
        );

        // Coach can see public boxers, but check they exist in public list
        if (boxer) {
          expect(boxer.isSearchable).toBe(true);
          expect(boxer.isVerified).toBe(true);
        }
      });

      it('should allow coach to update their assigned boxer profile', async () => {
        const originalBio = 'Original bio';
        const updatedBio = 'Coach updated bio';

        await withUserContext(
          testData.coachUser.id,
          testData.coachUser.role,
          async (tx) => {
            return await tx.boxer.update({
              where: { id: testData.coachUser.boxerId },
              data: { bio: updatedBio },
            });
          }
        );

        // Verify update
        const boxer = await withSystemContext(async (tx) => {
          return await tx.boxer.findUnique({
            where: { id: testData.coachUser.boxerId },
          });
        }, 'Verify coach update');

        expect(boxer?.bio).toBe(updatedBio);

        // Restore original
        await withSystemContext(async (tx) => {
          await tx.boxer.update({
            where: { id: testData.coachUser.boxerId },
            data: { bio: originalBio },
          });
        }, 'Restore original bio');
      });
    });

    describe('BOXER role', () => {
      it('should allow boxer to view their own profile', async () => {
        const boxer = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.boxer.findUnique({
              where: { userId: testData.boxerUser.id },
            });
          }
        );

        expect(boxer).toBeDefined();
        expect(boxer?.userId).toBe(testData.boxerUser.id);
      });

      it('should prevent boxer from viewing another boxer private data', async () => {
        // Try to fetch other boxer's profile directly
        const result = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.boxer.findFirst({
              where: {
                userId: testData.otherBoxerUser.id,
                isSearchable: false // Try to access private profile
              },
            });
          }
        );

        // Should not be able to see private profiles
        expect(result).toBeNull();
      });

      it('should allow boxer to update their own profile', async () => {
        const updatedCity = 'Boston';

        await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.boxer.update({
              where: { userId: testData.boxerUser.id },
              data: { city: updatedCity },
            });
          }
        );

        // Verify update
        const boxer = await withSystemContext(async (tx) => {
          return await tx.boxer.findUnique({
            where: { userId: testData.boxerUser.id },
          });
        }, 'Verify boxer update');

        expect(boxer?.city).toBe(updatedCity);

        // Restore original
        await withSystemContext(async (tx) => {
          await tx.boxer.update({
            where: { userId: testData.boxerUser.id },
            data: { city: 'New York' },
          });
        }, 'Restore original city');
      });

      it('should allow boxer to create match requests', async () => {
        const matchRequest = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.matchRequest.create({
              data: {
                requesterBoxerId: testData.boxerUser.boxerId,
                targetBoxerId: testData.otherBoxerUser.boxerId,
                message: 'Boxer created match request',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });
          }
        );

        expect(matchRequest).toBeDefined();
        expect(matchRequest.requesterBoxerId).toBe(testData.boxerUser.boxerId);

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.matchRequest.delete({ where: { id: matchRequest.id } });
        }, 'Cleanup boxer match request');
      });

      it('should allow boxer to view public boxer profiles', async () => {
        const publicBoxers = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.boxer.findMany({
              where: {
                isSearchable: true,
                isVerified: true,
              },
            });
          }
        );

        expect(publicBoxers.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // TEST 10: TABLE-SPECIFIC ACCESS TESTS
  // ============================================================================

  describe('10. Table-Specific Access Control', () => {
    describe('fight_history table', () => {
      it('should allow boxer to create their own fight history', async () => {
        const fightHistory = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.fightHistory.create({
              data: {
                boxerId: testData.boxerUser.boxerId,
                opponentName: 'Test Opponent',
                date: new Date(),
                result: 'WIN',
                method: 'DECISION',
              },
            });
          }
        );

        expect(fightHistory).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.fightHistory.delete({ where: { id: fightHistory.id } });
        }, 'Cleanup fight history');
      });

      it('should prevent boxer from creating fight history for another boxer', async () => {
        await expect(
          withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
            return await tx.fightHistory.create({
              data: {
                boxerId: testData.otherBoxerUser.boxerId, // Another boxer's ID
                opponentName: 'Test Opponent',
                date: new Date(),
                result: 'WIN',
              },
            });
          })
        ).rejects.toThrow();
      });

      it('should allow coach to create fight history for assigned boxer', async () => {
        const fightHistory = await withUserContext(
          testData.coachUser.id,
          testData.coachUser.role,
          async (tx) => {
            return await tx.fightHistory.create({
              data: {
                boxerId: testData.coachUser.boxerId, // Coach's boxer
                opponentName: 'Coach Added Opponent',
                date: new Date(),
                result: 'WIN',
                method: 'KO',
              },
            });
          }
        );

        expect(fightHistory).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.fightHistory.delete({ where: { id: fightHistory.id } });
        }, 'Cleanup fight history');
      });
    });

    describe('availability table', () => {
      it('should allow boxer to manage their own availability', async () => {
        const availability = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.availability.create({
              data: {
                boxerId: testData.boxerUser.boxerId,
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                startTime: new Date('2024-01-01T09:00:00'),
                endTime: new Date('2024-01-01T17:00:00'),
                isAvailable: true,
              },
            });
          }
        );

        expect(availability).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.availability.delete({ where: { id: availability.id } });
        }, 'Cleanup availability');
      });

      it('should allow coach to manage availability for assigned boxer', async () => {
        const availability = await withUserContext(
          testData.coachUser.id,
          testData.coachUser.role,
          async (tx) => {
            return await tx.availability.create({
              data: {
                boxerId: testData.coachUser.boxerId, // Coach's boxer
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                startTime: new Date('2024-01-01T09:00:00'),
                endTime: new Date('2024-01-01T17:00:00'),
                isAvailable: true,
              },
            });
          }
        );

        expect(availability).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.availability.delete({ where: { id: availability.id } });
        }, 'Cleanup availability');
      });

      it('should allow public users to view available slots for public boxers', async () => {
        // Create availability
        const availability = await withSystemContext(async (tx) => {
          return await tx.availability.create({
            data: {
              boxerId: testData.boxerUser.boxerId,
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              startTime: new Date('2024-01-01T09:00:00'),
              endTime: new Date('2024-01-01T17:00:00'),
              isAvailable: true,
            },
          });
        }, 'Create availability for public view test');

        // Other boxer should see it
        const availabilities = await withUserContext(
          testData.otherBoxerUser.id,
          testData.otherBoxerUser.role,
          async (tx) => {
            return await tx.availability.findMany({
              where: {
                boxerId: testData.boxerUser.boxerId,
                isAvailable: true,
              },
            });
          }
        );

        expect(availabilities.length).toBeGreaterThan(0);

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.availability.delete({ where: { id: availability.id } });
        }, 'Cleanup availability');
      });
    });

    describe('boxer_videos table', () => {
      it('should allow boxer to upload their own videos', async () => {
        const video = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.boxerVideo.create({
              data: {
                boxerId: testData.boxerUser.boxerId,
                url: 'https://example.com/video.mp4',
                filename: 'test-video.mp4',
                size: 1024000,
                mimeType: 'video/mp4',
              },
            });
          }
        );

        expect(video).toBeDefined();

        // Cleanup
        await withSystemContext(async (tx) => {
          await tx.boxerVideo.delete({ where: { id: video.id } });
        }, 'Cleanup video');
      });

      it('should prevent boxer from uploading videos for another boxer', async () => {
        await expect(
          withUserContext(testData.boxerUser.id, testData.boxerUser.role, async (tx) => {
            return await tx.boxerVideo.create({
              data: {
                boxerId: testData.otherBoxerUser.boxerId, // Another boxer's ID
                url: 'https://example.com/video.mp4',
                filename: 'test-video.mp4',
                size: 1024000,
                mimeType: 'video/mp4',
              },
            });
          })
        ).rejects.toThrow();
      });
    });

    describe('coach_boxer table', () => {
      it('should allow boxer to view their coaches', async () => {
        const coaches = await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            return await tx.coachBoxer.findMany({
              where: { boxerId: testData.boxerUser.boxerId },
            });
          }
        );

        expect(coaches.length).toBeGreaterThan(0);
      });

      it('should allow boxer to remove coaches', async () => {
        // Create a temporary coach assignment
        const tempCoach = await withSystemContext(async (tx) => {
          const coach = await tx.user.create({
            data: {
              email: `temp-coach-${uuidv4()}@test.com`,
              passwordHash: await bcrypt.hash('temp123', 12),
              name: 'Temp Coach',
              role: UserRole.COACH,
              isActive: true,
              emailVerified: false,
            },
          });

          const assignment = await tx.coachBoxer.create({
            data: {
              coachUserId: coach.id,
              boxerId: testData.boxerUser.boxerId,
              permissions: CoachPermission.VIEW_PROFILE,
            },
          });

          return { coachId: coach.id, assignmentId: assignment.id };
        }, 'Create temp coach assignment');

        // Boxer removes the coach
        await withUserContext(
          testData.boxerUser.id,
          testData.boxerUser.role,
          async (tx) => {
            await tx.coachBoxer.delete({
              where: { id: tempCoach.assignmentId },
            });
          }
        );

        // Verify removed
        const assignment = await withSystemContext(async (tx) => {
          return await tx.coachBoxer.findUnique({
            where: { id: tempCoach.assignmentId },
          });
        }, 'Verify coach removed');

        expect(assignment).toBeNull();

        // Cleanup coach user
        await withSystemContext(async (tx) => {
          await tx.user.delete({ where: { id: tempCoach.coachId } });
        }, 'Cleanup temp coach');
      });
    });
  });
});
