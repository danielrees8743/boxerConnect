# Supabase Setup Guide

This guide walks you through setting up Supabase for BoxerConnect, including database and storage configuration.

## Table of Contents

- [Overview](#overview)
- [Create Supabase Project](#create-supabase-project)
- [Configure Storage Buckets](#configure-storage-buckets)
- [Get API Credentials](#get-api-credentials)
- [Configure Environment Variables](#configure-environment-variables)
- [Database Setup](#database-setup)
- [Verify Configuration](#verify-configuration)
- [Viewing Your Data](#viewing-your-data)
- [Troubleshooting](#troubleshooting)

---

## Overview

BoxerConnect uses Supabase for:

- **Database**: PostgreSQL database for all application data
- **Storage**: File storage for profile photos and videos
- **Authentication**: (Future) Supabase Auth integration

**What you'll need:**

- A Supabase account (free tier is sufficient for development)
- 10-15 minutes to complete setup

---

## Create Supabase Project

1. **Sign up or log in** to [Supabase](https://supabase.com)

2. **Create a new project**:
   - Click "New Project"
   - **Organization**: Select or create an organization
   - **Project Name**: `boxerconnect` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Free (for development)

3. **Wait for provisioning**: Project setup takes 1-2 minutes

4. **Save your database password**: You'll need this for the `DATABASE_URL`

---

## Configure Storage Buckets

BoxerConnect requires two storage buckets for file uploads.

### Create Boxer Photos Bucket

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `boxer-photos`
   - **Public bucket**: ✅ Enabled (allows public read access)
   - **File size limit**: `5` MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
4. Click **Create bucket**

### Create Boxer Videos Bucket

1. Click **New bucket** again
2. Configure the bucket:
   - **Name**: `boxer-videos`
   - **Public bucket**: ✅ Enabled (allows public read access)
   - **File size limit**: `100` MB
   - **Allowed MIME types**: `video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp`
     - Note: Images are allowed for video thumbnails
3. Click **Create bucket**

### Configure Storage Policies

Both buckets need the following policies for proper access control:

#### Public Read Access (Already enabled via "Public bucket")

This allows anyone to view uploaded files via public URLs.

#### Authenticated Upload Access

1. Go to **Storage** > Click on `boxer-photos`
2. Go to **Policies** tab
3. Click **New Policy**
4. Use the "Enable insert for authenticated users only" template
5. Review and click **Save**
6. Repeat for `boxer-videos` bucket

#### User-Owned File Deletion

1. In the bucket's **Policies** tab, click **New Policy**
2. Choose "Enable delete for users based on user_id" template
3. Review and click **Save**
4. Repeat for `boxer-videos` bucket

---

## Get API Credentials

You need three credentials from your Supabase project:

### 1. Project URL

1. Go to **Settings** > **API** in the left sidebar
2. Find **Project URL**
3. Copy the URL (format: `https://xxxxxxxxxxxxx.supabase.co`)
4. This is your `SUPABASE_URL`

### 2. Anonymous (Public) Key

1. In **Settings** > **API**, find **Project API keys**
2. Copy the `anon` `public` key
3. This is your `SUPABASE_ANON_KEY`
4. **Usage**: Used for client-side operations and public file access

### 3. Service Role Key

1. In **Settings** > **API** > **Project API keys**
2. Click "Reveal" next to `service_role` `secret`
3. Copy the revealed key
4. This is your `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Security Warning**: The service role key bypasses Row Level Security (RLS) policies. **Never expose this key in client-side code or commit it to version control.**

### 4. Database Connection String

1. Go to **Settings** > **Database**
2. Find **Connection string** section
3. Select **URI** tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password from project creation
6. This is your `DATABASE_URL`

Example format:
```
postgresql://postgres:your_password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

---

## Configure Environment Variables

Update your `backend/.env` file with the Supabase credentials:

```env
# Supabase Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres

# Supabase Configuration
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Replace**:
- `YOUR_PASSWORD` with your database password
- `PROJECT_REF` with your project reference ID
- `your-anon-key-here` with your actual anon key
- `your-service-role-key-here` with your actual service role key

---

## Database Setup

Once environment variables are configured, set up your database schema:

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Push schema to Supabase
npm run prisma:db:push
```

**What this does**:
- Creates all database tables (User, Boxer, Club, MatchRequest, etc.)
- Sets up relationships and constraints
- Configures indexes

**Expected output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres"

🚀  Your database is now in sync with your Prisma schema.

✔ Generated Prisma Client
```

### Optional: Seed Test Data

To populate your database with test accounts and clubs:

```bash
# Import clubs
node scripts/import-clubs.mjs

# Seed test boxers
node scripts/seed-boxers.mjs
```

---

## Verify Configuration

Test your Supabase connection:

```bash
# Start the backend server
npm run dev
```

**Look for these log messages**:

```
✓ Database connected
✓ Supabase initialized
✓ Storage service ready (provider: supabase)
Server running on http://localhost:3001
```

### Test File Upload

1. Start both backend and frontend
2. Log in with a test account
3. Navigate to profile settings
4. Upload a profile photo
5. Check Supabase Dashboard > Storage > `boxer-photos` to see the uploaded file

---

## Viewing Your Data

### Database Tables

1. Go to **Table Editor** in the Supabase Dashboard
2. Browse all tables:
   - `User` - User accounts
   - `Boxer` - Boxer profiles
   - `Club` - Boxing clubs
   - `MatchRequest` - Sparring match requests
   - `FightHistory` - Fight records
   - `Video` - Uploaded videos

### Storage Files

1. Go to **Storage** in the Supabase Dashboard
2. Click on a bucket (`boxer-photos` or `boxer-videos`)
3. Browse uploaded files
4. Click any file to:
   - Preview
   - Copy public URL
   - Download
   - Delete

### SQL Editor

Run custom queries:

1. Go to **SQL Editor** in the Supabase Dashboard
2. Write and run SQL queries
3. Example: Count all boxers
   ```sql
   SELECT COUNT(*) FROM "Boxer";
   ```

### API Logs

Monitor API requests:

1. Go to **Logs** in the Supabase Dashboard
2. Select **API** logs
3. View real-time requests and errors

---

## Troubleshooting

### Connection Errors

**Problem**: `Error: P1001: Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check that your database password is correct (no special characters that need URL encoding)
3. Ensure your Supabase project is not paused (free tier pauses after 7 days of inactivity)
4. Check your internet connection

**Problem**: `Error: FATAL: password authentication failed`

**Solutions**:
1. Reset your database password in Supabase Dashboard > Settings > Database
2. Update `DATABASE_URL` with the new password
3. Restart your backend server

---

### Storage Bucket Errors

**Problem**: `Bucket not found: boxer-photos`

**Solutions**:
1. Verify bucket names are exactly `boxer-photos` and `boxer-videos` (case-sensitive)
2. Ensure buckets are created in the correct Supabase project
3. Check you're using the correct `SUPABASE_URL` for the project

**Problem**: `Error: new row violates row-level security policy`

**Solutions**:
1. Verify storage policies are configured correctly
2. Ensure "Public bucket" is enabled for read access
3. Add authenticated upload policy (see [Configure Storage Policies](#configure-storage-policies))

**Problem**: `File upload fails with 413 Payload Too Large`

**Solutions**:
1. Check file size limits:
   - Photos: 5MB max
   - Videos: 100MB max
2. Verify bucket configuration in Supabase Dashboard
3. Compress large files before uploading

---

### Environment Variable Issues

**Problem**: Backend fails to start with "Environment validation failed"

**Solutions**:
1. Ensure all required variables are set in `backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `STORAGE_PROVIDER=supabase`
2. Check for typos in variable names (case-sensitive)
3. Ensure no trailing spaces in values
4. Restart backend after changing `.env`

---

### Prisma Migration Issues

**Problem**: `Error: P3009: migrate found failed migrations`

**Solutions**:
1. Use `prisma:db:push` instead of `prisma:migrate` for development
2. Reset the database if needed:
   ```bash
   npm run prisma:db:push -- --force-reset
   ```
3. Warning: `--force-reset` deletes all data

**Problem**: `Schema sync issues after changes`

**Solutions**:
1. Regenerate Prisma client:
   ```bash
   npm run prisma:generate
   ```
2. Push schema changes:
   ```bash
   npm run prisma:db:push
   ```
3. Restart backend server

---

### Performance Issues

**Problem**: Slow database queries

**Solutions**:
1. Check your Supabase project region (should be close to your location)
2. Review query performance in Supabase Dashboard > Database > Query Performance
3. Consider upgrading from free tier for better performance

**Problem**: Storage upload/download is slow

**Solutions**:
1. Verify images are being resized (should be max 400x400px)
2. Check video compression settings
3. Consider using Supabase CDN for faster delivery (automatic for public buckets)

---

## Security Best Practices

### Credential Management

- ✅ **DO**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- ✅ **DO**: Store credentials in `.env` files (not tracked by git)
- ✅ **DO**: Use environment variables in production
- ❌ **DON'T**: Commit credentials to version control
- ❌ **DON'T**: Share service role key in client-side code
- ❌ **DON'T**: Use development credentials in production

### Row Level Security (RLS)

For production deployments:

1. Enable RLS on all tables
2. Create policies for each table restricting access
3. Test policies thoroughly
4. Review Supabase [RLS documentation](https://supabase.com/docs/guides/auth/row-level-security)

### Storage Security

1. Keep storage buckets private for sensitive data
2. Use signed URLs for time-limited access
3. Validate file types and sizes server-side
4. Enable virus scanning (Supabase Pro feature)

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
- [BoxerConnect Migration Guide](../backend/scripts/README.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs for specific error messages
3. Consult [Supabase Community](https://github.com/supabase/supabase/discussions)
4. Check [BoxerConnect documentation](../README.md)
