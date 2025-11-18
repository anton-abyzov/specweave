#!/bin/bash
#
# Pre-Commit Hook: Increment Validation
#
# CRITICAL SAFEGUARDS:
# 1. Prevents _completed directory creation
# 2. Validates status enum values
# 3. Detects potential increment deletions
#
# Incident: 2025-11-18 - Increment 0038 accidentally moved to _completed/
# Root Cause: Incorrect closure pattern (move instead of status update)
# Solution: This hook prevents recurrence

set -e

echo "🔍 Validating increment operations..."

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Track validation failures
VALIDATION_FAILED=0

# ============================================================================
# CHECK 1: Forbidden _completed directory
# ============================================================================

if [ -d ".specweave/increments/_completed" ]; then
  echo -e "${RED}❌ CRITICAL ERROR: _completed directory detected!${NC}"
  echo ""
  echo "   Increments MUST NOT be moved to _completed/"
  echo "   Closure = status update in metadata.json ONLY"
  echo ""
  echo "   ${RED}FUNDAMENTAL RULE: Increments are PERMANENT${NC}"
  echo "   - Closing increments updates status field"
  echo "   - Files NEVER move or delete"
  echo "   - Use metadata.status to query, not file location"
  echo ""
  echo "   ${YELLOW}Fix:${NC}"
  echo "   mv .specweave/increments/_completed/* .specweave/increments/"
  echo "   rmdir .specweave/increments/_completed"
  echo ""
  VALIDATION_FAILED=1
fi

# ============================================================================
# CHECK 2: Forbidden _archive directory (created during closure)
# ============================================================================

# Note: _archive is allowed ONLY via explicit /specweave:archive command
# It should NEVER be created during /specweave:done closure
if git diff --cached --name-only | grep -q ".specweave/increments/_archive"; then
  # Check if this is a new directory (not existing archive)
  if ! git ls-tree -r HEAD --name-only | grep -q ".specweave/increments/_archive"; then
    echo -e "${RED}❌ CRITICAL ERROR: _archive directory created during increment closure!${NC}"
    echo ""
    echo "   _archive is for explicit archiving ONLY (/specweave:archive)"
    echo "   Closure (/specweave:done) MUST NOT create _archive"
    echo ""
    echo "   ${YELLOW}Fix:${NC}"
    echo "   mv .specweave/increments/_archive/* .specweave/increments/"
    echo "   rmdir .specweave/increments/_archive"
    echo ""
    VALIDATION_FAILED=1
  fi
fi

# ============================================================================
# CHECK 3: Invalid status values in metadata.json
# ============================================================================

VALID_STATUSES=("planning" "active" "paused" "completed" "abandoned")

find .specweave/increments -name "metadata.json" -type f 2>/dev/null | while read -r file; do
  # Skip _archive directory if it exists (archiving is separate from closure)
  if [[ "$file" == *"/_archive/"* ]]; then
    continue
  fi

  status=$(jq -r '.status' "$file" 2>/dev/null || echo "")

  if [ -n "$status" ] && [ "$status" != "null" ]; then
    # Check if status is in valid list
    valid=0
    for valid_status in "${VALID_STATUSES[@]}"; do
      if [ "$status" == "$valid_status" ]; then
        valid=1
        break
      fi
    done

    if [ $valid -eq 0 ]; then
      echo -e "${RED}❌ CRITICAL ERROR: Invalid status in $file${NC}"
      echo ""
      echo "   Found: '$status'"
      echo "   Valid: planning, active, paused, completed, abandoned"
      echo ""
      echo "   ${RED}INVALID STATUSES: archived, deleted, moved, closed, done${NC}"
      echo ""
      echo "   ${YELLOW}Fix:${NC}"
      echo "   Use one of the 5 valid enum values"
      echo ""
      VALIDATION_FAILED=1
    fi
  elif [ "$status" == "null" ] || [ -z "$status" ]; then
    echo -e "${RED}❌ CRITICAL ERROR: Missing or null status in $file${NC}"
    echo ""
    echo "   Every increment MUST have a status"
    echo ""
    VALIDATION_FAILED=1
  fi
done

# ============================================================================
# CHECK 4: Detect increment deletions (gap in numbering)
# ============================================================================

if [ -d ".specweave/increments" ]; then
  increment_ids=$(ls .specweave/increments 2>/dev/null | grep -E "^[0-9]{4}-" | cut -d'-' -f1 | sort -n)

  if [ -n "$increment_ids" ]; then
    previous_id=0
    gap_detected=0

    for id in $increment_ids; do
      # Remove leading zeros for arithmetic
      numeric_id=$((10#$id))
      expected_id=$((previous_id + 1))

      # Gap of more than 5 increments is suspicious
      if [ $numeric_id -gt $((expected_id + 5)) ]; then
        if [ $gap_detected -eq 0 ]; then
          echo -e "${YELLOW}⚠️  WARNING: Potential increment deletion detected${NC}"
          gap_detected=1
        fi
        echo "   Gap in numbering: $(printf '%04d' $previous_id) → $(printf '%04d' $numeric_id)"
        echo "   Missing increments may have been deleted"
        echo ""
      fi

      previous_id=$numeric_id
    done

    if [ $gap_detected -eq 1 ]; then
      echo "   ${YELLOW}Note:${NC} This is a WARNING, not a blocker"
      echo "   Large gaps may indicate deleted increments"
      echo "   Verify this is intentional (e.g., abandoned increments)"
      echo ""
    fi
  fi
fi

# ============================================================================
# CHECK 5: Increment files moved out of .specweave/increments
# ============================================================================

# Check for deleted increment directories in staging
git diff --cached --name-status | grep "^D" | grep ".specweave/increments/[0-9]" | while read -r line; do
  deleted_file=$(echo "$line" | awk '{print $2}')

  # Check if entire increment directory was deleted
  if [[ "$deleted_file" == *"/metadata.json" ]]; then
    increment_dir=$(dirname "$deleted_file")

    echo -e "${RED}❌ CRITICAL ERROR: Increment deletion detected!${NC}"
    echo ""
    echo "   Deleted: $increment_dir"
    echo ""
    echo "   ${RED}INCREMENTS ARE PERMANENT - NEVER DELETE THEM${NC}"
    echo ""
    echo "   ${YELLOW}Fix:${NC}"
    echo "   git restore $increment_dir"
    echo ""
    echo "   If increment is truly obsolete, use:"
    echo "   /specweave:abandon <id> --reason='...'"
    echo ""
    VALIDATION_FAILED=1
  fi
done

# ============================================================================
# FINAL RESULT
# ============================================================================

if [ $VALIDATION_FAILED -eq 1 ]; then
  echo ""
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ VALIDATION FAILED - COMMIT BLOCKED${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "   Fix the errors above before committing."
  echo ""
  echo "   ${YELLOW}Common mistakes:${NC}"
  echo "   1. Moving increments to _completed/ (use status update)"
  echo "   2. Using invalid status values (use enum: planning/active/paused/completed/abandoned)"
  echo "   3. Deleting increments (use /specweave:abandon instead)"
  echo ""
  echo "   ${YELLOW}Correct closure pattern:${NC}"
  echo "   - Update metadata.json status field ONLY"
  echo "   - Increment stays in .specweave/increments/<id>/"
  echo "   - No files moved or deleted"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Increment validation passed${NC}"
echo ""
exit 0
