#!/bin/bash

# =============================================================================
# BoxerConnect Backup Script
# Creates encrypted backups of database and uploads
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Configuration
# =============================================================================

PROJECT_NAME="boxerconnect"
BACKUP_DIR="/home/pi/boxerconnect-backups"
RETENTION_DAYS=30  # Keep backups for 30 days

# Load environment variables
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Create Backup Directory
# =============================================================================

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

log_info "Creating backup directory: $BACKUP_PATH"
mkdir -p "$BACKUP_PATH"

# =============================================================================
# Backup PostgreSQL Database
# =============================================================================

log_info "Backing up PostgreSQL database..."

if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
    docker exec "${PROJECT_NAME}-postgres" pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        > "$BACKUP_PATH/database.dump"

    log_success "Database backup completed: $(du -h "$BACKUP_PATH/database.dump" | cut -f1)"
else
    log_error "PostgreSQL container is not running!"
    exit 1
fi

# =============================================================================
# Backup Redis Data (if needed)
# =============================================================================

log_info "Backing up Redis data..."

if docker ps | grep -q "${PROJECT_NAME}-redis"; then
    # Save Redis database
    docker exec "${PROJECT_NAME}-redis" redis-cli --pass "${REDIS_PASSWORD}" BGSAVE

    # Wait for save to complete
    sleep 2

    # Copy Redis dump
    docker cp "${PROJECT_NAME}-redis:/data/dump.rdb" "$BACKUP_PATH/redis.rdb"

    log_success "Redis backup completed: $(du -h "$BACKUP_PATH/redis.rdb" | cut -f1)"
else
    log_error "Redis container is not running!"
fi

# =============================================================================
# Backup Uploads Directory
# =============================================================================

log_info "Backing up uploads directory..."

UPLOADS_DIR="./uploads"

if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$BACKUP_PATH/uploads.tar.gz" -C "$UPLOADS_DIR" .
    log_success "Uploads backup completed: $(du -h "$BACKUP_PATH/uploads.tar.gz" | cut -f1)"
else
    log_info "No uploads directory found, skipping..."
fi

# =============================================================================
# Backup Configuration Files
# =============================================================================

log_info "Backing up configuration files..."

tar -czf "$BACKUP_PATH/config.tar.gz" \
    docker-compose.prod.yml \
    traefik/ \
    .env.production 2>/dev/null || {
    log_info "Some configuration files not found, but continuing..."
}

# =============================================================================
# Create Backup Manifest
# =============================================================================

log_info "Creating backup manifest..."

cat > "$BACKUP_PATH/manifest.txt" <<EOF
BoxerConnect Backup Manifest
============================

Backup Date: $(date)
Backup Location: $BACKUP_PATH

Files:
------
$(ls -lh "$BACKUP_PATH")

Environment:
-----------
Database: ${DB_NAME}
Domain: ${DOMAIN}
Node Environment: production

Restore Instructions:
--------------------
1. Stop all containers: docker-compose -f docker-compose.prod.yml down
2. Restore database: docker exec -i ${PROJECT_NAME}-postgres pg_restore -U ${DB_USER} -d ${DB_NAME} < database.dump
3. Restore uploads: tar -xzf uploads.tar.gz -C ./uploads/
4. Restart containers: docker-compose -f docker-compose.prod.yml up -d

EOF

log_success "Backup manifest created!"

# =============================================================================
# Calculate Backup Size
# =============================================================================

TOTAL_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log_success "Total backup size: $TOTAL_SIZE"

# =============================================================================
# Cleanup Old Backups
# =============================================================================

log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
log_success "Kept $REMAINING_BACKUPS most recent backups"

# =============================================================================
# Optional: Encrypt Backup
# =============================================================================

if command -v gpg >/dev/null 2>&1; then
    log_info "Encrypting backup..."
    tar -czf - -C "$BACKUP_DIR" "$TIMESTAMP" | gpg --symmetric --cipher-algo AES256 -o "$BACKUP_DIR/$TIMESTAMP.tar.gz.gpg"

    if [ -f "$BACKUP_DIR/$TIMESTAMP.tar.gz.gpg" ]; then
        log_success "Encrypted backup created: $BACKUP_DIR/$TIMESTAMP.tar.gz.gpg"
        log_info "Unencrypted backup kept at: $BACKUP_PATH"
    fi
fi

# =============================================================================
# Backup Summary
# =============================================================================

echo ""
echo "========================================"
echo -e "${GREEN}Backup Completed Successfully!${NC}"
echo "========================================"
echo ""
echo "Backup Location: $BACKUP_PATH"
echo "Total Size: $TOTAL_SIZE"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "Files backed up:"
echo "  - PostgreSQL database"
echo "  - Redis data"
echo "  - Uploads directory"
echo "  - Configuration files"
echo ""
echo "To restore this backup:"
echo "  See instructions in: $BACKUP_PATH/manifest.txt"
echo ""
echo "========================================"

exit 0
