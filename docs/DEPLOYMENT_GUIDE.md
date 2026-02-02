# BoxerConnect - Production Deployment Guide

Complete guide for deploying BoxerConnect to a Raspberry Pi using Docker and Docker Compose.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Raspberry Pi Setup](#raspberry-pi-setup)
- [Configuration](#configuration)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Maintenance](#maintenance)
- [Security Features](#security-features)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Hardware Requirements

- **Raspberry Pi 4** (4GB+ RAM recommended)
- **32GB+ microSD card** (Class 10 or higher)
- **Stable internet connection**
- **Domain name** pointed to your Pi's public IP

### Software Requirements

- **Raspberry Pi OS** (64-bit recommended)
- **Docker** and **Docker Compose** (installed via setup script)
- **Git** for repository management

### Network Requirements

- **Port 80** (HTTP) - Open for Let's Encrypt challenges and HTTP → HTTPS redirect
- **Port 443** (HTTPS) - Open for secure web traffic
- **Static IP or Dynamic DNS** configured

---

## Architecture Overview

### Services

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │   Traefik    │ (Reverse Proxy + SSL)
              │   Port 80    │
              │   Port 443   │
              └──────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │ Frontend │          │ Backend  │
    │  Nginx   │          │   API    │
    │ Port 8080│          │ Port 3001│
    └──────────┘          └────┬─────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                ┌────▼──────┐      ┌────▼────┐
                │ PostgreSQL│      │  Redis  │
                │ Port 5432 │      │Port 6379│
                └───────────┘      └─────────┘
```

### Networks

- **Frontend Network**: Traefik, Frontend, Backend (public-facing)
- **Backend Network**: Backend, PostgreSQL, Redis (internal only)

### Security Layers

1. **TLS/SSL Encryption** via Traefik + Let's Encrypt
2. **Network Isolation** - Database not exposed to frontend
3. **Non-root Containers** - All services run as unprivileged users
4. **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
5. **Rate Limiting** - Prevents abuse and DoS
6. **Firewall** - UFW configured on host

---

## Raspberry Pi Setup

### Step 1: Flash Raspberry Pi OS

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Flash **Raspberry Pi OS (64-bit)** to microSD card
3. Enable SSH before first boot (create empty `ssh` file on boot partition)
4. Configure WiFi (optional): Create `wpa_supplicant.conf` on boot partition

### Step 2: Initial System Configuration

SSH into your Raspberry Pi:

```bash
ssh pi@<raspberry-pi-ip>
# Default password: raspberry (change this immediately!)
```

Run the automated setup script:

```bash
# Clone the repository
git clone https://github.com/your-username/BoxerConnect.git
cd BoxerConnect

# Run initial setup
./scripts/deployment/setup-pi.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Configure UFW firewall
- Set up fail2ban for SSH protection
- Enable automatic security updates
- Generate secure secrets
- Optimize system for Docker

**IMPORTANT:** Save the generated secrets displayed at the end!

### Step 3: Reboot (if required)

If cgroup memory was enabled, reboot:

```bash
sudo reboot
```

### Step 4: Configure DNS

Point your domain to your Raspberry Pi's public IP:

```
A Record: @ → <your-pi-public-ip>
A Record: www → <your-pi-public-ip>
A Record: traefik → <your-pi-public-ip>
```

---

## Configuration

### Step 1: Create Production Environment File

Copy the example environment file:

```bash
cp .env.production.example .env.production
```

### Step 2: Configure Required Variables

Edit `.env.production` and set all required values:

```bash
nano .env.production
```

#### Domain Configuration

```env
DOMAIN=your-domain.com
LETSENCRYPT_EMAIL=admin@your-domain.com
```

#### Database Credentials

```env
DB_NAME=boxerconnect
DB_USER=boxeruser
DB_PASSWORD=<use-generated-secret-from-setup>
```

#### Redis Configuration

```env
REDIS_PASSWORD=<use-generated-secret-from-setup>
```

#### JWT Secrets

```env
JWT_SECRET=<use-generated-secret-from-setup>
JWT_REFRESH_SECRET=<use-generated-secret-from-setup>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Traefik Authentication

Generate basic auth credentials:

```bash
# Install htpasswd if not available
sudo apt install apache2-utils

# Generate credentials
htpasswd -nb admin your-secure-password
# Copy the output to TRAEFIK_AUTH, escaping $ with $$
```

```env
TRAEFIK_AUTH=admin:$$apr1$$xyz...
```

#### Optional: Supabase Storage

If using Supabase for file storage:

```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Update Traefik Configuration

Edit `traefik/traefik.yml` and replace placeholders:

```bash
nano traefik/traefik.yml
```

Update:
- `email` in certificatesResolvers section
- `main` domain in entryPoints section

### Step 4: Verify Configuration

```bash
# Check for missing required variables
grep -E "CHANGE_ME|your-domain.com" .env.production

# If any matches found, update them!
```

---

## Deployment Process

### Using the Deployment Script (Recommended)

The automated deployment script handles everything:

```bash
./scripts/deployment/deploy.sh
```

This will:
1. Validate environment configuration
2. Create backup of existing deployment
3. Build Docker images
4. Run database migrations
5. Deploy containers
6. Run health checks
7. Clean up old images

### Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Build images
make build

# 2. Run database migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# 3. Start services
make prod-up

# 4. Check health
make health
```

---

## Post-Deployment Verification

### Step 1: Check Container Status

```bash
make prod-status
# or
docker-compose -f docker-compose.prod.yml ps
```

All services should show as "Up" with healthy status.

### Step 2: Check Service Health

```bash
# Check backend
curl http://localhost:3001/health

# Check frontend
curl http://localhost:8080/health

# Detailed health check
curl http://localhost:3001/health/detailed
```

### Step 3: Verify SSL/TLS

Visit your domain in a browser:

```
https://your-domain.com
```

Check for:
- ✅ Valid SSL certificate (Let's Encrypt)
- ✅ HTTPS working
- ✅ HTTP redirects to HTTPS
- ✅ Frontend loads correctly

### Step 4: Test API Endpoints

```bash
# Test backend API
curl https://your-domain.com/api/v1

# Should return API info
```

### Step 5: Access Traefik Dashboard

```
https://traefik.your-domain.com
```

Login with credentials from `TRAEFIK_AUTH`.

---

## Maintenance

### Daily Operations

#### View Logs

```bash
# All services
make prod-logs

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

#### Restart Services

```bash
# All services
make prod-restart

# Specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Backups

#### Automated Backups

Set up a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /home/pi/boxerconnect && ./scripts/deployment/backup.sh >> /var/log/boxerconnect-backup.log 2>&1
```

#### Manual Backup

```bash
make backup
# or
./scripts/deployment/backup.sh
```

Backups include:
- PostgreSQL database dump
- Redis data
- Uploads directory
- Configuration files

Backups are stored in `/home/pi/boxerconnect-backups/`

#### Restore from Backup

```bash
# Stop services
make prod-down

# Restore database
docker-compose -f docker-compose.prod.yml up -d postgres
docker exec -i boxerconnect-postgres pg_restore -U boxeruser -d boxerconnect < /path/to/backup/database.dump

# Restore uploads
tar -xzf /path/to/backup/uploads.tar.gz -C ./uploads/

# Restart services
make prod-up
```

### Updates

#### Update Application Code

```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
./scripts/deployment/deploy.sh
```

#### Update Dependencies

```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix

# Rebuild images
make build
make prod-restart
```

#### Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Database Migrations

#### Apply New Migrations

```bash
# Production migration (safe)
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
```

#### Rollback Migration (if needed)

```bash
# Restore from backup before migration
# See Rollback Procedures section
```

---

## Security Features

### Implemented Security Measures

#### 1. TLS/SSL Encryption
- Automatic Let's Encrypt certificates
- TLS 1.2+ only
- Strong cipher suites
- HSTS enabled

#### 2. Container Security
- All containers run as non-root users
- Read-only root filesystems where possible
- Capability dropping
- Security options: `no-new-privileges`

#### 3. Network Isolation
- Backend services isolated from public internet
- Internal-only network for database/cache
- Frontend network for public-facing services

#### 4. Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Content-Security-Policy: configured
- Referrer-Policy: strict-origin-when-cross-origin

#### 5. Authentication & Authorization
- JWT-based authentication
- Refresh token rotation
- Password hashing with bcrypt
- Rate limiting on all endpoints

#### 6. Host Security
- UFW firewall (ports 22, 80, 443 only)
- fail2ban for SSH protection
- Automatic security updates
- SSH key-only authentication (recommended)

#### 7. Secrets Management
- Environment variables (not in code)
- Strong password requirements
- Regular secret rotation recommended

### Security Best Practices

1. **Change default passwords immediately**
2. **Use SSH keys, disable password auth**
3. **Keep system and Docker updated**
4. **Monitor logs regularly**
5. **Rotate secrets every 90 days**
6. **Use strong, unique passwords (32+ chars)**
7. **Enable 2FA where possible**
8. **Regular security audits**

### Vulnerability Scanning

```bash
# Scan for npm vulnerabilities
make security-scan

# Auto-fix vulnerabilities
make security-fix

# Scan Docker images (install trivy first)
trivy image boxerconnect-backend:latest
trivy image boxerconnect-frontend:latest
```

---

## Troubleshooting

### Common Issues

#### 1. Containers Won't Start

**Symptoms:** Containers exit immediately after starting

**Diagnosis:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres
```

**Common Causes:**
- Missing environment variables
- Database connection failed
- Port already in use
- Insufficient memory

**Solutions:**
```bash
# Verify environment variables
grep -E "CHANGE_ME" .env.production

# Check port usage
sudo netstat -tulpn | grep -E ':(80|443|5432|6379)'

# Check memory
free -h
```

#### 2. SSL Certificate Issues

**Symptoms:** Certificate not issued, HTTPS not working

**Diagnosis:**
```bash
# Check Traefik logs
docker-compose -f docker-compose.prod.yml logs traefik

# Check certificate file
ls -la /var/lib/docker/volumes/boxerconnect-traefik-certificates/
```

**Common Causes:**
- Domain not pointing to server
- Ports 80/443 blocked by firewall
- Rate limit hit (Let's Encrypt)

**Solutions:**
```bash
# Verify DNS
nslookup your-domain.com

# Check firewall
sudo ufw status

# Use Let's Encrypt staging for testing
# Edit traefik/traefik.yml and uncomment caServer line
```

#### 3. Database Connection Failed

**Symptoms:** Backend can't connect to PostgreSQL

**Diagnosis:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker exec -it boxerconnect-postgres psql -U boxeruser -d boxerconnect
```

**Solutions:**
```bash
# Verify DATABASE_URL in .env.production
# Format: postgresql://USER:PASSWORD@postgres:5432/DATABASE

# Check PostgreSQL health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

#### 4. Frontend Shows API Connection Error

**Symptoms:** Frontend can't reach backend API

**Diagnosis:**
- Check browser console for errors
- Verify CORS configuration
- Check Traefik routing

**Solutions:**
```bash
# Test API directly
curl https://your-domain.com/api/v1

# Check Traefik dashboard
# Visit https://traefik.your-domain.com

# Verify CORS_ORIGIN in backend environment
```

#### 5. Out of Memory

**Symptoms:** Containers being killed, slow performance

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats

# Check swap
swapon --show
```

**Solutions:**
```bash
# Increase swap size
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Restart low-priority services
# Consider upgrading to Pi with more RAM
```

### Getting Help

1. **Check logs first:**
   ```bash
   make prod-logs
   ```

2. **Check container status:**
   ```bash
   make prod-status
   ```

3. **Run health checks:**
   ```bash
   make health
   ```

4. **Check system resources:**
   ```bash
   htop
   df -h
   ```

---

## Rollback Procedures

### Quick Rollback

If deployment fails:

```bash
# 1. Stop new deployment
make prod-down

# 2. Restore previous backup
BACKUP_DIR="/home/pi/boxerconnect-backups/<timestamp>"

# 3. Restore database
docker-compose -f docker-compose.prod.yml up -d postgres
docker exec -i boxerconnect-postgres pg_restore -U boxeruser -d boxerconnect < $BACKUP_DIR/database.dump

# 4. Restore uploads
tar -xzf $BACKUP_DIR/uploads.tar.gz -C ./uploads/

# 5. Start services
make prod-up
```

### Git Rollback

```bash
# Find previous working commit
git log --oneline

# Checkout previous version
git checkout <commit-hash>

# Redeploy
./scripts/deployment/deploy.sh

# Return to main when ready
git checkout main
```

---

## Useful Commands Reference

### Quick Commands (via Makefile)

```bash
make help              # Show all available commands
make dev               # Start local development
make build             # Build production images
make deploy            # Deploy to production
make prod-up           # Start production containers
make prod-down         # Stop production containers
make prod-logs         # View logs
make prod-status       # Check container status
make backup            # Create backup
make health            # Check service health
make generate-secrets  # Generate new secrets
```

### Docker Commands

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker logs -f <container-name>

# Execute command in container
docker exec -it <container-name> <command>

# Remove unused resources
docker system prune -f

# View disk usage
docker system df
```

---

## Support & Resources

- **Project Repository:** https://github.com/your-username/BoxerConnect
- **Documentation:** See `/docs` directory
- **Issue Tracker:** GitHub Issues
- **Docker Documentation:** https://docs.docker.com
- **Traefik Documentation:** https://doc.traefik.io/traefik/

---

**Last Updated:** 2026-02-02

**Deployment Version:** 1.0.0
