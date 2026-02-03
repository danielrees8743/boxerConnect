#!/bin/bash

# =============================================================================
# BoxerConnect Production Deployment Script
# Deploys the application to Raspberry Pi using Docker Compose
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Configuration
# =============================================================================

PROJECT_NAME="boxerconnect"
DEPLOY_DIR="/home/pi/boxerconnect"
ENV_FILE=".env.production"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# Pre-deployment Checks
# =============================================================================

log_info "Starting pre-deployment checks..."

# Check if Docker is installed
if ! command_exists docker; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "$ENV_FILE not found! Please create it from .env.production.example"
    exit 1
fi

# Check if critical environment variables are set
log_info "Validating environment variables..."
required_vars=("DOMAIN" "DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=CHANGE_ME" "$ENV_FILE"; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    log_error "The following required variables are missing or not configured:"
    printf ' - %s\n' "${missing_vars[@]}"
    log_error "Please configure these in $ENV_FILE"
    exit 1
fi

log_success "Pre-deployment checks passed!"

# =============================================================================
# Backup Current Deployment (if exists)
# =============================================================================

log_info "Creating backup of current deployment..."

if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_DIR="$DEPLOY_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
        log_info "Backing up PostgreSQL database..."
        docker exec "${PROJECT_NAME}-postgres" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database.sql" || {
            log_warning "Database backup failed, but continuing..."
        }
    fi

    # Backup uploads
    if [ -d "$DEPLOY_DIR/uploads" ]; then
        log_info "Backing up uploads..."
        cp -r "$DEPLOY_DIR/uploads" "$BACKUP_DIR/" || {
            log_warning "Uploads backup failed, but continuing..."
        }
    fi

    log_success "Backup created at $BACKUP_DIR"
else
    log_info "No existing deployment found, skipping backup"
fi

# =============================================================================
# Build Docker Images
# =============================================================================

log_info "Building Docker images..."

# Load environment variables for build (safely handles spaces and special characters)
set -a
source "$ENV_FILE"
set +a

# Build images (use cache for faster builds)
docker-compose -f docker-compose.prod.yml build || {
    log_error "Docker build failed!"
    exit 1
}

log_success "Docker images built successfully!"

# =============================================================================
# Database Migrations
# =============================================================================

log_info "Running database migrations..."

# Check if database is accessible
if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
    # Run Prisma migrations
    docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy || {
        log_error "Database migration failed!"
        exit 1
    }
    log_success "Database migrations completed!"
else
    log_warning "Database not running, skipping migrations"
fi

# =============================================================================
# Deploy Application
# =============================================================================

log_info "Deploying application..."

# Stop old containers
log_info "Stopping old containers..."
docker-compose -f docker-compose.prod.yml down || {
    log_warning "No containers to stop"
}

# Start new containers
log_info "Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d || {
    log_error "Failed to start containers!"
    exit 1
}

log_success "Containers started successfully!"

# =============================================================================
# Post-deployment Health Checks
# =============================================================================

log_info "Running health checks..."

# Wait for services to be ready
sleep 10

# Check backend health
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    log_success "Backend is healthy!"
else
    log_error "Backend health check failed!"
    log_info "Checking container logs..."
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check frontend health
if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    log_success "Frontend is healthy!"
else
    log_error "Frontend health check failed!"
    log_info "Checking container logs..."
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# =============================================================================
# Cleanup
# =============================================================================

log_info "Cleaning up old Docker images..."
docker image prune -f || {
    log_warning "Image cleanup failed, but deployment was successful"
}

# =============================================================================
# Deployment Summary
# =============================================================================

echo ""
echo "========================================"
echo -e "${GREEN}Deployment Successful!${NC}"
echo "========================================"
echo ""
echo "Services:"
echo "  - Frontend: https://${DOMAIN}"
echo "  - Backend: https://${DOMAIN}/api"
echo "  - Traefik Dashboard: https://traefik.${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Check status: docker-compose -f docker-compose.prod.yml ps"
echo "  - Stop services: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "========================================"

exit 0
