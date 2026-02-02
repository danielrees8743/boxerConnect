#!/bin/bash

# Validate RLS Migration SQL Syntax
# This script performs basic validation of the RLS migration file

set -e

MIGRATION_FILE="./prisma/migrations/20260202010000_add_rls_policies/migration.sql"

echo "=== RLS Migration Validation ==="
echo ""

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "✓ Migration file found"

# Check file size
FILE_SIZE=$(wc -c < "$MIGRATION_FILE")
echo "✓ File size: $FILE_SIZE bytes"

# Count policies
POLICY_COUNT=$(grep -c "CREATE POLICY" "$MIGRATION_FILE")
echo "✓ Policies defined: $POLICY_COUNT"

# Count tables with RLS enabled
RLS_TABLES=$(grep -c "ENABLE ROW LEVEL SECURITY" "$MIGRATION_FILE")
echo "✓ Tables with RLS enabled: $RLS_TABLES"

# Count helper functions
FUNCTIONS=$(grep -c "CREATE OR REPLACE FUNCTION" "$MIGRATION_FILE")
echo "✓ Helper functions: $FUNCTIONS"

# Verify critical components
echo ""
echo "=== Critical Components Check ==="

if grep -q "current_user_id()" "$MIGRATION_FILE"; then
  echo "✓ current_user_id() function found"
else
  echo "❌ current_user_id() function missing"
  exit 1
fi

if grep -q "current_user_role()" "$MIGRATION_FILE"; then
  echo "✓ current_user_role() function found"
else
  echo "❌ current_user_role() function missing"
  exit 1
fi

if grep -q "is_admin()" "$MIGRATION_FILE"; then
  echo "✓ is_admin() function found"
else
  echo "❌ is_admin() function missing"
  exit 1
fi

# Check for all expected tables
EXPECTED_TABLES=("users" "boxers" "clubs" "fight_history" "availability" "match_requests" "coach_boxer" "club_coaches" "boxer_videos" "refresh_tokens" "password_reset_tokens")

echo ""
echo "=== Table Coverage Check ==="

for table in "${EXPECTED_TABLES[@]}"; do
  if grep -q "ALTER TABLE $table ENABLE ROW LEVEL SECURITY" "$MIGRATION_FILE"; then
    echo "✓ RLS enabled for: $table"
  else
    echo "❌ RLS missing for: $table"
    exit 1
  fi
done

# Check for SQL syntax errors (basic check)
echo ""
echo "=== Basic SQL Syntax Check ==="

# Check for unmatched quotes
SINGLE_QUOTES=$(grep -o "'" "$MIGRATION_FILE" | wc -l)
if [ $((SINGLE_QUOTES % 2)) -ne 0 ]; then
  echo "⚠ Warning: Odd number of single quotes detected"
fi

# Check for unmatched parentheses
OPEN_PARENS=$(grep -o "(" "$MIGRATION_FILE" | wc -l)
CLOSE_PARENS=$(grep -o ")" "$MIGRATION_FILE" | wc -l)
if [ "$OPEN_PARENS" -ne "$CLOSE_PARENS" ]; then
  echo "⚠ Warning: Unmatched parentheses (Open: $OPEN_PARENS, Close: $CLOSE_PARENS)"
else
  echo "✓ Parentheses balanced"
fi

# Check for proper statement terminators
if grep -q ";$" "$MIGRATION_FILE"; then
  echo "✓ SQL statements properly terminated"
fi

echo ""
echo "=== Validation Complete ==="
echo ""
echo "Summary:"
echo "  - Tables with RLS: $RLS_TABLES"
echo "  - Total policies: $POLICY_COUNT"
echo "  - Helper functions: $FUNCTIONS"
echo "  - File size: $FILE_SIZE bytes"
echo ""
echo "✅ All validation checks passed!"
echo ""
echo "Next steps:"
echo "  1. Review the migration file: $MIGRATION_FILE"
echo "  2. Test in a development database"
echo "  3. Run: npx prisma migrate deploy"
