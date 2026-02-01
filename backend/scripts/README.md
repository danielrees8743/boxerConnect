# BoxerConnect Backend Scripts

This directory contains utility scripts for database seeding, file migration, and maintenance tasks.

## Table of Contents

- [Database Scripts](#database-scripts)
- [Migration Scripts](#migration-scripts)
- [Backup Scripts](#backup-scripts)

---

## Database Scripts

### `seed-boxers.mjs`

Seeds the database with test boxer profiles.

**Usage:**
```bash
node backend/scripts/seed-boxers.mjs
```

**Features:**
- Creates diverse boxer profiles with varied attributes
- Assigns boxers to existing clubs
- Downloads profile photos from randomuser.me
- Generates realistic boxing data (weight, height, experience)

### `import-clubs.mjs`

Imports boxing clubs into the database.

**Usage:**
```bash
node backend/scripts/import-clubs.mjs
```

---

## Migration Scripts

These scripts help migrate from local PostgreSQL and local file storage to Supabase.

### Prerequisites

Before running migration scripts, ensure:

1. **Supabase Project Setup:**
   - Create a Supabase project at https://supabase.com
   - Create storage buckets:
     - `boxer-photos` (public, 5MB file size limit)
     - `boxer-videos` (public, 100MB file size limit)
   - Configure bucket policies for read/write access
   - See [Supabase Setup Guide](../../docs/SUPABASE_SETUP.md) for detailed instructions

2. **Environment Variables:**
   ```bash
   # Add to backend/.env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
   ```

3. **Dependencies Installed:**
   ```bash
   cd backend
   npm install
   ```

### Migration Workflow

Follow these steps in order:

#### Step 1: Backup (CRITICAL)

```bash
./backend/scripts/backup-pre-migration.sh
```

**What it does:**
- Creates PostgreSQL database dump (`.sql` and `.sql.gz`)
- Archives all uploaded files (`.tar.gz`)
- Generates manifest file with restore instructions
- Stores backups in `./backups/` directory

**Output Location:**
```
./backups/
├── database/
│   ├── boxerconnect_TIMESTAMP.sql
│   └── boxerconnect_TIMESTAMP.sql.gz
├── uploads/
│   └── uploads_TIMESTAMP.tar.gz
└── backup_manifest_TIMESTAMP.txt
```

**Important:**
- Test restore procedures before proceeding
- Keep backups until migration is verified successful
- Store backups in a secure, separate location

#### Step 2: Database Migration

Export your local database and import to Supabase:

```bash
# 1. Export local database
pg_dump -h localhost -U boxer -d boxerconnect -F p -f local_db.sql

# 2. Import to Supabase
psql "postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres" < local_db.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

#### Step 3: File Migration

```bash
ts-node backend/scripts/migrate-files-to-supabase.ts
```

**What it does:**
- Uploads all profile photos to Supabase Storage
- Uploads all video files and thumbnails
- Processes files in batches to avoid rate limits
- Skips files that already exist in Supabase
- Generates detailed migration report

**Progress Output:**
```
Found 50 profile photos to migrate
Processing batch 1...
  ✓ Migrated: uuid.webp (John Doe)
  ✓ Migrated: uuid.webp (Jane Smith)
  ...
```

**Expected Duration:**
- ~1-2 seconds per file (depends on file size and network speed)
- 100 files = ~2-3 minutes

#### Step 4: Verification

```bash
ts-node backend/scripts/verify-migration.ts
```

**What it does:**
- Compares table row counts (local vs Supabase)
- Verifies sample records match
- Checks that all files exist in Supabase Storage
- Generates comprehensive verification report

**Sample Output:**
```
=== Verifying Table Counts ===

✓ User                Local: 50      Supabase: 50      MATCH
✓ Boxer               Local: 45      Supabase: 45      MATCH
✓ Club                Local: 10      Supabase: 10      MATCH
✓ Video               Local: 25      Supabase: 25      MATCH

=== Migration Verification Report ===

Table Counts: ✓ PASS
Sample Records: ✓ PASS
Storage Files: ✓ PASS (45/45)
Video Files: ✓ PASS (25/25)

=== Overall Status ===

✓ MIGRATION SUCCESSFUL - All checks passed

You can safely switch to Supabase in production.
```

#### Step 5: Switch to Supabase

Once verification passes, update your environment:

```bash
# backend/.env
STORAGE_PROVIDER=supabase
```

Restart your backend server:

```bash
npm run dev
```

#### Step 6: Cleanup (AFTER VERIFICATION)

Once you've confirmed everything works in production:

```bash
# Optional: Remove local uploads (ONLY after verification!)
rm -rf backend/uploads/*

# Keep backups for at least 30 days
```

---

## Backup Scripts

### `backup-pre-migration.sh`

Creates comprehensive backups before migration.

**Usage:**
```bash
./backend/scripts/backup-pre-migration.sh
```

**Requirements:**
- `pg_dump` must be installed and in PATH
- `backend/.env` must exist with valid `DATABASE_URL`
- Write access to `./backups/` directory

**Restore Instructions:**

**Database:**
```bash
# Decompress and restore
gunzip -c backups/database/boxerconnect_TIMESTAMP.sql.gz | \
  psql -h HOST -p PORT -U USER -d DATABASE
```

**Uploads:**
```bash
# Extract to destination
tar -xzf backups/uploads/uploads_TIMESTAMP.tar.gz -C /destination/path/
```

---

## Troubleshooting

### Migration Issues

**Problem:** `Bucket 'boxer-photos' not found` or `Bucket 'boxer-videos' not found`

**Solution:**
1. Go to Supabase Dashboard > Storage
2. Create the missing bucket(s):
   - `boxer-photos` (5MB limit, images only)
   - `boxer-videos` (100MB limit, videos and thumbnails)
3. Set buckets to public
4. Re-run migration script

---

**Problem:** `File not found in local storage`

**Solution:**
1. Check `UPLOAD_PATH` in `.env` is correct
2. Verify files exist: `ls -la backend/uploads/profile-photos/`
3. Re-run file migration script (it will skip already-migrated files)

---

**Problem:** `Supabase connection failed`

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Check Supabase project is active (not paused)
3. Test connection: `curl https://your-project-id.supabase.co`

---

**Problem:** Table counts don't match

**Solution:**
1. Re-export local database
2. Re-import to Supabase
3. Run verification script again

---

### Backup Issues

**Problem:** `pg_dump: command not found`

**Solution:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Verify
pg_dump --version
```

---

**Problem:** `PGPASSWORD authentication failed`

**Solution:**
1. Check `DATABASE_URL` in `.env` is correct
2. Verify database credentials
3. Test connection: `psql $DATABASE_URL`

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review migration logs for specific errors
3. Consult Supabase documentation: https://supabase.com/docs
4. Contact development team

---

## Best Practices

1. **Always backup before migration** - No exceptions
2. **Test in staging first** - Never migrate production directly
3. **Verify thoroughly** - Run verification script multiple times
4. **Keep backups** - Store for at least 30 days post-migration
5. **Monitor logs** - Watch for errors after switching to Supabase
6. **Gradual rollout** - Consider blue-green deployment for production
