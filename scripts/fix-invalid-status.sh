#!/bin/bash
#
# Fix Invalid Status Migration Script
#
# Purpose: Fix all increments with invalid status "planned" → "planning"
#
# Background:
# - Bug in JIRA mapper (jira-incremental-mapper.ts) used "planned" instead of "planning"
# - Bug in plan command (agent-invoker.ts) used "planned" instead of "planning"
# - Valid status values: planning, active, backlog, paused, completed, abandoned
#
# This script:
# 1. Scans all increment metadata.json files
# 2. Replaces "planned" with "planning" in status field
# 3. Rebuilds active increment cache
# 4. Shows summary of fixes applied
#
# Usage:
#   bash scripts/fix-invalid-status.sh [--dry-run]
#
# Options:
#   --dry-run: Show what would be fixed without actually changing files
#
# Version: 1.0.0
# Date: 2025-11-24

set -e  # Exit on error

# Parse command-line arguments
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Invalid Status Migration"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "  (DRY RUN MODE - No changes will be made)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Find project root
PROJECT_ROOT="$(pwd)"
if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo -e "${RED}❌ Error: Not in a SpecWeave project root${NC}"
  echo "Please run this script from the project root directory."
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ Error: jq is not installed${NC}"
  echo "Please install jq: brew install jq"
  exit 1
fi

# Counters
TOTAL_INCREMENTS=0
INVALID_COUNT=0
FIXED_COUNT=0

echo "📊 Scanning increment metadata files..."
echo ""

# Find all metadata.json files
while IFS= read -r -d '' metadata_file; do
  TOTAL_INCREMENTS=$((TOTAL_INCREMENTS + 1))

  # Read status from metadata
  STATUS=$(jq -r '.status // "unknown"' "$metadata_file" 2>/dev/null || echo "unknown")
  INCREMENT_ID=$(jq -r '.id // "unknown"' "$metadata_file" 2>/dev/null || echo "unknown")

  # Check if status is "planned" (invalid)
  if [[ "$STATUS" == "planned" ]]; then
    INVALID_COUNT=$((INVALID_COUNT + 1))

    echo -e "${YELLOW}⚠️  Found invalid status in: $metadata_file${NC}"
    echo "    Increment ID: $INCREMENT_ID"
    echo "    Current status: \"planned\" (invalid)"
    echo "    Will fix to: \"planning\" (valid)"
    echo ""

    if [[ "$DRY_RUN" == "false" ]]; then
      # Fix the status using sed
      # Create backup first
      cp "$metadata_file" "${metadata_file}.backup"

      # Replace "planned" with "planning" in status field
      # Use jq to ensure we only replace the status field value
      jq '.status = "planning"' "$metadata_file" > "${metadata_file}.tmp"
      mv "${metadata_file}.tmp" "$metadata_file"

      echo -e "${GREEN}✅ Fixed: $metadata_file${NC}"
      echo "    Backup created: ${metadata_file}.backup"
      echo ""

      FIXED_COUNT=$((FIXED_COUNT + 1))
    fi
  fi
done < <(find "$PROJECT_ROOT/.specweave/increments" -type f -name "metadata.json" -print0)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total increments scanned: $TOTAL_INCREMENTS"
echo "Invalid status found: $INVALID_COUNT"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo -e "${BLUE}ℹ️  DRY RUN: No changes were made${NC}"
  echo "Run without --dry-run to apply fixes"
else
  echo "Increments fixed: $FIXED_COUNT"
  echo ""

  if [[ $FIXED_COUNT -gt 0 ]]; then
    echo -e "${GREEN}✅ Fixes applied successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Rebuild active increment cache:"
    echo "   node -e \"require('./dist/src/core/increment/active-increment-manager.js').ActiveIncrementManager.prototype.smartUpdate.call(new (require('./dist/src/core/increment/active-increment-manager.js').ActiveIncrementManager)())\""
    echo ""
    echo "2. Remove backup files (after verifying fixes):"
    echo "   find .specweave/increments -name '*.backup' -delete"
  else
    echo -e "${GREEN}✅ No fixes needed - all statuses are valid!${NC}"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with appropriate code
if [[ "$DRY_RUN" == "true" ]] && [[ $INVALID_COUNT -gt 0 ]]; then
  exit 1  # Indicate that fixes are needed
else
  exit 0
fi
