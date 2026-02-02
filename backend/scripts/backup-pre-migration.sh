#!/bin/bash
# Pre-Migration Backup Script
# Creates backups of PostgreSQL database and uploaded files before Supabase migration
#
# Usage: ./backend/scripts/backup-pre-migration.sh
# Run from project root directory

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_DIR="${BACKUP_DIR}/database"
UPLOADS_BACKUP_DIR="${BACKUP_DIR}/uploads"

echo -e "${GREEN}=== BoxerConnect Pre-Migration Backup ===${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

# Create backup directories if they don't exist
mkdir -p "${DB_BACKUP_DIR}"
mkdir -p "${UPLOADS_BACKUP_DIR}"

# =============================================================================
# Database Backup
# =============================================================================

echo -e "${YELLOW}[1/3] Creating PostgreSQL database backup...${NC}"

# Load environment variables using a safer method
if [ -f "./backend/.env" ]; then
    # Use a safer method to load environment variables
    set -a  # automatically export all variables
    source <(grep -v '^#' ./backend/.env | grep -v '^$')
    set +a
else
    echo -e "${RED}ERROR: ./backend/.env file not found${NC}"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
if [ -z "${DATABASE_URL}" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Parse DATABASE_URL
DB_CONNECTION=$(echo "${DATABASE_URL}" | sed -e 's/^postgresql:\/\///')
DB_USER=$(echo "${DB_CONNECTION}" | cut -d':' -f1)
DB_PASS=$(echo "${DB_CONNECTION}" | cut -d':' -f2 | cut -d'@' -f1)
DB_HOST=$(echo "${DB_CONNECTION}" | cut -d'@' -f2 | cut -d':' -f1)
DB_PORT=$(echo "${DB_CONNECTION}" | cut -d':' -f2 | cut -d'/' -f1)
DB_NAME=$(echo "${DB_CONNECTION}" | cut -d'/' -f2 | cut -d'?' -f1)

# Create database backup
DB_BACKUP_FILE="${DB_BACKUP_DIR}/boxerconnect_${TIMESTAMP}.sql"
export PGPASSWORD="${DB_PASS}"

if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -F p -f "${DB_BACKUP_FILE}"; then
    echo -e "${GREEN}✓ Database backup created: ${DB_BACKUP_FILE}${NC}"

    # Create compressed version
    gzip -c "${DB_BACKUP_FILE}" > "${DB_BACKUP_FILE}.gz"
    echo -e "${GREEN}✓ Compressed backup created: ${DB_BACKUP_FILE}.gz${NC}"

    # Show backup size
    DB_SIZE=$(du -h "${DB_BACKUP_FILE}" | cut -f1)
    DB_GZ_SIZE=$(du -h "${DB_BACKUP_FILE}.gz" | cut -f1)
    echo "  Backup size: ${DB_SIZE} (${DB_GZ_SIZE} compressed)"
else
    echo -e "${RED}ERROR: Database backup failed${NC}"
    exit 1
fi

unset PGPASSWORD
echo ""

# =============================================================================
# Upload Files Backup
# =============================================================================

echo -e "${YELLOW}[2/3] Creating uploaded files backup...${NC}"

# Determine upload path (use UPLOAD_PATH env var or default)
UPLOAD_SOURCE="${UPLOAD_PATH:-./backend/uploads}"

if [ -d "${UPLOAD_SOURCE}" ]; then
    UPLOADS_BACKUP_FILE="${UPLOADS_BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"

    # Create tarball of uploads directory
    tar -czf "${UPLOADS_BACKUP_FILE}" -C "$(dirname "${UPLOAD_SOURCE}")" "$(basename "${UPLOAD_SOURCE}")"

    echo -e "${GREEN}✓ Uploads backup created: ${UPLOADS_BACKUP_FILE}${NC}"

    # Show backup size and file count
    UPLOADS_SIZE=$(du -h "${UPLOADS_BACKUP_FILE}" | cut -f1)
    FILE_COUNT=$(find "${UPLOAD_SOURCE}" -type f | wc -l | xargs)
    echo "  Backup size: ${UPLOADS_SIZE}"
    echo "  Files backed up: ${FILE_COUNT}"
else
    echo -e "${YELLOW}⚠ Uploads directory not found: ${UPLOAD_SOURCE}${NC}"
    echo "  Skipping uploads backup (no files to backup)"
fi

echo ""

# =============================================================================
# Backup Summary
# =============================================================================

echo -e "${YELLOW}[3/3] Creating backup manifest...${NC}"

MANIFEST_FILE="${BACKUP_DIR}/backup_manifest_${TIMESTAMP}.txt"
cat > "${MANIFEST_FILE}" << EOF
BoxerConnect Pre-Migration Backup Manifest
==========================================
Backup Date: $(date)
Timestamp: ${TIMESTAMP}

Database Backup:
- File: ${DB_BACKUP_FILE}
- Compressed: ${DB_BACKUP_FILE}.gz
- Database: ${DB_NAME}
- Host: ${DB_HOST}:${DB_PORT}

Uploads Backup:
- File: ${UPLOADS_BACKUP_FILE}
- Source: ${UPLOAD_SOURCE}
- File Count: ${FILE_COUNT}

Restore Instructions:
---------------------
1. Database Restore:
   gunzip -c ${DB_BACKUP_FILE}.gz | psql -h HOST -p PORT -U USER -d DATABASE

2. Uploads Restore:
   tar -xzf ${UPLOADS_BACKUP_FILE} -C /destination/path/

Notes:
------
- Keep these backups until migration is verified successful
- Test restore procedures before proceeding with migration
- Ensure backups are stored in a secure location
EOF

echo -e "${GREEN}✓ Manifest created: ${MANIFEST_FILE}${NC}"
echo ""

# =============================================================================
# Final Summary
# =============================================================================

echo -e "${GREEN}=== Backup Complete ===${NC}"
echo ""
echo "Backup Location: ${BACKUP_DIR}"
echo "Manifest: ${MANIFEST_FILE}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "1. Verify backup files exist and are readable"
echo "2. Test restore procedures before migration"
echo "3. Keep backups until migration is verified successful"
echo "4. Store backups in a secure, separate location"
echo ""
echo -e "${GREEN}You can now proceed with the Supabase migration.${NC}"
