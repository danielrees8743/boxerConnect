# RLS Integration Tests

This directory contains integration tests for Row Level Security (RLS) policies in BoxerConnect.

## Overview

These tests verify that PostgreSQL Row Level Security policies correctly enforce access control across all database tables. Unlike unit tests that use mocks, these integration tests interact with a real PostgreSQL database to validate actual RLS policy behavior.

## Test Coverage

### Critical Security Tests (8 test suites)

1. **Role Escalation Prevention** - Prevents users from promoting themselves to ADMIN
2. **SQL Injection Protection** - Validates input sanitization and parameterized queries
3. **Signup Flow Validation** - Ensures only non-admin roles can self-register
4. **Token Expiration** - Filters expired tokens from user access
5. **Coach Match Request Abuse** - Prevents coaches from creating fraudulent match requests
6. **Context Isolation** - Ensures concurrent requests don't leak user context
7. **Deprecated Functions** - Validates error handling for unsafe functions
8. **System Context Audit** - Requires audit trail for RLS bypass operations

### Role-Based Access Control Tests (4 roles)

- **ADMIN** - Full access to all data
- **GYM_OWNER** - Access to owned clubs and associated boxers
- **COACH** - Access to assigned boxers only
- **BOXER** - Access to own data only

### Table Coverage (11 tables)

- `users` - User accounts and authentication
- `boxers` - Boxer profiles
- `clubs` - Boxing clubs/gyms
- `fight_history` - Fight records
- `availability` - Boxer availability schedules
- `match_requests` - Sparring match requests
- `coach_boxer` - Coach-boxer relationships
- `club_coaches` - Club-coach associations
- `boxer_videos` - Training videos
- `refresh_tokens` - JWT refresh tokens
- `password_reset_tokens` - Password reset tokens

## Prerequisites

### 1. Test Database Setup

**CRITICAL**: Integration tests require a separate test database with RLS policies applied.

```bash
# Create test database
createdb boxerconnect_test

# Or using psql
psql -U postgres -c "CREATE DATABASE boxerconnect_test;"
```

### 2. Apply Database Schema and RLS Policies

```bash
# Set test database URL
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"

# Run migrations (includes RLS policies)
npm run prisma:migrate

# Verify migrations applied
npx prisma migrate status
```

### 3. Environment Variables

Ensure your test environment has the correct database URL:

```bash
# In .env.test or set in shell
DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
```

**Important**: The database URL MUST contain `_test` suffix for safety checks.

## Running Tests

### Run All Integration Tests

```bash
# Run all integration tests
npm test tests/integration

# Or with Jest directly
npx jest tests/integration

# Run with coverage
npm test -- tests/integration --coverage
```

### Run Specific Test Suite

```bash
# Run only RLS security tests
npx jest tests/integration/rls-security.test.ts

# Run with verbose output
npx jest tests/integration/rls-security.test.ts --verbose

# Run specific test case
npx jest tests/integration/rls-security.test.ts -t "Role Escalation Prevention"
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug logging
DEBUG_TESTS=true npx jest tests/integration/rls-security.test.ts

# Show SQL queries
DATABASE_URL="postgresql://...?schema=public&log=query" npx jest tests/integration
```

### Watch Mode

```bash
# Watch for changes and re-run tests
npx jest tests/integration --watch

# Watch specific file
npx jest tests/integration/rls-security.test.ts --watch
```

## Test Structure

Each test suite follows this pattern:

```typescript
describe('Test Suite Name', () => {
  beforeAll(async () => {
    // Create test data using withSystemContext
    // This bypasses RLS for test setup
  });

  afterAll(async () => {
    // Clean up test data
  });

  it('should test expected behavior', async () => {
    // Use withUserContext to test RLS policies
    await withUserContext(userId, userRole, async (tx) => {
      // Perform database operations
      // RLS policies will enforce access control
    });

    // Assert expected behavior
    expect(result).toBe(expected);
  });
});
```

## Expected Test Results

When all tests pass, you should see output similar to:

```
PASS tests/integration/rls-security.test.ts
  RLS Security Integration Tests
    1. Role Escalation Prevention
      ✓ should prevent regular user from escalating to ADMIN role (150ms)
      ✓ should prevent user from changing is_active status (120ms)
      ✓ should allow user to update non-protected fields (100ms)
      ✓ should allow ADMIN to change user roles (130ms)
    2. SQL Injection Protection
      ✓ should reject malicious user ID with SQL injection attempt (50ms)
      ✓ should reject malicious user role with SQL injection attempt (45ms)
      ✓ should reject non-UUID user ID formats (60ms)
      ✓ should reject invalid role values (55ms)
    3. Signup Flow Validation
      ✓ should allow non-admin role signup (BOXER) (140ms)
      ✓ should allow non-admin role signup (COACH) (135ms)
      ✓ should allow non-admin role signup (GYM_OWNER) (138ms)
      ✓ should prevent ADMIN role signup without authentication (90ms)
      ✓ should allow ADMIN to create ADMIN accounts via system context (145ms)
    4. Token Expiration Validation
      ✓ should filter out expired refresh tokens (110ms)
      ✓ should allow access to non-expired refresh tokens (105ms)
      ✓ should filter out expired password reset tokens (108ms)
      ✓ should filter out used password reset tokens (112ms)
      ✓ should prevent users from modifying password reset tokens (95ms)
    5. Coach Match Request Abuse Prevention
      ✓ should allow coach to create match request FROM their assigned boxer (125ms)
      ✓ should prevent coach from creating fraudulent match request TO their boxer (85ms)
      ✓ should prevent coach from creating match request from unassigned boxer (82ms)
      ✓ should allow coach to view match requests involving their boxer (115ms)
      ✓ should allow coach to update match requests involving their boxer (120ms)
    6. Context Isolation Between Concurrent Requests
      ✓ should isolate user context in concurrent requests (500ms)
      ✓ should not leak data between concurrent user contexts (450ms)
    7. Deprecated Function Error Handling
      ✓ should throw error when calling deprecated setDatabaseContextMiddleware (5ms)
      ✓ should throw error when calling deprecated resetContext (8ms)
    8. System Context Audit Logging
      ✓ should require reason parameter for system context (10ms)
      ✓ should reject empty reason string (12ms)
      ✓ should accept valid reason and execute operation (95ms)
    9. Role-Based Access Control
      ADMIN role
        ✓ should allow admin to access all users (140ms)
        ✓ should allow admin to access all boxers (135ms)
        ✓ should allow admin to create match requests for any boxer (145ms)
      GYM_OWNER role
        ✓ should allow gym owner to view their clubs (110ms)
        ✓ should allow gym owner to view boxers in their club (115ms)
        ✓ should prevent gym owner from viewing boxers not in their club (105ms)
      COACH role
        ✓ should allow coach to view their assigned boxers (108ms)
        ✓ should prevent coach from viewing unassigned boxers private data (102ms)
        ✓ should allow coach to update their assigned boxer profile (125ms)
      BOXER role
        ✓ should allow boxer to view their own profile (100ms)
        ✓ should prevent boxer from viewing another boxer private data (95ms)
        ✓ should allow boxer to update their own profile (115ms)
        ✓ should allow boxer to create match requests (130ms)
        ✓ should allow boxer to view public boxer profiles (120ms)
    10. Table-Specific Access Control
      fight_history table
        ✓ should allow boxer to create their own fight history (125ms)
        ✓ should prevent boxer from creating fight history for another boxer (80ms)
        ✓ should allow coach to create fight history for assigned boxer (130ms)
      availability table
        ✓ should allow boxer to manage their own availability (120ms)
        ✓ should allow coach to manage availability for assigned boxer (125ms)
        ✓ should allow public users to view available slots for public boxers (110ms)
      boxer_videos table
        ✓ should allow boxer to upload their own videos (115ms)
        ✓ should prevent boxer from uploading videos for another boxer (75ms)
      coach_boxer table
        ✓ should allow boxer to view their coaches (105ms)
        ✓ should allow boxer to remove coaches (135ms)

Test Suites: 1 passed, 1 total
Tests:       58 passed, 58 total
Snapshots:   0 total
Time:        12.345s
```

## Troubleshooting

### Tests Failing with "Database connection failed"

**Cause**: Test database is not running or connection string is incorrect.

**Solution**:
```bash
# Verify PostgreSQL is running
pg_isready

# Check database exists
psql -U postgres -l | grep boxerconnect_test

# Test connection
psql "postgresql://boxer:password@localhost:5432/boxerconnect_test"
```

### Tests Failing with "RLS policy violation"

**Cause**: RLS policies not applied to test database.

**Solution**:
```bash
# Run migrations on test database
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
npm run prisma:migrate
```

### Tests Failing with "Table does not exist"

**Cause**: Database schema not applied.

**Solution**:
```bash
# Reset and apply schema
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
npm run db:reset
```

### Tests Pass but RLS Not Actually Enforced

**Cause**: RLS policies not enabled on tables.

**Solution**:
```bash
# Verify RLS is enabled
psql boxerconnect_test -c "
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  AND rowsecurity = false;
"

# If tables show up, reapply RLS migration
npm run prisma:migrate
```

### "CRITICAL ERROR: Integration tests must use a test database!"

**Cause**: DATABASE_URL doesn't contain `_test` suffix.

**Solution**:
```bash
# Ensure test database URL is set correctly
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"

# Verify
echo $DATABASE_URL
```

### Slow Test Execution

**Cause**: Database queries are slow or test data cleanup is inefficient.

**Solution**:
```bash
# Run tests with timing information
npx jest tests/integration --verbose

# Enable query logging to identify slow queries
DATABASE_URL="postgresql://...?schema=public&log=query" npx jest tests/integration
```

## Test Data Management

### Automatic Cleanup

Tests use `beforeAll` and `afterAll` hooks to create and clean up test data automatically. Each test suite is isolated and won't interfere with others.

### Manual Cleanup

If tests fail and leave orphaned data:

```bash
# Connect to test database
psql boxerconnect_test

# Find test data (emails contain 'rls-test')
SELECT id, email FROM users WHERE email LIKE '%rls-test%';

# Clean up manually if needed
DELETE FROM users WHERE email LIKE '%rls-test%';
```

### Reset Test Database

To completely reset the test database:

```bash
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
npm run db:reset
```

## Continuous Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: boxer
          POSTGRES_PASSWORD: boxer_test_password
          POSTGRES_DB: boxerconnect_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run prisma:migrate
        env:
          DATABASE_URL: postgresql://boxer:boxer_test_password@localhost:5432/boxerconnect_test?schema=public

      - name: Run integration tests
        run: npm test tests/integration
        env:
          DATABASE_URL: postgresql://boxer:boxer_test_password@localhost:5432/boxerconnect_test?schema=public
```

## Best Practices

1. **Always use `withUserContext`** - Never bypass RLS in tests unless testing system operations
2. **Clean up test data** - Use `afterAll` hooks to remove test data
3. **Use unique identifiers** - Include UUIDs in test data to avoid conflicts
4. **Test both success and failure** - Verify both allowed and denied operations
5. **Test concurrent requests** - Ensure context isolation with concurrent operations
6. **Verify actual database state** - Use `withSystemContext` to verify changes
7. **Test all roles** - Cover ADMIN, GYM_OWNER, COACH, and BOXER scenarios
8. **Test all tables** - Ensure RLS policies work for every table

## Contributing

When adding new RLS policies or modifying existing ones:

1. Add integration tests to verify the policy works correctly
2. Test both positive (allowed) and negative (denied) cases
3. Test edge cases and potential attack vectors
4. Document any new test requirements in this README
5. Ensure all tests pass before submitting PR

## Security Considerations

These tests validate critical security controls. If any test fails:

1. **DO NOT** deploy to production
2. Investigate the root cause immediately
3. Fix the RLS policy or application code
4. Verify all tests pass before proceeding
5. Consider if the issue affects production data

## Additional Resources

- [Row Level Security Documentation](../../docs/ROW_LEVEL_SECURITY.md)
- [RLS Migration](../../prisma/migrations/20260202010000_add_rls_policies/migration.sql)
- [Database Context Utilities](../../src/utils/database-context.ts)
- [Security Fixes Summary](../../docs/SECURITY_FIXES_RLS.md)
