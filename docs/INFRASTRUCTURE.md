# BoxerConnect Infrastructure Overview

**Last Updated:** February 2, 2026

This document provides an overview of BoxerConnect's current infrastructure setup and recent changes.

---

## Current Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                         │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Frontend   │────────▶│   Backend    │                │
│  │  (React/Vite)│         │  (Express/TS)│                │
│  │ localhost:5173│        │ localhost:3001│                │
│  └──────────────┘         └───────┬──────┘                │
│                                    │                         │
└────────────────────────────────────┼─────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐    ┌────▼────┐    ┌─────▼─────┐
              │ Supabase  │    │  Redis  │    │ Supabase  │
              │ PostgreSQL│    │   Pi    │    │  Storage  │
              │   (Cloud) │    │192.168..│    │  (Cloud)  │
              └───────────┘    └─────────┘    └───────────┘
```

### Production Environment (Raspberry Pi)

```
                        Internet
                           │
                    ┌──────▼──────┐
                    │   Traefik   │ (Reverse Proxy + SSL)
                    │  Port 80/443│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────▼─────┐             ┌────▼────┐
        │ Frontend  │             │ Backend │
        │  (Nginx)  │             │  (API)  │
        │ Port 8080 │             │Port 3001│
        └───────────┘             └────┬────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                    ┌─────▼─────┐             ┌────▼────┐
                    │PostgreSQL │             │  Redis  │
                    │Port 5432  │             │Port 6379│
                    └───────────┘             └─────────┘
```

---

## Infrastructure Components

### Database - Supabase PostgreSQL

**Type:** Managed Cloud Database
**Provider:** Supabase
**Location:** Cloud (Supabase infrastructure)

**Features:**
- Managed PostgreSQL with automatic backups
- Row Level Security (RLS) for access control
- Realtime subscriptions (if needed in future)
- Dashboard for data management

**Connection:**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Used For:**
- User accounts and authentication
- Boxer profiles and match requests
- Auth tokens (refresh tokens stored in database)
- Fight history and club data
- All application data

### Cache/Sessions - Redis

**Type:** In-Memory Data Store
**Location:** Raspberry Pi (192.168.0.216:6379)
**Container:** Docker (redis:7-alpine)

**Features:**
- Append-only file (AOF) persistence
- Automatic health checks
- Data survives restarts

**Connection:**
```env
REDIS_URL=redis://192.168.0.216:6379
```

**Used For:**
- Rate limiting counters
- Session caching
- Temporary data storage
- Performance optimization

**Important Notes:**
- ✅ Auth tokens are NOT stored in Redis (they're in the database)
- ✅ Redis is used for caching and rate limiting only
- ⚠️ Ensure you're on the same network as the Pi for development

### Storage - Supabase Storage

**Type:** Object Storage (S3-compatible)
**Provider:** Supabase
**Location:** Cloud (Supabase infrastructure)

**Buckets:**
- `boxer-photos` - Profile photos (5MB limit, public)
- `boxer-videos` - Training videos (100MB limit, public)

**Features:**
- Automatic image optimization with Sharp
- Public URL generation
- CDN delivery
- Row Level Security policies

**Used For:**
- User profile photos
- Training videos
- Club logos
- Media assets

---

## Recent Changes (February 2026)

### 1. Redis Centralization

**What Changed:**
- Redis moved from local Docker containers to centralized Raspberry Pi
- All developers now connect to shared Redis instance

**Why:**
- Eliminates need for local Redis containers
- Simplifies development setup
- Prepares for production deployment
- Consistent caching across all developers

**Migration Steps Completed:**
- ✅ Set up Redis on Raspberry Pi with Docker
- ✅ Updated backend `.env` to point to Pi Redis
- ✅ Removed local Redis containers
- ✅ Updated documentation

### 2. Auth Token Migration to Database

**What Changed:**
- Refresh tokens moved from Redis to PostgreSQL/Supabase
- Auth tokens now persist across Redis restarts

**Why:**
- More reliable token storage
- Tokens survive Redis restarts
- Better security and audit trail
- Easier token revocation

**Documentation:**
See [AUTH_TOKEN_MIGRATION.md](AUTH_TOKEN_MIGRATION.md) for complete details.

### 3. Production Docker Infrastructure

**What Changed:**
- Complete Docker Compose setup for production deployment
- Multi-stage Dockerfiles for backend and frontend
- Traefik reverse proxy with automatic SSL/TLS
- Security hardening and resource limits

**Features:**
- Automatic HTTPS with Let's Encrypt
- Network isolation (database not exposed)
- Non-root containers
- Health checks and graceful shutdown
- Automated backup system

**Documentation:**
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete deployment instructions.

---

## Environment Configuration

### Development (.env)

```env
# Server
NODE_ENV=development
PORT=3001
HOST=localhost

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Redis (Raspberry Pi)
REDIS_URL=redis://192.168.0.216:6379

# Supabase Storage
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=dev-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Production (.env.production)

```env
# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database (Supabase or Self-hosted PostgreSQL)
DATABASE_URL=postgresql://...

# Redis (On same machine in production)
REDIS_URL=redis://redis:6379

# Supabase Storage
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# JWT (Strong secrets!)
JWT_SECRET=generate-with-openssl-rand-base64-64
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=different-secret-from-jwt-secret
JWT_REFRESH_EXPIRES_IN=7d

# Domain
DOMAIN=your-domain.com
```

---

## Network Requirements

### Development

**Required Network Access:**
- Supabase API (outbound HTTPS)
- Raspberry Pi Redis (local network: 192.168.0.216:6379)
- Supabase Storage (outbound HTTPS)

**Firewall Rules:**
- No inbound ports needed (all outbound)
- Must be on same local network as Raspberry Pi

### Production

**Required Ports:**
- **80** (HTTP) - Open for Let's Encrypt challenges and redirects
- **443** (HTTPS) - Open for secure web traffic
- **22** (SSH) - Open for server management (restrict to known IPs)

**Closed Ports:**
- 5432 (PostgreSQL) - Not exposed, internal only
- 6379 (Redis) - Not exposed, internal only
- 3001 (Backend API) - Behind reverse proxy

---

## Infrastructure Management

### Raspberry Pi Redis

**Access:**
```bash
# SSH to Pi
ssh dan-pi@192.168.0.216

# Check Redis status
cd ~/boxerconnect
docker compose ps

# View logs
docker compose logs redis -f

# Restart Redis
docker compose restart redis
```

**Redis CLI:**
```bash
# From any machine on network
redis-cli -h 192.168.0.216 -p 6379 ping
redis-cli -h 192.168.0.216 -p 6379 info
redis-cli -h 192.168.0.216 -p 6379 monitor
```

### Supabase Management

**Dashboard:** https://supabase.com/dashboard

**Common Tasks:**
- View data: Dashboard → Table Editor
- Run SQL: Dashboard → SQL Editor
- Manage storage: Dashboard → Storage
- View logs: Dashboard → Logs
- API keys: Dashboard → Settings → API

### Production Deployment

**Deploy to Raspberry Pi:**
```bash
# On Pi
cd ~/boxerconnect
./scripts/deployment/deploy.sh
```

**Check Status:**
```bash
# On Pi
cd ~/boxerconnect
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

**Create Backup:**
```bash
# On Pi
cd ~/boxerconnect
./scripts/deployment/backup.sh
```

---

## Troubleshooting

### Redis Connection Issues

**Problem:** Can't connect to Redis on Raspberry Pi

**Solutions:**
1. Check if Pi is online: `ping 192.168.0.216`
2. Test Redis: `redis-cli -h 192.168.0.216 -p 6379 ping`
3. Check Redis container: SSH to Pi and run `docker compose ps`
4. Temporary fix: Run local Redis:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   # Update .env: REDIS_URL=redis://localhost:6379
   ```

### Database Connection Issues

**Problem:** Can't connect to Supabase database

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check Supabase Dashboard → Settings → Database for connection string
3. Ensure your IP isn't blocked (check connection pooling settings)
4. Try connection pooler instead of direct connection

### Storage Upload Failures

**Problem:** File uploads failing to Supabase Storage

**Solutions:**
1. Verify storage buckets exist in Supabase Dashboard
2. Check bucket policies allow public uploads
3. Verify SUPABASE_SERVICE_ROLE_KEY is correct
4. Check file size limits (5MB for photos, 100MB for videos)

---

## Security Considerations

### Secrets Management

**Never commit to git:**
- `.env` files with real credentials
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Database passwords

**Use strong secrets in production:**
```bash
# Generate secure secrets
openssl rand -base64 64  # For JWT secrets
openssl rand -base64 32  # For passwords
```

### Network Security

**Development:**
- Redis on private network only (no internet exposure)
- Supabase uses built-in security (RLS policies)

**Production:**
- All services behind reverse proxy
- Database and Redis not exposed to internet
- HTTPS only (HTTP redirects to HTTPS)
- Strong firewall rules (UFW configured)

### Access Control

**Database:**
- Row Level Security (RLS) policies enforced
- Separate anon and service role keys
- Connection via SSL/TLS

**Storage:**
- Public read access (for profile photos/videos)
- Authenticated write access
- File size limits enforced

---

## Future Improvements

### Planned Enhancements

1. **Monitoring:**
   - Prometheus + Grafana for metrics
   - Centralized logging (Loki or ELK)
   - Alerting for service failures

2. **Backup Strategy:**
   - Off-site backups (S3 or similar)
   - Automated backup testing
   - 3-2-1 backup strategy implementation

3. **Scaling:**
   - Redis Cluster for high availability
   - Read replicas for database
   - CDN for static assets

4. **CI/CD:**
   - Automated testing in pipeline
   - Automated deployments to staging
   - Blue-green deployments

---

## Support Resources

### Documentation
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- [Development Guide](DEVELOPMENT.md) - Local development setup
- [API Documentation](API.md) - API endpoints and usage
- [Database Schema](DATABASE.md) - Database structure
- [Supabase Setup](SUPABASE_SETUP.md) - Supabase configuration

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Documentation](https://docs.docker.com)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

---

**For questions or issues, refer to the troubleshooting sections in this document or the [Development Guide](DEVELOPMENT.md).**
