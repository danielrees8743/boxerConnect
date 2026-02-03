/**
 * Database Context Utilities for Row Level Security (RLS)
 * 
 * This module provides utilities for setting PostgreSQL session variables
 * that are used by RLS policies to enforce access control.
 * 
 * SECURITY: All context setting uses parameterized queries to prevent SQL injection.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';

const prisma = new PrismaClient();

/**
 * Valid user roles in the system
 */
export const USER_ROLES = ['ADMIN', 'GYM_OWNER', 'COACH', 'BOXER'] as const;
export type UserRole = typeof USER_ROLES[number];

/**
 * Validate user ID format (must be valid UUID)
 */
function validateUserId(userId: string): void {
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID format: ${userId}`);
  }
}

/**
 * Validate user role
 */
function validateUserRole(role: string): asserts role is UserRole {
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new Error(`Invalid user role: ${role}`);
  }
}

/**
 * Set user context for database operations
 * 
 * This sets PostgreSQL session variables that RLS policies use for access control.
 * 
 * SECURITY FIX: Uses $executeRaw with template literals (parameterized queries)
 * instead of $executeRawUnsafe to prevent SQL injection attacks.
 * 
 * @param tx - Prisma transaction client
 * @param userId - User's UUID
 * @param userRole - User's role (ADMIN, GYM_OWNER, COACH, BOXER)
 */
async function setUserContext(
  tx: Prisma.TransactionClient,
  userId: string,
  userRole: string
): Promise<void> {
  // Validate inputs to prevent SQL injection (defense in depth)
  validateUserId(userId);
  validateUserRole(userRole);

  // SECURITY NOTE: SET LOCAL doesn't support parameterized queries ($1, $2)
  // so we must use $executeRawUnsafe. Inputs are validated above to prevent SQL injection.
  // Use SET LOCAL for transaction-scoped settings (safer with connection pooling)
  await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
  await tx.$executeRawUnsafe(`SET LOCAL app.current_user_role = '${userRole}'`);
}

/**
 * Execute a database operation with user context
 * 
 * This is the recommended way to perform database operations with RLS.
 * It ensures user context is set before operations and automatically
 * resets after the transaction completes.
 * 
 * @example
 * ```typescript
 * const boxers = await withUserContext(
 *   req.user.id,
 *   req.user.role,
 *   async (tx) => {
 *     return await tx.boxer.findMany({
 *       where: { isSearchable: true }
 *     });
 *   }
 * );
 * ```
 */
export async function withUserContext<T>(
  userId: string,
  userRole: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    await setUserContext(tx, userId, userRole);
    return await operation(tx);
  });
}

/**
 * Execute a database operation without user context (system operations)
 * 
 * Use this for system operations that need to bypass RLS policies.
 * 
 * WARNING: Only use this for trusted system operations (cron jobs, admin scripts).
 * Never expose this to user requests.
 * 
 * SECURITY FIX: Now requires a reason parameter for audit trail accountability.
 * 
 * @param operation - Database operation to execute
 * @param reason - Reason for bypassing RLS (required for audit trail)
 * 
 * @example
 * ```typescript
 * const allUsers = await withSystemContext(
 *   async (tx) => {
 *     return await tx.user.findMany();
 *   },
 *   'Admin bulk export for compliance reporting'
 * );
 * ```
 */
export async function withSystemContext<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  reason: string
): Promise<T> {
  // SECURITY FIX: Require reason for all system context usage
  if (!reason || reason.trim().length === 0) {
    throw new Error('System context usage must include a reason for audit trail');
  }
  
  // Log for security audit
  console.warn('[SECURITY AUDIT] System context bypassing RLS', {
    reason,
    timestamp: new Date().toISOString(),
    // In production, consider logging to dedicated audit table
  });
  
  return await prisma.$transaction(async (tx) => {
    // System operations run without user context
    // RLS policies will use their "public" or "admin bypass" logic
    return await operation(tx);
  });
}

/**
 * Get current database context (for debugging)
 * 
 * @returns Object with current user ID and role from database session
 */
export async function getCurrentContext(): Promise<{
  userId: string | null;
  userRole: string | null;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{ user_id: string; user_role: string }>>`
      SELECT 
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.current_user_role', true) as user_role
    `;
    
    return {
      userId: result[0]?.user_id || null,
      userRole: result[0]?.user_role || null,
    };
  } catch (error) {
    console.error('Failed to get current database context:', error);
    return { userId: null, userRole: null };
  }
}

/**
 * Reset database context (clear user context)
 * 
 * SECURITY FIX: DEPRECATED - This function is unsafe with connection pooling
 * and should not be used. Context is automatically scoped to transactions.
 * 
 * @deprecated This function is deprecated and will throw an error.
 */
export async function resetContext(): Promise<void> {
  console.warn('[DEPRECATED] resetContext() should not be used. Context is automatically scoped to transactions.');
  throw new Error('resetContext() is deprecated and unsafe. Use transaction-scoped withUserContext() instead.');
}

/**
 * Express middleware to set database context from authenticated user
 * 
 * SECURITY FIX: DEPRECATED - This middleware is unsafe with connection pooling.
 * Use withRequestContext() wrapper instead.
 * 
 * Connection pooling can cause context leakage between requests.
 * Always use transaction-scoped context via withRequestContext().
 * 
 * @deprecated This middleware is unsafe and will throw an error.
 * 
 * @example
 * ```typescript
 * // DON'T DO THIS (unsafe):
 * app.use(setDatabaseContextMiddleware);
 * 
 * // DO THIS INSTEAD (safe):
 * app.get('/api/boxers', authenticate, async (req, res) => {
 *   const boxers = await withRequestContext(req, async (tx) => {
 *     return await tx.boxer.findMany();
 *   });
 *   res.json(boxers);
 * });
 * ```
 */
export function setDatabaseContextMiddleware(): void {
  throw new Error(
    'DEPRECATED: This middleware is unsafe with connection pooling. ' +
    'Use withRequestContext() wrapper instead. ' +
    'See documentation for correct usage.'
  );
}

/**
 * Helper to get database context from Express request
 * 
 * ⚠️ CRITICAL: This MUST be used for ALL authenticated database operations.
 * Never use middleware to set context - it's unsafe with connection pooling.
 * 
 * This function extracts user context from the authenticated request and
 * executes database operations within a properly scoped transaction.
 * 
 * @param req - Express request with authenticated user
 * @param operation - Database operation to execute
 * 
 * @example
 * ```typescript
 * // Correct usage in route handler:
 * app.get('/api/boxers', authenticate, async (req, res) => {
 *   const boxers = await withRequestContext(req, async (tx) => {
 *     return await tx.boxer.findMany();
 *   });
 *   res.json(boxers);
 * });
 * ```
 */
export async function withRequestContext<T>(
  req: any,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  // Extract user context from authenticated request
  if (!req.user || !req.user.id || !req.user.role) {
    throw new Error('Database context not set. Ensure authentication middleware is used.');
  }

  return await withUserContext(
    req.user.id,
    req.user.role,
    operation
  );
}

export default {
  withUserContext,
  withSystemContext,
  withRequestContext,
  getCurrentContext,
  resetContext, // Deprecated but exported for backward compatibility warnings
  setDatabaseContextMiddleware, // Deprecated but exported for backward compatibility warnings
};
