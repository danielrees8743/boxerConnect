# RLS Quick Start Guide

## What is Row Level Security (RLS)?

Row Level Security enforces access control at the database level, ensuring users can only access data they're authorized to see - even if there's a bug in the application code.

## How It Works

### 1. User Context is Set
Before any database operation, the application sets two variables:
- `app.current_user_id` - The user's UUID
- `app.current_user_role` - The user's role (ADMIN, GYM_OWNER, COACH, BOXER)

### 2. Policies Filter Results
Every query is automatically filtered by PostgreSQL RLS policies based on the user's role and ID.

### 3. Unauthorized Access Fails
If a user tries to access data they shouldn't, the database returns empty results or permission denied errors.

## Quick Example

### Without RLS (Application-Level Security)
```typescript
// Application must check permissions
router.get('/boxers/:id', async (req, res) => {
  const boxer = await prisma.boxer.findUnique({
    where: { id: req.params.id }
  });
  
  // Manual permission check
  if (boxer.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json(boxer);
});
```

**Problem**: If you forget the permission check, any user can access any boxer profile.

### With RLS (Database-Level Security)
```typescript
// Database automatically enforces permissions
import { withRequestContext } from '../utils/database-context';

router.get('/boxers/:id', async (req, res) => {
  const boxer = await withRequestContext(req, async (tx) => {
    return await tx.boxer.findUnique({
      where: { id: req.params.id }
    });
  });
  
  // If unauthorized, boxer will be null
  if (!boxer) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json(boxer);
});
```

**Benefit**: Database automatically enforces access control. Forgot to add a check? Database still protects the data.

## Real-World Scenarios

### Scenario 1: Boxer Views Their Profile
```typescript
// User: boxer-123, Role: BOXER
const result = await withUserContext('boxer-123', 'BOXER', async (tx) => {
  return await tx.boxer.findMany();
});

// Result: Only their own profile + public searchable profiles
```

### Scenario 2: Coach Views Boxers
```typescript
// User: coach-456, Role: COACH
const result = await withUserContext('coach-456', 'COACH', async (tx) => {
  return await tx.boxer.findMany();
});

// Result: Only boxers assigned to this coach + public profiles
```

### Scenario 3: Gym Owner Views Club Boxers
```typescript
// User: owner-789, Role: GYM_OWNER
const result = await withUserContext('owner-789', 'GYM_OWNER', async (tx) => {
  return await tx.boxer.findMany({
    where: { clubId: 'club-abc' }
  });
});

// Result: Only boxers in clubs owned by this user
// If owner-789 doesn't own club-abc, returns empty array
```

### Scenario 4: Admin Views Everything
```typescript
// User: admin-001, Role: ADMIN
const result = await withUserContext('admin-001', 'ADMIN', async (tx) => {
  return await tx.boxer.findMany();
});

// Result: ALL boxers in the database
```

## Integration in 3 Steps

### Step 1: Import the Utility
```typescript
import { withRequestContext } from '../utils/database-context';
```

### Step 2: Wrap Your Database Operations
```typescript
const data = await withRequestContext(req, async (tx) => {
  // All queries here are automatically filtered by RLS
  return await tx.boxer.findMany();
});
```

### Step 3: Handle Results
```typescript
// If unauthorized, results will be empty or null
if (!data || data.length === 0) {
  return res.status(404).json({ error: 'Not found' });
}

res.json(data);
```

## Common Use Cases

### Get Current User's Data
```typescript
const myProfile = await withRequestContext(req, async (tx) => {
  return await tx.boxer.findUnique({
    where: { userId: req.user.id },
    include: {
      fightHistory: true,
      availability: true,
      videos: true,
    },
  });
});
```

### Search Public Profiles
```typescript
const publicBoxers = await withRequestContext(req, async (tx) => {
  return await tx.boxer.findMany({
    where: {
      isSearchable: true,
      city: 'London',
      experienceLevel: 'INTERMEDIATE',
    },
  });
});
// RLS automatically adds: AND (is_searchable = true AND is_verified = true)
```

### Create a Record
```typescript
const matchRequest = await withRequestContext(req, async (tx) => {
  return await tx.matchRequest.create({
    data: {
      requesterBoxerId: req.user.boxerId,
      targetBoxerId: targetId,
      message: 'Want to spar?',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
});
// RLS verifies user has permission to create this request
```

### Update a Record
```typescript
const updated = await withRequestContext(req, async (tx) => {
  return await tx.boxer.update({
    where: { id: boxerId },
    data: { bio: 'Updated bio' },
  });
});
// RLS ensures user can only update their own profile
// If unauthorized, throws error
```

## What Gets Protected?

| Table | BOXER | COACH | GYM_OWNER | ADMIN |
|-------|-------|-------|-----------|-------|
| users | Own record | Own record | Own record | All |
| boxers | Own + public | Assigned + public | Club boxers | All |
| clubs | Read all | Associated clubs | Owned clubs | All |
| fight_history | Own | Assigned boxers | Club boxers (read) | All |
| availability | Own | Assigned boxers | Club boxers (read) | All |
| match_requests | Involved in | Assigned boxers | Club boxers (read) | All |
| coach_boxer | View own coaches | Own assignments | Club relationships | All |
| club_coaches | Read all | Own associations | Owned clubs | All |
| boxer_videos | Own | Assigned boxers | Club boxers (read) | All |
| refresh_tokens | Own | Own | Own | All |
| password_reset_tokens | Own | Own | Own | All |

## Testing Your Integration

### Test 1: Verify User Can Access Own Data
```typescript
const myData = await withUserContext(userId, userRole, async (tx) => {
  return await tx.user.findUnique({ where: { id: userId } });
});

expect(myData).not.toBeNull();
expect(myData.id).toBe(userId);
```

### Test 2: Verify User Cannot Access Others' Data
```typescript
const othersData = await withUserContext(userId, 'BOXER', async (tx) => {
  return await tx.boxer.findUnique({ where: { id: otherBoxerId } });
});

// Should be null if not public or not authorized
expect(othersData).toBeNull();
```

### Test 3: Verify Admin Can Access Everything
```typescript
const allData = await withUserContext(adminId, 'ADMIN', async (tx) => {
  return await tx.boxer.findMany();
});

expect(allData.length).toBeGreaterThan(0);
```

## Troubleshooting

### Problem: All Queries Return Empty Results
**Solution**: Check that user context is being set:
```typescript
import { getCurrentContext } from '../utils/database-context';

const context = await getCurrentContext();
console.log('User ID:', context.userId);
console.log('User Role:', context.userRole);
```

### Problem: Getting Permission Denied Errors
**Solution**: User is trying to access data they don't have permission for. This is working as intended - handle gracefully:
```typescript
try {
  const data = await withRequestContext(req, async (tx) => {
    return await tx.boxer.update({
      where: { id: boxerId },
      data: updates,
    });
  });
} catch (error) {
  // RLS policy violation
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Problem: Queries Are Slow
**Solution**: RLS adds query overhead. Use EXPLAIN ANALYZE to identify bottlenecks:
```typescript
// In development, check query plans
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM boxers WHERE user_id = ${userId}
`;
console.log(result);
```

## Next Steps

1. Read full documentation: `/docs/ROW_LEVEL_SECURITY.md`
2. Review examples: `/backend/src/examples/rls-usage-examples.ts`
3. Check utility code: `/backend/src/utils/database-context.ts`
4. Test in development before deploying

## Support

- Full Documentation: `/docs/ROW_LEVEL_SECURITY.md`
- Migration Details: `/backend/prisma/migrations/20260202010000_add_rls_policies/README.md`
- Overall Summary: `/RLS_MIGRATION_SUMMARY.md`

---

**Remember**: RLS is defense-in-depth. Always implement application-level authorization too, but RLS ensures the database protects data even if application code fails.
