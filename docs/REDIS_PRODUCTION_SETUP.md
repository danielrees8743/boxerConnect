# Redis Production Setup Guide

**Last Updated:** 2026-02-02

**Status:** Redis is required for permission caching in production

---

## Table of Contents

1. [Current Redis Usage](#current-redis-usage)
2. [Why Redis is Still Required](#why-redis-is-still-required)
3. [Production Deployment Options](#production-deployment-options)
4. [Recommended Solution: Upstash Redis](#recommended-solution-upstash-redis)
5. [Alternative Options](#alternative-options)
6. [Self-Hosted Redis Setup](#self-hosted-redis-setup)
7. [Docker Deployment](#docker-deployment)
8. [Environment Configuration](#environment-configuration)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Removing Redis Completely (Optional)](#removing-redis-completely-optional)
11. [Cost Comparison](#cost-comparison)
12. [Troubleshooting](#troubleshooting)

---

## Current Redis Usage

### ✅ Removed from Authentication (Phase 4 Complete)

As of commit `0811f3a`, authentication tokens **no longer use Redis**:

- **Refresh tokens** → Stored in `refresh_tokens` database table
- **Password reset tokens** → Stored in `password_reset_tokens` database table
- **Auth operations** → Use Prisma/PostgreSQL exclusively

See [AUTH_TOKEN_MIGRATION.md](./AUTH_TOKEN_MIGRATION.md) for details.

### ⚠️ Still Used for Permission Caching

Redis is **actively required** for permission caching in production:

**File:** `backend/src/services/permission.service.ts`

**What's cached:**
- Role-based permission checks
- Resource ownership verification (boxer, club, etc.)
- Coach-boxer relationship permissions
- Club ownership and membership checks
- Permission lookups (5-minute TTL)

**Why it's critical:**
- Permissions are checked on **every authenticated API request**
- Database queries for permission checks can be expensive (10-50ms)
- Redis provides fast lookups (~1ms)
- Significantly improves API response times
- Reduces database load

**Cache operations:**
```typescript
// Example from permission.service.ts
const cached = await cache.get<boolean>(cacheKey);
if (cached !== null) {
  return cached; // ~1ms response
}

// Database query (~20-50ms)
const result = await prisma.coachBoxer.findFirst({...});

await cache.set(cacheKey, result, PERMISSION_CACHE_TTL);
```

---

## Why Redis is Still Required

### Performance Impact Without Redis

| Operation | With Redis | Without Redis | Impact |
|-----------|------------|---------------|--------|
| Permission check (cached) | ~1ms | ~20-50ms | **20-50x slower** |
| API request (authenticated) | ~50-100ms | ~100-200ms | **2x slower** |
| Database queries/minute | ~50-100 | ~500-1000 | **10x more load** |

### Traffic Scenarios

**Low traffic (100 requests/hour):**
- Without Redis: Acceptable, slight slowdown
- Impact: Minimal

**Medium traffic (1,000 requests/hour):**
- Without Redis: Noticeable API slowdown
- Impact: User experience degradation

**High traffic (10,000+ requests/hour):**
- Without Redis: Significant performance issues
- Impact: Database overload, API timeouts

**Recommendation:** Keep Redis for production unless traffic is very low.

---

## Production Deployment Options

### Decision Matrix

| Option | Difficulty | Cost/Month | Maintenance | Scalability | Best For |
|--------|-----------|------------|-------------|-------------|----------|
| **Upstash Redis** | ⭐ Easy | $0-15 | None | Automatic | Recommended for most |
| **Redis Cloud** | ⭐ Easy | $5-50 | None | Excellent | High-traffic apps |
| **AWS ElastiCache** | ⭐⭐ Medium | $15-100 | Low | Excellent | AWS-hosted apps |
| **Railway/Render** | ⭐ Easy | $5-20 | None | Good | Same-platform deploy |
| **Self-Hosted VPS** | ⭐⭐⭐ Hard | $5-10 | High | Manual | Budget/full control |
| **Docker Container** | ⭐⭐ Medium | $0 | Medium | Manual | Containerized apps |

---

## Recommended Solution: Upstash Redis

### Why Upstash?

✅ **Serverless** - Pay only for what you use, automatic scaling
✅ **Free tier** - 10,000 commands/day (enough for small-medium apps)
✅ **Global edge network** - Low latency worldwide
✅ **Zero maintenance** - Fully managed, no server management
✅ **Simple setup** - 5 minutes to production
✅ **Compatible** - Works with existing `ioredis` client
✅ **Pairs well with Supabase** - Both modern serverless platforms

### Setup Instructions (5 minutes)

#### Step 1: Create Upstash Account

1. Go to https://upstash.com
2. Sign up (free, no credit card required)
3. Confirm email

#### Step 2: Create Redis Database

1. Click **"Create Database"**
2. **Name:** `boxerconnect-production`
3. **Type:** Regional (or Global for multi-region)
4. **Region:** Choose closest to your Supabase region
   - If Supabase is in `us-east-1` → Choose `us-east-1`
   - Reduces latency between database and cache
5. Click **"Create"**

#### Step 3: Get Connection URL

1. Click on your database
2. Find **"REST API"** section
3. Copy the **Redis URL** (starts with `rediss://`)
   - Example: `rediss://default:AbCd...XyZ@us1-stable-mollusk-12345.upstash.io:6379`

#### Step 4: Configure Production Environment

Add to your production environment variables:

```bash
# Production .env or hosting platform environment variables
REDIS_URL=rediss://default:AbCd...XyZ@us1-stable-mollusk-12345.upstash.io:6379
```

**Platform-specific:**

**Vercel:**
```bash
vercel env add REDIS_URL
# Paste the Upstash URL
```

**Railway:**
```bash
# In Railway dashboard:
# Variables → Add Variable → REDIS_URL → Paste URL
```

**Render:**
```bash
# In Render dashboard:
# Environment → Add Environment Variable → REDIS_URL → Paste URL
```

**Heroku:**
```bash
heroku config:set REDIS_URL="rediss://..." -a your-app-name
```

#### Step 5: Deploy and Test

1. Deploy your application
2. Check health endpoint: `GET /health`
3. Verify Redis status shows `"up"`

```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "up" },
    "redis": { "status": "up" }  // Should be "up"
  }
}
```

#### Step 6: Monitor Usage

1. Return to Upstash dashboard
2. View **Metrics** tab
3. Monitor:
   - Commands/day (stay under 10K for free tier)
   - Latency (should be < 10ms)
   - Storage usage

### Cost Estimates

**Free Tier (10K commands/day):**
- Small app: 100-500 requests/day → ✅ Free
- Medium app: 1,000-5,000 requests/day → ✅ Free
- Large app: 10,000+ requests/day → Paid

**Paid Tier:**
- **$10/month:** ~500K commands/day (most production apps)
- **$20/month:** ~2M commands/day
- **$40/month:** ~10M commands/day

**Typical BoxerConnect usage:**
- Permission checks: 5-10 per authenticated request
- 1,000 API requests/day = ~5,000-10,000 Redis commands/day
- **Estimated cost: $0-10/month**

---

## Alternative Options

### Option 2: Redis Cloud (Redis Labs)

**When to use:** Need official Redis support, high availability, or advanced features

#### Setup

1. Go to https://redis.com/try-free/
2. Create account and database
3. Choose region closest to Supabase
4. Copy connection details

```bash
# Production .env
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1.cloud.redislabs.com:12345
```

**Pricing:**
- **Free tier:** 30MB storage, 30 connections
- **Paid:** Starting at $5/month

---

### Option 3: AWS ElastiCache

**When to use:** Already hosting on AWS, need VPC integration

#### Setup

1. AWS Console → ElastiCache → Redis
2. Create cluster:
   - **Node type:** `cache.t3.micro` (cheapest)
   - **Number of nodes:** 1 (or 2+ for HA)
   - **VPC:** Same as your application
3. Configure security group (allow port 6379 from app)
4. Copy endpoint

```bash
# Production .env
REDIS_URL=redis://your-elasticache-endpoint.cache.amazonaws.com:6379
```

**Pricing:**
- **t3.micro:** ~$15/month
- **Backup storage:** ~$0.085/GB/month

**Note:** No free tier, but reliable and AWS-integrated.

---

### Option 4: Railway / Render Redis

**When to use:** Deploying your app on same platform

#### Railway

1. Railway dashboard → New → Database → Redis
2. Copy connection URL from Variables tab

```bash
# Automatically added to your app environment
REDIS_URL=redis://default:password@redis.railway.internal:6379
```

**Pricing:** ~$5/month

#### Render

1. Render dashboard → New → Redis
2. Copy connection string

```bash
REDIS_URL=redis://red-xxxxx:6379
```

**Pricing:** ~$7/month (Basic plan)

---

## Self-Hosted Redis Setup

**When to use:** Budget-conscious, full control needed, comfortable with server management

### Requirements
- Ubuntu 20.04+ or Debian 11+ VPS
- Minimum 512MB RAM (1GB+ recommended)
- Static IP address

### Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Redis
sudo apt install redis-server -y

# Check Redis version
redis-server --version
# Should show: Redis server v=6.0.16 or higher
```

### Configuration

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

**Required changes:**

```conf
# Security: Set strong password
requirepass YOUR_STRONG_PASSWORD_HERE

# Network: Allow remote connections (if needed)
bind 0.0.0.0
# OR bind to specific IP:
# bind 127.0.0.1 YOUR_SERVER_IP

# Performance: Set max memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence: Save to disk periodically
save 900 1      # Save after 900 sec if 1 key changed
save 300 10     # Save after 300 sec if 10 keys changed
save 60 10000   # Save after 60 sec if 10000 keys changed

# Log file
logfile /var/log/redis/redis-server.log
```

### Security (IMPORTANT)

```bash
# Set proper permissions
sudo chown redis:redis /etc/redis/redis.conf
sudo chmod 640 /etc/redis/redis.conf

# Configure firewall (if remote access needed)
sudo ufw allow from YOUR_APP_SERVER_IP to any port 6379
sudo ufw enable

# Restart Redis
sudo systemctl restart redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server
```

### Test Connection

```bash
# Local test
redis-cli -a YOUR_PASSWORD ping
# Should return: PONG

# Remote test (from your app server)
redis-cli -h YOUR_SERVER_IP -a YOUR_PASSWORD ping
```

### Production .env

```bash
REDIS_URL=redis://:YOUR_PASSWORD@YOUR_SERVER_IP:6379
```

### Monitoring

```bash
# Check Redis stats
redis-cli -a YOUR_PASSWORD info stats

# Monitor commands in real-time
redis-cli -a YOUR_PASSWORD monitor

# Check memory usage
redis-cli -a YOUR_PASSWORD info memory
```

### Backup Strategy

```bash
# Manual backup
sudo cp /var/lib/redis/dump.rdb /backup/redis-backup-$(date +%Y%m%d).rdb

# Automated daily backup (cron)
echo "0 2 * * * root cp /var/lib/redis/dump.rdb /backup/redis-backup-\$(date +\%Y\%m\%d).rdb" | sudo tee /etc/cron.d/redis-backup
```

---

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"  # Remove in production (internal only)
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
    driver: local
```

### .env file

```bash
REDIS_PASSWORD=your-strong-redis-password
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

### Deploy

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f redis

# Check Redis health
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

---

## Environment Configuration

### Development

```bash
# .env (local development)
REDIS_URL=redis://localhost:6379
```

**Run local Redis:**
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Staging

```bash
# Use separate Redis instance from production
REDIS_URL=rediss://...staging-redis-url...
```

### Production

```bash
# Use managed service (Upstash recommended)
REDIS_URL=rediss://default:AbCd...XyZ@us1-stable-mollusk-12345.upstash.io:6379

# Additional security
REDIS_TLS=true
REDIS_TLS_REJECT_UNAUTHORIZED=true
```

---

## Monitoring and Maintenance

### Health Checks

Your app already includes Redis health checks:

**Endpoint:** `GET /health`

```json
{
  "status": "healthy",
  "timestamp": "2026-02-02T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "redis": {
      "status": "up",
      "responseTime": 1
    }
  }
}
```

**Redis status codes:**
- `"up"` - Redis is healthy
- `"down"` - Redis is unreachable (app runs in degraded mode)

### Monitoring Metrics

**Key metrics to watch:**

1. **Hit rate** - % of cache hits vs misses
   - Good: > 80%
   - Poor: < 50%

2. **Latency** - Response time
   - Good: < 5ms
   - Acceptable: < 20ms
   - Poor: > 50ms

3. **Memory usage**
   - Monitor to stay under limits
   - Cache eviction should be rare

4. **Connection count**
   - Each app instance = 1 connection
   - Monitor for connection leaks

### Upstash Dashboard

1. Go to https://console.upstash.com
2. Select your database
3. View **Metrics** tab:
   - Commands per second
   - Latency graph
   - Storage usage
   - Data transfer

### Manual Redis Commands

```bash
# Check Redis info
redis-cli -u $REDIS_URL info

# Monitor cache keys
redis-cli -u $REDIS_URL keys "perm:*"

# Check cache TTL
redis-cli -u $REDIS_URL ttl "perm:resource:boxer:user123:boxer456"

# Manually clear cache (if needed)
redis-cli -u $REDIS_URL flushdb
```

### Alerts to Set Up

**Upstash/Redis Cloud:**
- Alert when command count approaches limit
- Alert on high latency (> 50ms)
- Alert on connection failures

**Self-hosted:**
- Alert when memory usage > 80%
- Alert when Redis service stops
- Alert on disk space < 20%

---

## Removing Redis Completely (Optional)

If you want to eliminate Redis dependency entirely, here are the options:

### Option A: Remove Permission Caching (Simplest)

**Impact:**
- ❌ Slower permission checks (~20-50ms per request)
- ❌ Increased database load (~10x more queries)
- ✅ No Redis infrastructure
- ✅ Simpler deployment

**Implementation:**
1. Remove all `cache.get()` and `cache.set()` calls from `permission.service.ts`
2. Keep only database queries
3. Remove Redis imports
4. Update health checks

**Estimated effort:** 1-2 hours

---

### Option B: Database-Based Caching

**Impact:**
- ✅ No Redis dependency
- ⚠️ Slower than Redis (~10-20ms vs ~1ms)
- ⚠️ More complex queries
- ✅ Persistent cache across restarts

**Implementation:**
1. Create `PermissionCache` table in Prisma
2. Store permission results with TTL
3. Query cache table before checking permissions
4. Clean up expired cache entries periodically

**Estimated effort:** 4-6 hours

---

### Option C: In-Memory Caching (Node.js)

**Impact:**
- ✅ No external Redis dependency
- ✅ Fast (~1ms like Redis)
- ❌ Cache lost on server restart
- ❌ Doesn't work with multiple server instances
- ❌ Cache not shared between instances

**Implementation:**
1. Use `node-cache` or `lru-cache` npm package
2. Replace Redis calls with in-memory cache
3. Cache cleared on deployment/restart

**Estimated effort:** 2-3 hours

---

### Recommendation

**Keep Redis** unless you have a strong reason to remove it:
- ✅ Significant performance benefit
- ✅ Minimal cost ($0-10/month with Upstash)
- ✅ Production-ready solution
- ✅ Easy to set up (5 minutes)

**Consider removal only if:**
- Very low traffic app (< 100 requests/day)
- Willing to accept slower API responses
- Want absolute minimum infrastructure

---

## Cost Comparison

### Monthly Cost Estimates

| Option | Setup Cost | Monthly Cost | Total Year 1 |
|--------|------------|--------------|--------------|
| **Upstash Redis (Free)** | $0 | $0 | $0 |
| **Upstash Redis (Paid)** | $0 | $10 | $120 |
| **Redis Cloud** | $0 | $5-50 | $60-600 |
| **AWS ElastiCache** | $0 | $15-100 | $180-1200 |
| **Railway/Render** | $0 | $5-20 | $60-240 |
| **Self-Hosted VPS** | $0 | $5-10 | $60-120 |
| **Docker (self-managed)** | $0 | $0* | $0* |
| **No Redis** | $0 | $0 | $0 |

*Docker cost depends on hosting platform

### Hidden Costs

**Managed Services (Upstash, Redis Cloud):**
- ✅ Zero maintenance time
- ✅ Automatic scaling
- ✅ Built-in monitoring
- ✅ High availability

**Self-Hosted:**
- ⏰ ~2-4 hours/month maintenance
- ⏰ Setup and configuration time
- ⚠️ Backup management
- ⚠️ Security updates
- ⚠️ Monitoring setup

**No Redis:**
- ⏰ Potential database optimization time
- ⚠️ Slower user experience
- ⚠️ Higher database costs (more queries)

---

## Troubleshooting

### Common Issues

#### 1. "Redis connection failed" on startup

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed
```

**Solutions:**
- ✅ Check `REDIS_URL` environment variable is set
- ✅ Verify Redis is running: `redis-cli ping`
- ✅ Check firewall allows port 6379
- ✅ Verify password in connection URL

**Fix:**
```bash
# Check Redis status
redis-cli ping  # Should return PONG

# Check environment variable
echo $REDIS_URL

# Test connection with password
redis-cli -u $REDIS_URL ping
```

---

#### 2. "ECONNREFUSED" in production

**Symptoms:**
```
Error: connect ECONNREFUSED
```

**Solutions:**
- ✅ Redis URL is incorrect
- ✅ Redis service is down
- ✅ Network/firewall blocking connection

**Fix:**
```bash
# Test connection from your server
curl -v telnet://YOUR_REDIS_HOST:6379

# Check Redis service status (self-hosted)
sudo systemctl status redis-server

# Check Upstash status
# Visit https://status.upstash.com
```

---

#### 3. App runs in "degraded mode"

**Symptoms:**
```json
{
  "redis": { "status": "down" }
}
```

**Impact:**
- App still works (non-critical failure)
- Permission checks slower (no caching)
- Higher database load

**Solutions:**
- ✅ Check Redis service availability
- ✅ Verify connection URL
- ✅ Monitor Redis health dashboard

---

#### 4. High Redis latency (> 50ms)

**Symptoms:**
- Slow API responses
- High Redis response times

**Solutions:**
- ✅ Choose Redis region closer to app server
- ✅ Upgrade Redis instance (more resources)
- ✅ Check network latency
- ✅ Reduce payload size in cache

**Fix:**
```bash
# Measure latency
redis-cli -u $REDIS_URL --latency

# Check from application server
time redis-cli -u $REDIS_URL ping
```

---

#### 5. "OOM command not allowed" error

**Symptoms:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Solution:**
- ✅ Redis is out of memory
- ✅ Increase memory limit
- ✅ Configure eviction policy

**Fix (self-hosted):**
```conf
# /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

**Fix (managed):**
- Upgrade to larger instance
- Check cache TTL is working

---

#### 6. Authentication failed

**Symptoms:**
```
Error: ERR invalid password
```

**Solution:**
- ✅ Password in `REDIS_URL` is incorrect
- ✅ Password contains special characters (needs URL encoding)

**Fix:**
```bash
# URL encode special characters in password
# Example: p@ssw0rd! becomes p%40ssw0rd%21

# Test with correct password
redis-cli -u "redis://:CORRECT_PASSWORD@host:6379" ping
```

---

## Next Steps

### Immediate Actions

1. **Choose deployment option** (Recommended: Upstash)
2. **Set up production Redis** (5-10 minutes)
3. **Configure environment variables**
4. **Deploy and test**
5. **Monitor for 24-48 hours**

### Optional Actions

6. **Set up monitoring alerts**
7. **Configure backup strategy** (if self-hosted)
8. **Document Redis access** for team
9. **Review cost after first month**
10. **Consider removing Redis** (if traffic is very low)

---

## Support and Resources

### Official Documentation

- **Upstash Redis:** https://docs.upstash.com/redis
- **Redis Cloud:** https://docs.redis.com/latest/rc/
- **AWS ElastiCache:** https://docs.aws.amazon.com/elasticache/
- **Redis Official:** https://redis.io/documentation

### BoxerConnect Documentation

- [Auth Token Migration](./AUTH_TOKEN_MIGRATION.md) - How we removed Redis from auth
- [Supabase Setup](./SUPABASE_SETUP.md) - Database configuration
- [Architecture: Storage](./architecture/storage.md) - Storage layer overview

### Community Support

- **Upstash Discord:** https://discord.gg/upstash
- **Redis Discord:** https://discord.gg/redis
- **Stack Overflow:** Tag questions with `redis`, `ioredis`, `nodejs`

---

## Summary

### Current State
- ✅ Authentication tokens migrated to database (no Redis)
- ⚠️ Permission caching requires Redis in production
- ✅ App runs in degraded mode if Redis unavailable

### Recommended Setup
- **Platform:** Upstash Redis (serverless)
- **Region:** Same as Supabase database
- **Cost:** $0-10/month
- **Setup time:** 5 minutes

### Alternative: Remove Redis
- **Impact:** Slower API, higher DB load
- **Benefit:** Simpler infrastructure
- **Recommended:** Only for very low traffic

---

**Questions or need help?** Refer to the troubleshooting section or continue the conversation.

**Last reviewed:** 2026-02-02
