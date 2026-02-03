#!/bin/bash
# Setup Test Database for RLS Integration Tests
#
# This script creates and configures a test database for running RLS integration tests.
#
# Usage:
#   ./scripts/setup-test-db.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}BoxerConnect Test Database Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Configuration
DB_NAME="boxerconnect_test"
DB_USER="${POSTGRES_USER:-boxer}"
DB_PASSWORD="${POSTGRES_PASSWORD:-boxer_dev_password}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Database Name: ${DB_NAME}"
echo "  Database User: ${DB_USER}"
echo "  Database Host: ${DB_HOST}"
echo "  Database Port: ${DB_PORT}"
echo ""

# Check if PostgreSQL is running
echo -e "${YELLOW}Step 1: Checking PostgreSQL connection...${NC}"
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
  echo -e "${RED}❌ PostgreSQL is not running or not accessible${NC}"
  echo "Please ensure PostgreSQL is running and accessible at ${DB_HOST}:${DB_PORT}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Check if test database exists
echo -e "${YELLOW}Step 2: Checking if test database exists...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${YELLOW}⚠️  Test database already exists${NC}"
  read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Dropping existing test database...${NC}"
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
    echo -e "${GREEN}✅ Dropped existing database${NC}"
  else
    echo -e "${YELLOW}Skipping database creation${NC}"
  fi
fi

# Create test database if it doesn't exist
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${YELLOW}Creating test database...${NC}"
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  echo -e "${GREEN}✅ Test database created${NC}"
fi
echo ""

# Apply migrations
echo -e "${YELLOW}Step 3: Applying database migrations...${NC}"
export DATABASE_URL="$DATABASE_URL"
echo "Using DATABASE_URL: ${DATABASE_URL//:*@/:***@}"  # Mask password in output
npm run prisma:migrate 2>&1 | grep -v "password"
echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

# Verify RLS policies
echo -e "${YELLOW}Step 4: Verifying RLS policies...${NC}"
RLS_CHECK=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -t -c "
  SELECT COUNT(*)
  FROM pg_tables
  WHERE schemaname = 'public'
  AND rowsecurity = true;
" | xargs)

TOTAL_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -t -c "
  SELECT COUNT(*)
  FROM pg_tables
  WHERE schemaname = 'public';
" | xargs)

echo "  Tables with RLS enabled: ${RLS_CHECK} / ${TOTAL_TABLES}"

if [ "$RLS_CHECK" -ge 10 ]; then
  echo -e "${GREEN}✅ RLS policies are enabled${NC}"
else
  echo -e "${RED}❌ RLS policies are not properly enabled${NC}"
  echo -e "${YELLOW}Please ensure the RLS migration has been applied${NC}"
  exit 1
fi
echo ""

# Create .env.test file
echo -e "${YELLOW}Step 5: Creating .env.test file...${NC}"
cat > .env.test << EOF
# Test Environment Configuration
NODE_ENV=test
DATABASE_URL=${DATABASE_URL}

# JWT Configuration
JWT_SECRET=test-jwt-secret-key-that-is-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=test-refresh-secret-key-that-is-at-least-32-characters
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3002
HOST=localhost

# Redis Configuration
REDIS_URL=redis://localhost:6379/1

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=error
EOF
echo -e "${GREEN}✅ .env.test file created${NC}"
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ Test Database Setup Complete!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run integration tests:"
echo "     npm test tests/integration"
echo ""
echo "  2. Run specific test suite:"
echo "     npx jest tests/integration/rls-security.test.ts"
echo ""
echo "  3. Run with debug logging:"
echo "     DEBUG_TESTS=true npx jest tests/integration"
echo ""
echo -e "${BLUE}================================================${NC}"
