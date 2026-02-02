# RLS Deployment Guide

Complete deployment procedure for enabling Row Level Security in production.

## Pre-Deployment Checklist

Before deploying RLS to production:

- [ ] **Backup Database**: Create full database backup
- [ ] **Test in Staging**: Verify all RLS tests pass in staging environment
- [ ] **Code Integration**: Confirm all database operations use `withUserContext` or `withSystemContext`
- [ ] **Review Security Fixes**: Verify all 8 critical security fixes are applied
- [ ] **Performance Testing**: Run performance tests to establish baseline
- [ ] **Team Notification**: Notify team of deployment window
- [ ] **Rollback Plan**: Document rollback procedure
- [ ] **Monitoring Setup**: Configure monitoring for RLS-related errors

## Deployment Steps

### Step 1: Verify Current State

```bash
# Check current migrations
npx prisma migrate status

# Verify database connection
npx prisma db pull
```

### Step 2: Backup Production Database

**For Supabase**:
```bash
# Using Supabase CLI
supabase db dump --db-url "$DATABASE_URL" > backup_pre_rls.sql

# Verify backup
ls -lh backup_pre_rls.sql
```

**For Self-Hosted PostgreSQL**:
```bash
pg_dump -U postgres -d boxerconnect -F c -f backup_pre_rls.dump
```

### Step 3: Apply RLS Migration

```bash
# Navigate to backend directory
cd backend

# Apply migration
npx prisma migrate deploy

# Expected output:
# 1 migration found in prisma/migrations
# Applying migration `20260202010000_add_rls_policies`
# Migration applied successfully
```

### Step 4: Verify RLS Enabled

Run validation script:
```bash
cd backend
bash scripts/validate-rls-migration.sh
```

**Expected Output**:
```
✅ All 11 tables have RLS enabled
✅ All 49 policies created
✅ All 6 helper functions present
```

### Step 5: Test Role Access

Run integration tests:
```bash
npm run test:integration:rls
```

**Expected**: All 58 tests pass in ~12-15 seconds

### Step 6: Monitor Application

Monitor logs for RLS-related errors:
```bash
# Look for policy violations (expected during normal operation)
# Look for context setting errors (unexpected - investigate immediately)
```

### Step 7: Verify Production Functionality

Test each user role:
1. **BOXER**: Log in, view profile, create match request
2. **COACH**: Log in, view assigned boxers, manage availability
3. **GYM_OWNER**: Log in, view club, manage coaches
4. **ADMIN**: Log in, access all data

### Step 8: Performance Check

Compare query performance before/after:
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Expected**: < 15% overhead for most queries

## Post-Deployment

- [ ] Verify all user roles can access their data
- [ ] Confirm no unauthorized access logged
- [ ] Check application error logs
- [ ] Monitor performance metrics
- [ ] Document any issues encountered
- [ ] Update team on successful deployment

## Rollback Procedure

If critical issues arise:

### Step 1: Disable RLS Temporarily (Emergency)

```sql
-- Connect to database
psql $DATABASE_URL

-- Disable RLS on all tables (emergency only)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE boxers DISABLE ROW LEVEL SECURITY;
-- (repeat for all 11 tables)
```

### Step 2: Rollback Migration (Permanent)

```bash
# Revert migration
npx prisma migrate resolve --rolled-back 20260202010000_add_rls_policies

# Apply previous state
npx prisma migrate deploy
```

### Step 3: Verify Rollback

```bash
# Check RLS status
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;"

# Expected: Empty result (no tables with RLS)
```

### Step 4: Restore Application

```bash
# Ensure application code works without RLS
# May need to temporarily deploy previous version
```

## Known Issues

1. **First Query Slow**: First query after deployment may be slower due to policy compilation. Subsequent queries are cached.

2. **Connection Pooling**: Ensure `SET LOCAL` is used (already implemented) to prevent context leakage.

3. **Admin Operations**: Some admin operations may need `withSystemContext` instead of `withUserContext`.

## Monitoring Recommendations

**Key Metrics to Monitor**:
- Query performance (pg_stat_statements)
- RLS policy violations (application logs)
- Failed authentication attempts
- System context usage frequency
- Database connection pool usage

**Alerts to Configure**:
- Query time > 2x baseline
- System context called outside admin operations
- Policy violation rate > normal baseline

## Troubleshooting

### Issue: "Permission denied for table X"
**Cause**: RLS policy blocking access
**Solution**: Verify user role and context are set correctly

### Issue: "current_user_id() returns NULL"
**Cause**: Database context not set
**Solution**: Ensure operation wrapped in `withUserContext` or `withRequestContext`

### Issue: Performance degradation
**Cause**: RLS policies checking on every row
**Solution**: Review query plans, add indexes if needed

## Success Criteria

Deployment is successful when:
- ✅ All 58 RLS integration tests pass
- ✅ All user roles can access their authorized data
- ✅ No user role can access unauthorized data
- ✅ Query performance within 15% of baseline
- ✅ No application errors related to RLS
- ✅ Audit logging working for system context

## Timeline Estimate

- **Small Database** (< 10k records): 5-15 minutes downtime
- **Medium Database** (10k-100k records): 15-30 minutes downtime
- **Large Database** (> 100k records): 30-60 minutes downtime

**Note**: Downtime can be minimized by running migration during low-traffic period.

## Support

For issues during deployment:
1. Check [Troubleshooting Guide](ROW_LEVEL_SECURITY.md#troubleshooting)
2. Review [Security Fixes Documentation](SECURITY_FIXES_RLS.md)
3. Run validation script: `bash scripts/validate-rls-migration.sh`
4. Check application logs for context-setting errors
