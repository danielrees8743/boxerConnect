# RLS Integration Tests - Quick Start Guide

This guide will help you get the RLS integration tests up and running in 5 minutes.

## Prerequisites

✅ PostgreSQL 15+ installed and running
✅ Node.js 18+ installed
✅ Project dependencies installed (`npm install`)

## Quick Setup (Automated)

### Option 1: Automated Setup Script (Recommended)

```bash
# Run the automated setup script
npm run test:setup

# Run the tests
npm run test:integration:rls
```

That's it! The script will:
- Create the test database
- Apply all migrations including RLS policies
- Verify RLS is enabled
- Create `.env.test` configuration file

---

## Manual Setup (If Automated Script Fails)

### Step 1: Create Test Database

```bash
# Using createdb
createdb boxerconnect_test

# Or using psql
psql -U postgres -c "CREATE DATABASE boxerconnect_test;"
```

### Step 2: Set Environment Variable

```bash
export DATABASE_URL="postgresql://boxer:boxer_dev_password@localhost:5432/boxerconnect_test?schema=public"
```

**Note**: Replace `boxer` and `boxer_dev_password` with your PostgreSQL username and password.

### Step 3: Apply Migrations

```bash
npm run prisma:migrate
```

### Step 4: Verify RLS Enabled

```bash
psql boxerconnect_test -c "
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
"
```

You should see `rowsecurity = t` (true) for all tables.

---

## Running Tests

### All Integration Tests

```bash
npm run test:integration
```

### RLS Security Tests Only

```bash
npm run test:integration:rls
```

### With Debug Logging

```bash
DEBUG_TESTS=true npm run test:integration:rls
```

### Watch Mode

```bash
npm run test:integration:watch
```

### Specific Test Suite

```bash
# Role escalation tests
npx jest tests/integration/rls-security.test.ts -t "Role Escalation"

# SQL injection tests
npx jest tests/integration/rls-security.test.ts -t "SQL Injection"

# Token expiration tests
npx jest tests/integration/rls-security.test.ts -t "Token Expiration"
```

---

## Expected Output

When tests run successfully, you'll see:

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
      ...
    [Additional test suites]
    ...

Test Suites: 1 passed, 1 total
Tests:       58 passed, 58 total
Snapshots:   0 total
Time:        12.345s
```

---

## Common Issues and Solutions

### Issue: "Database connection failed"

**Cause**: PostgreSQL not running or connection string incorrect

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
```

### Issue: "Table does not exist"

**Cause**: Migrations not applied

**Solution**:
```bash
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
npm run prisma:migrate
```

### Issue: "RLS policy violation"

**Cause**: RLS policies not enabled on tables

**Solution**:
```bash
# Check RLS status
psql boxerconnect_test -c "
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
"

# If disabled, reapply migration
npm run prisma:migrate
```

### Issue: "CRITICAL ERROR: Integration tests must use a test database!"

**Cause**: DATABASE_URL doesn't contain `_test` suffix

**Solution**:
```bash
# Ensure your DATABASE_URL ends with a test database name
export DATABASE_URL="postgresql://user:pass@localhost:5432/boxerconnect_test?schema=public"
#                                                                    ^^^^^ must contain _test
```

### Issue: Tests timeout or run slowly

**Cause**: Database is slow or test database needs optimization

**Solution**:
```bash
# Analyze database
psql boxerconnect_test -c "ANALYZE;"

# Vacuum database
psql boxerconnect_test -c "VACUUM ANALYZE;"
```

---

## Clean Up / Reset

### Reset Test Database

```bash
export DATABASE_URL="postgresql://boxer:password@localhost:5432/boxerconnect_test?schema=public"
npm run db:reset
```

### Drop Test Database

```bash
dropdb boxerconnect_test
```

Then run setup again:
```bash
npm run test:setup
```

---

## Testing Individual Security Fixes

Each critical security fix has dedicated tests:

### 1. Role Escalation Prevention
```bash
npx jest tests/integration/rls-security.test.ts -t "Role Escalation Prevention"
```

### 2. SQL Injection Protection
```bash
npx jest tests/integration/rls-security.test.ts -t "SQL Injection Protection"
```

### 3. Signup Flow Validation
```bash
npx jest tests/integration/rls-security.test.ts -t "Signup Flow Validation"
```

### 4. Token Expiration
```bash
npx jest tests/integration/rls-security.test.ts -t "Token Expiration Validation"
```

### 5. Coach Match Request Abuse
```bash
npx jest tests/integration/rls-security.test.ts -t "Coach Match Request Abuse Prevention"
```

### 6. Context Isolation
```bash
npx jest tests/integration/rls-security.test.ts -t "Context Isolation"
```

### 7. Deprecated Functions
```bash
npx jest tests/integration/rls-security.test.ts -t "Deprecated Function Error Handling"
```

### 8. System Context Audit
```bash
npx jest tests/integration/rls-security.test.ts -t "System Context Audit Logging"
```

---

## Next Steps

After running tests successfully:

1. ✅ **Review test results** - All 58 tests should pass
2. ✅ **Check coverage** - Run with `--coverage` flag
3. ✅ **Review documentation** - Read [README.md](./README.md) and [TEST_SUMMARY.md](./TEST_SUMMARY.md)
4. ✅ **Integrate with CI/CD** - Add to your GitHub Actions workflow
5. ✅ **Run before deployment** - Include in pre-deployment checks

---

## Getting Help

- **Full documentation**: See [README.md](./README.md)
- **Test details**: See [TEST_SUMMARY.md](./TEST_SUMMARY.md)
- **RLS policies**: See [migration.sql](../../prisma/migrations/20260202010000_add_rls_policies/migration.sql)
- **Context utilities**: See [database-context.ts](../../src/utils/database-context.ts)

---

## Summary Commands

```bash
# Complete setup and test run
npm run test:setup                    # Setup test database
npm run test:integration:rls          # Run RLS tests
npm run test:integration -- --coverage # Run with coverage

# Alternative: All in one
npm run test:setup && npm run test:integration:rls

# Debug mode
DEBUG_TESTS=true npm run test:integration:rls

# Continuous development
npm run test:integration:watch
```

---

**Last Updated**: 2026-02-02
**Estimated Setup Time**: 2-5 minutes
**Total Test Runtime**: ~12-15 seconds
