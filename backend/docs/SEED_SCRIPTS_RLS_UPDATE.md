# Seed Scripts Updated for Row Level Security (RLS)

## Overview

Updated seed scripts to work with Row Level Security (RLS) policies by wrapping all database operations in `withSystemContext()` to bypass RLS during seeding operations.

## Changes Made

### 1. Main Seed Script (`/prisma/seed.ts`)

**Updated:**
- Added import for `withSystemContext` from `../src/utils/database-context`
- Wrapped all database read operations (findUnique, findMany) in `withSystemContext`
- Wrapped all database write operations (create) in `withSystemContext`
- Added descriptive reason strings for audit trail

**Key Changes:**
```typescript
// Before
const existingUser = await prisma.user.findUnique({
  where: { email: userData.email },
});

// After
const existingUser = await withSystemContext(
  async (tx) => {
    return await tx.user.findUnique({
      where: { email: userData.email },
    });
  },
  `Database seeding - checking for existing ${label}`
);
```

**Reason Strings Used:**
- `"Database seeding - checking for existing [role]"`
- `"Database seeding - creating [role]: [name]"`
- `"Database seeding - fetching boxers for coach assignments"`
- `"Database seeding - linking [coach name] to boxer"`

### 2. Boxer Seed Script (`/scripts/seed-boxers.ts`)

**Converted from `.mjs` to `.ts`:**
- Migrated from JavaScript (.mjs) to TypeScript (.ts) for consistency
- Added proper TypeScript types from Prisma client
- Fixed type annotations for all functions and variables

**Updated:**
- Added import for `withSystemContext` from `../src/utils/database-context`
- Wrapped all database operations in `withSystemContext`
- Each database operation (club queries, boxer creation, statistics) now uses system context
- Added descriptive reason strings for all operations

**Key Changes:**
```typescript
// Before
const clubs = await prisma.club.findMany({
  select: { id: true, name: true }
});

// After
const clubs = await withSystemContext(
  async (tx) => {
    return await tx.club.findMany({
      select: { id: true, name: true }
    });
  },
  'Database seeding - fetching clubs for boxer assignments'
);
```

**Reason Strings Used:**
- `"Database seeding - fetching clubs for boxer assignments"`
- `"Database seeding - counting existing boxers"`
- `"Database seeding - creating test boxer: [name]"`
- `"Database seeding - generating [statistic type] statistics"`
- `"Database seeding - counting total/verified boxers"`
- `"Database seeding - fetching sample boxers for display"`

### 3. Package.json Updates

**Added script:**
```json
"seed:boxers": "ts-node scripts/seed-boxers.ts"
```

**Available seed commands:**
- `npm run prisma:seed` - Run main seed (admins, gym owners, coaches)
- `npm run seed:boxers` - Run boxer seed (50 test boxers)

## Why These Changes Were Necessary

### RLS Policy Restrictions

With RLS enabled, the following policies would have blocked seeding:

1. **User Creation Policy:** Only allows creation of users with roles: BOXER, COACH, GYM_OWNER
   - Problem: Seed script creates ADMIN users
   - Solution: System context bypasses this restriction

2. **Context Requirements:** RLS policies require `app.current_user_id` and `app.current_user_role` to be set
   - Problem: Seed scripts run without authenticated user context
   - Solution: System context bypasses context requirement

### System Context Benefits

Using `withSystemContext` provides:
- **RLS Bypass:** Allows privileged operations during seeding
- **Audit Trail:** Requires reason string for all system operations
- **Transaction Safety:** All operations run in a database transaction
- **Security Logging:** Logs all system context usage for security audits

## Testing the Updated Scripts

### Test Main Seed
```bash
cd backend
npm run prisma:seed
```

**Expected Output:**
```
Seeding admins...
  Created: System Admin (admin@boxerconnect.com)
  Created: Dan Admin (dan.admin@test.com)
Seeding gym owners...
  Created: Wild Card Boxing (wildcard@test.com)
  Created: Kronk Gym (kronk@test.com)
  Created: Gleason's Gym (gleasons@test.com)
Seeding coaches...
  Created: Freddie Roach (freddie.roach@test.com)
  Created: Emanuel Steward (emanuel.steward@test.com)
  Created: Cus D'Amato (cus.damato@test.com)
  Created: Angelo Dundee (angelo.dundee@test.com)
Seeding complete!
```

### Test Boxer Seed
```bash
cd backend
npm run seed:boxers
```

**Expected Output:**
```
Starting boxer seeding...

Found X clubs to assign boxers to.

Current boxers in database: X

Generating male boxers...
Generating female boxers...

Creating 50 boxers...

Created 10/50 boxers...
Created 20/50 boxers...
Created 30/50 boxers...
Created 40/50 boxers...
Created 50/50 boxers...

=== SEEDING COMPLETE ===

=== BOXER STATISTICS ===

Total boxers: X
Verified: X

By Gender:
  MALE: X
  FEMALE: X

By Experience Level:
  BEGINNER: X
  AMATEUR: X
  INTERMEDIATE: X
  ADVANCED: X
  PROFESSIONAL: X

=== SAMPLE BOXERS ===

[Sample boxer details...]
```

## Security Considerations

### Audit Logging

All system context usage is logged with:
```typescript
console.warn('[SECURITY AUDIT] System context bypassing RLS', {
  reason,
  timestamp: new Date().toISOString(),
});
```

**Review logs after seeding:**
```bash
# Check for system context usage
grep "SECURITY AUDIT" logs/*.log
```

### Reason String Requirements

The `withSystemContext` function now requires a reason string:
- **Empty reasons are rejected** - Prevents accidental bypass
- **Reason logged for audit** - Creates audit trail
- **Best practice** - Use descriptive reasons that explain the operation

### When to Use System Context

**Appropriate uses:**
- Database seeding scripts (this use case)
- Cron jobs and background tasks
- Admin tools and utilities
- Data migrations

**Inappropriate uses:**
- User-facing API endpoints
- Request handlers
- Any operation that should respect user permissions

## Migration Path

If you have existing seed data and want to re-seed:

```bash
# 1. Backup existing data (if needed)
npm run backup:data

# 2. Reset database (WARNING: Deletes all data)
npm run db:reset

# 3. Run migrations
npm run prisma:migrate

# 4. Run seed scripts
npm run prisma:seed
npm run seed:boxers

# 5. Verify data
npm run prisma:studio
```

## Files Modified

1. `/Users/dan/Desktop/Projects/BoxerConnect/backend/prisma/seed.ts`
2. `/Users/dan/Desktop/Projects/BoxerConnect/backend/scripts/seed-boxers.ts` (created, replaces .mjs)
3. `/Users/dan/Desktop/Projects/BoxerConnect/backend/package.json`

## Files Removed

1. `/Users/dan/Desktop/Projects/BoxerConnect/backend/scripts/seed-boxers.mjs` (replaced by .ts version)

## Next Steps

1. Test both seed scripts with RLS enabled
2. Verify all users and boxers are created correctly
3. Check audit logs for system context usage
4. Update any other scripts that interact with the database
5. Document any additional seeding procedures

## Related Documentation

- [Row Level Security Documentation](./ROW_LEVEL_SECURITY.md)
- [Database Context Utilities](../src/utils/database-context.ts)
- [RLS Migration Summary](../../RLS_MIGRATION_SUMMARY.md)
