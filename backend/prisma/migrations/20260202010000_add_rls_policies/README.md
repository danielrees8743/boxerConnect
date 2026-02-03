# Migration: Add RLS Policies

**Migration ID**: `20260202010000_add_rls_policies`  
**Date**: 2026-02-02  
**Type**: Security Enhancement

## Overview

This migration enables Row Level Security (RLS) on all BoxerConnect database tables and creates comprehensive access control policies based on user roles.

## What This Migration Does

### 1. Helper Functions Created

- `current_user_id()` - Returns authenticated user's UUID
- `current_user_role()` - Returns user's role (ADMIN, GYM_OWNER, COACH, BOXER)
- `is_admin()` - Check if user is an admin
- `owns_club(uuid)` - Check if user owns a specific club
- `is_coach_of_boxer(uuid)` - Check if user coaches a specific boxer
- `is_coach_at_club(uuid)` - Check if user is associated with a club

### 2. Tables with RLS Enabled

- users
- boxers
- clubs
- fight_history
- availability
- match_requests
- coach_boxer
- club_coaches
- boxer_videos
- refresh_tokens
- password_reset_tokens

### 3. Access Control Rules

#### ADMIN
- Full access to all tables and records

#### GYM_OWNER
- Full access to owned clubs
- Read/Update access to boxers in owned clubs
- Full access to coaches in owned clubs
- Read access to fight history, availability, match requests for club boxers

#### COACH
- Full access to assigned boxers and their related data
- Read access to associated clubs
- View own club associations

#### BOXER
- Full access to own profile and related data
- Read access to public boxer profiles
- Read-only access to clubs
- Can manage own coach assignments

## Prerequisites

Before applying this migration, ensure:

1. All existing data has proper foreign key relationships
2. User roles are correctly set in the `users` table
3. Application code is ready to set user context (see Integration Guide)

## Integration Required

This migration requires application-level changes to set user context:

```typescript
import { withUserContext } from './utils/database-context';

// Set user context before database operations
const result = await withUserContext(userId, userRole, async (tx) => {
  return await tx.boxer.findMany();
});
```

See `/docs/ROW_LEVEL_SECURITY.md` for complete integration guide.

## Testing

After applying this migration:

1. Test each role's access patterns
2. Verify users can only access authorized data
3. Test public/unauthenticated access
4. Verify performance with EXPLAIN ANALYZE

## Performance Considerations

RLS adds query overhead. To optimize:

- Existing indexes on user_id, club_id, boxer_id support policies
- Monitor query performance with EXPLAIN ANALYZE
- Consider denormalization if policy complexity impacts performance

## Rollback

To disable RLS (not recommended for production):

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Repeat for all tables
```

See `/docs/ROW_LEVEL_SECURITY.md` for complete rollback instructions.

## Security Impact

This migration significantly enhances security by:

- Enforcing access control at the database level
- Preventing unauthorized data access even if application code is compromised
- Providing defense-in-depth security architecture

## Related Documentation

- `/docs/ROW_LEVEL_SECURITY.md` - Complete RLS guide
- `/backend/src/utils/database-context.ts` - Utility functions
- `/backend/src/examples/rls-usage-examples.ts` - Usage examples

## Support

For issues or questions:
1. Review the documentation above
2. Check PostgreSQL RLS documentation
3. Test policies with direct SQL queries to debug access issues
