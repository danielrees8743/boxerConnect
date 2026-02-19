# Supabase Migration - Quick Start Guide

## Current Status
✅ **Phase 1-3 Complete** - Code ready for review  
📋 Branch: `feat/supabase-migration-phase-1-3`

## What Was Built

### Phase 1: Setup & Preparation
- ✅ @supabase/supabase-js dependency added
- ✅ Backup infrastructure created
- ✅ Backup script ready to use

### Phase 2: Database Migration
- ✅ Verification script created
- ✅ All tables covered (User, Boxer, Club, MatchRequest, FightHistory, Video)

### Phase 3: Storage Migration  
- ✅ Supabase client configuration
- ✅ Supabase storage service (with Sharp processing)
- ✅ Storage factory updated (supports local + Supabase)
- ✅ Environment configuration updated
- ✅ File migration script created
- ✅ Comprehensive documentation

## Next Steps

### 1. Code Review (NOW)
```bash
# Review all changes
git diff main

# Or use your preferred review tool
```

### 2. Install Dependencies (AFTER REVIEW)
```bash
cd backend
npm install
```

### 3. Test Compilation
```bash
cd backend
npm run build
```

### 4. Configure Supabase (WHEN READY)
```bash
# Add to backend/.env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Run Migration (STAGING FIRST)
```bash
# Step 1: Backup
./backend/scripts/backup-pre-migration.sh

# Step 2: Migrate database (manual export/import)
# Step 3: Migrate files
ts-node backend/scripts/migrate-files-to-supabase.ts

# Step 4: Verify
ts-node backend/scripts/verify-migration.ts

# Step 5: Switch provider
# Set STORAGE_PROVIDER=supabase in .env
```

## Files Changed

### Modified (6)
1. `backend/package.json` - Dependency
2. `backend/.env.example` - Documentation
3. `backend/src/config/env.ts` - Environment schema
4. `backend/src/config/index.ts` - Exports
5. `backend/src/services/storage/index.ts` - Factory
6. `backend/src/types/index.ts` - Types

### Created (7)
1. `backend/src/config/supabase.ts` - Client config
2. `backend/src/services/storage/supabaseStorage.service.ts` - Storage service
3. `backend/scripts/backup-pre-migration.sh` - Backup script
4. `backend/scripts/migrate-files-to-supabase.ts` - Migration script
5. `backend/scripts/verify-migration.ts` - Verification script
6. `backend/scripts/README.md` - Documentation
7. `SUPABASE_MIGRATION_PHASE_1-3_SUMMARY.md` - Summary

## Documentation

- **Full Summary**: `SUPABASE_MIGRATION_PHASE_1-3_SUMMARY.md`
- **Scripts Guide**: `backend/scripts/README.md`
- **Environment Setup**: `backend/.env.example`

## Quick Reference

### Backup Command
```bash
./backend/scripts/backup-pre-migration.sh
```

### Migrate Files
```bash
ts-node backend/scripts/migrate-files-to-supabase.ts
```

### Verify Migration
```bash
ts-node backend/scripts/verify-migration.ts
```

### Switch Storage Provider
```bash
# In backend/.env
STORAGE_PROVIDER=supabase  # or 'local'
```

## Security Reminders

- ⚠️ Never commit SUPABASE_SERVICE_ROLE_KEY
- ⚠️ Create 'uploads' bucket in Supabase (public)
- ⚠️ Configure RLS policies for bucket access
- ⚠️ Keep backups for 30 days post-migration

## Support

- Detailed docs: `backend/scripts/README.md`
- Troubleshooting: See README.md troubleshooting section
- Rollback plan: See SUMMARY.md rollback section

---

**Ready for Code Review!** 🚀
