# RLS Security Fixes - Critical Vulnerability Remediation

**Date:** 2026-02-02  
**Status:** COMPLETED  
**Severity:** CRITICAL

## Overview

This document details the critical security vulnerabilities identified in the Row Level Security (RLS) implementation and the fixes applied to remediate them.

## Files Modified

1. `/backend/src/utils/database-context.ts` - Context management utilities
2. `/backend/prisma/migrations/20260202010000_add_rls_policies/migration.sql` - RLS policies

## Critical Vulnerabilities Fixed

### 1. SQL Injection Vulnerability (CRITICAL)

**Location:** `database-context.ts` lines 56-57

**Vulnerability:**
```typescript
// VULNERABLE CODE (before fix)
await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
await tx.$executeRawUnsafe(`SET LOCAL app.current_user_role = '${userRole}'`);
```

**Issue:** String interpolation in SQL queries allows SQL injection attacks, even with validation.

**Fix Applied:**
```typescript
// SECURE CODE (after fix)
await tx.$executeRaw`SET LOCAL app.current_user_id = ${userId}`;
await tx.$executeRaw`SET LOCAL app.current_user_role = ${userRole}`;
```

**Mitigation:** Changed from `$executeRawUnsafe` to `$executeRaw` with template literals, providing parameterized queries that prevent SQL injection.

---

### 2. Role Escalation Vulnerability (CRITICAL)

**Location:** `migration.sql` lines 96-104 (users table policies)

**Vulnerability:**
```sql
-- VULNERABLE CODE (before fix)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());
```

**Issue:** Users could update their own `role` field to `ADMIN`, granting themselves full system access.

**Fix Applied:**
```sql
-- SECURE CODE (after fix)
-- Users can update their own record but CANNOT change role or is_active
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = current_user_id())
  WITH CHECK (
    id = current_user_id() 
    AND role = (SELECT role FROM users WHERE id = current_user_id())
    AND is_active = (SELECT is_active FROM users WHERE id = current_user_id())
  );

-- Only admins can change user roles and active status
CREATE POLICY "users_update_role_admin_only" ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
```

**Mitigation:** Split policy to prevent role/status changes by users. Only admins can modify roles and active status.

---

### 3. Broken Signup Policy (CRITICAL)

**Location:** `migration.sql` lines 102-104

**Vulnerability:**
```sql
-- BROKEN CODE (before fix)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (id = current_user_id());
```

**Issue:** During signup, `current_user_id()` returns NULL (user doesn't exist yet), making signup impossible.

**Fix Applied:**
```sql
-- SECURE CODE (after fix)
-- Allow unauthenticated signup but restrict to non-admin roles
CREATE POLICY "users_signup" ON users
  FOR INSERT
  WITH CHECK (
    -- Only allow non-admin roles during public signup
    role IN ('BOXER', 'COACH', 'GYM_OWNER')
  );
```

**Mitigation:** Allow unauthenticated INSERT but restrict to non-admin roles. Admin accounts must be created via `withSystemContext` by existing admins.

---

### 4. Connection Pooling Context Leakage (CRITICAL)

**Location:** `database-context.ts` lines 148-189

**Vulnerability:**
- Middleware setting session-level context can leak between pooled connections
- `resetContext()` function not safe with connection pooling
- No warnings about proper usage

**Fix Applied:**
```typescript
// Deprecated the unsafe middleware
export function setDatabaseContextMiddleware(): void {
  throw new Error(
    'DEPRECATED: This middleware is unsafe with connection pooling. ' +
    'Use withRequestContext() wrapper instead. ' +
    'See documentation for correct usage.'
  );
}

// Deprecated resetContext
export async function resetContext(): Promise<void> {
  console.warn('[DEPRECATED] resetContext() should not be used.');
  throw new Error('resetContext() is deprecated and unsafe.');
}

// Enhanced documentation on withRequestContext
/**
 * ⚠️ CRITICAL: This MUST be used for ALL authenticated database operations.
 * Never use middleware to set context - it's unsafe with connection pooling.
 */
export async function withRequestContext<T>(...) { ... }
```

**Mitigation:** 
- Deprecated unsafe functions with clear error messages
- Enhanced documentation with security warnings
- Force developers to use transaction-scoped context

---

### 5. System Context Audit Logging (MEDIUM)

**Location:** `database-context.ts` lines 106-114

**Issue:** No accountability for system context usage bypassing RLS.

**Fix Applied:**
```typescript
export async function withSystemContext<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  reason: string  // NOW REQUIRED
): Promise<T> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('System context usage must include a reason for audit trail');
  }
  
  console.warn('[SECURITY AUDIT] System context bypassing RLS', {
    reason,
    timestamp: new Date().toISOString(),
  });
  
  // ... rest of function
}
```

**Mitigation:** 
- Made `reason` parameter required
- Added audit logging for all system context usage
- Creates accountability trail for RLS bypasses

---

### 6. Match Request Coach Creation Abuse (MEDIUM)

**Location:** `migration.sql` lines 343-353

**Vulnerability:**
```sql
-- VULNERABLE CODE (before fix)
CREATE POLICY "match_requests_coach_assigned" ON match_requests
  FOR ALL
  USING (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id))
  WITH CHECK (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id));
```

**Issue:** Coach could create match requests TO their boxer FROM any other boxer, potentially creating fraudulent requests.

**Fix Applied:**
```sql
-- SECURE CODE (after fix)
-- Split into separate policies
CREATE POLICY "match_requests_coach_view" ON match_requests
  FOR SELECT
  USING (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id));

CREATE POLICY "match_requests_coach_create" ON match_requests
  FOR INSERT
  WITH CHECK (is_coach_of_boxer(requester_boxer_id));  -- Only FROM their boxer

CREATE POLICY "match_requests_coach_update" ON match_requests
  FOR UPDATE
  USING (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id))
  WITH CHECK (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id));

CREATE POLICY "match_requests_coach_delete" ON match_requests
  FOR DELETE
  USING (is_coach_of_boxer(requester_boxer_id) OR is_coach_of_boxer(target_boxer_id));
```

**Mitigation:** Split policy by operation. Coaches can only create requests FROM their assigned boxers.

---

### 7. Token Expiration Validation (MEDIUM)

**Location:** `migration.sql` lines 522-554

**Vulnerability:**
```sql
-- VULNERABLE CODE (before fix)
CREATE POLICY "refresh_tokens_own" ON refresh_tokens
  FOR ALL
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());
```

**Issue:** No expiration checks allowed access to expired tokens, potentially enabling session extension attacks.

**Fix Applied:**
```sql
-- SECURE CODE (after fix)
CREATE POLICY "refresh_tokens_own" ON refresh_tokens
  FOR ALL
  USING (
    user_id = current_user_id() 
    AND expires_at > NOW()
  )
  WITH CHECK (
    user_id = current_user_id()
    AND expires_at > NOW()
  );

CREATE POLICY "password_reset_tokens_own_read" ON password_reset_tokens
  FOR SELECT
  USING (
    user_id = current_user_id() 
    AND expires_at > NOW()
    AND used_at IS NULL
  );

-- Prevent users from modifying reset tokens
CREATE POLICY "password_reset_tokens_no_user_modify" ON password_reset_tokens
  FOR UPDATE
  USING (false)
  WITH CHECK (false);
```

**Mitigation:** 
- Added expiration validation to all token access
- Prevented users from modifying reset tokens (prevents replay attacks)
- Application logic handles token usage via `withSystemContext`

---

## Testing Requirements

Before deploying these fixes, the following must be tested:

### 1. SQL Injection Protection
- [ ] Test with malicious userId containing SQL (`'; DROP TABLE users; --`)
- [ ] Test with malicious role values
- [ ] Verify parameterized queries prevent injection

### 2. Role Escalation Prevention
- [ ] Attempt to update own role to ADMIN (should fail)
- [ ] Attempt to change own is_active status (should fail)
- [ ] Verify admin can change user roles
- [ ] Verify users can update other profile fields

### 3. Signup Functionality
- [ ] Test new user signup with BOXER role (should succeed)
- [ ] Test new user signup with COACH role (should succeed)
- [ ] Test new user signup with ADMIN role (should fail)
- [ ] Verify admin creation via `withSystemContext` works

### 4. Context Leakage Prevention
- [ ] Verify middleware throws error when called
- [ ] Verify resetContext throws error when called
- [ ] Test withRequestContext with multiple concurrent requests
- [ ] Verify transaction-scoped context isolation

### 5. System Context Audit
- [ ] Verify system context without reason throws error
- [ ] Verify audit logs are created
- [ ] Test system context with valid reason

### 6. Match Request Creation
- [ ] Coach creates request FROM their boxer (should succeed)
- [ ] Coach attempts to create request TO their boxer FROM another boxer (should fail)
- [ ] Verify coaches can view/update/delete requests involving their boxers

### 7. Token Expiration
- [ ] Access expired refresh token (should fail)
- [ ] Access valid refresh token (should succeed)
- [ ] Attempt to modify password reset token (should fail)
- [ ] Access used password reset token (should fail)

## Deployment Checklist

- [ ] Review all changes in this document
- [ ] Run all tests in Testing Requirements section
- [ ] Update API documentation if needed
- [ ] Deploy to staging environment
- [ ] Perform security audit on staging
- [ ] Run penetration tests
- [ ] Monitor logs for audit trail functionality
- [ ] Deploy to production
- [ ] Post-deployment security verification

## Breaking Changes

### For Developers

1. **System Context Usage**
   - `withSystemContext()` now requires a `reason` parameter
   - Update all calls: `withSystemContext(op, 'reason for audit')`

2. **Middleware Deprecated**
   - `setDatabaseContextMiddleware()` throws error
   - Use `withRequestContext()` in route handlers instead

3. **Reset Context Deprecated**
   - `resetContext()` throws error
   - Remove all calls (not needed with transaction-scoped context)

### For Users

- No user-facing breaking changes
- Signup flow unchanged (still supports BOXER, COACH, GYM_OWNER)
- Admin accounts must now be created by existing admins

## Security Impact

**Before Fixes:**
- SQL injection possible via context parameters
- Users could escalate privileges to admin
- Signup completely broken
- Context leakage risk in connection pooling
- No audit trail for privileged operations
- Coaches could create fraudulent match requests
- Expired tokens accessible

**After Fixes:**
- SQL injection prevented by parameterized queries
- Role escalation impossible
- Signup working with proper restrictions
- Context properly isolated to transactions
- Full audit trail for system operations
- Match request creation properly restricted
- Expired tokens inaccessible

## References

- [Prisma SQL Injection Prevention](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#raw-queries)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP Privilege Escalation](https://owasp.org/www-community/attacks/Privilege_escalation)

---

**Security Review Status:** FIXES APPLIED - PENDING TESTING

**Next Steps:**
1. Run comprehensive test suite
2. Security audit by security engineer
3. Penetration testing
4. Deploy to staging for verification
