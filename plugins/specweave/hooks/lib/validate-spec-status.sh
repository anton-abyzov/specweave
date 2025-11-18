#!/bin/bash
#
# validate-spec-status.sh
#
# Validates that spec.md status values match IncrementStatus enum.
# Prevents vocabulary drift and ensures status line hook compatibility.
#
# Usage:
#   bash validate-spec-status.sh <increment-id>
#   bash validate-spec-status.sh --all  # Validate all increments
#
# Exit codes:
#   0 = Valid
#   1 = Invalid status found
#   2 = Error (file not found, etc.)
#
# Requires: bash 4.0+ (for associative arrays)

set -euo pipefail

# Find project root
find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"

# Valid IncrementStatus enum values (from src/core/types/increment-metadata.ts)
VALID_STATUSES=("planning" "active" "backlog" "paused" "completed" "abandoned")

# Get suggested correction for invalid status
get_correction() {
  local status="$1"
  case "$status" in
    "planned") echo "planning" ;;
    "in-progress"|"in_progress") echo "active" ;;
    "done") echo "completed" ;;
    "cancelled"|"canceled") echo "abandoned" ;;
    *) echo "" ;;
  esac
}

# Validate a single spec file
validate_spec() {
  local spec_file="$1"
  local increment_id=$(basename "$(dirname "$spec_file")")

  if [[ ! -f "$spec_file" ]]; then
    echo "❌ Error: spec.md not found for increment $increment_id"
    return 2
  fi

  # Extract status from YAML frontmatter
  local status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' "' || echo "")

  if [[ -z "$status" ]]; then
    echo "⚠️  Warning: No status field in $increment_id/spec.md"
    return 0  # Not an error, just a warning
  fi

  # Check if status is valid
  local is_valid=0
  for valid_status in "${VALID_STATUSES[@]}"; do
    if [[ "$status" == "$valid_status" ]]; then
      is_valid=1
      break
    fi
  done

  if [[ $is_valid -eq 1 ]]; then
    echo "✅ $increment_id: status '$status' is valid"
    return 0
  else
    # Invalid status found - suggest correction
    echo ""
    echo "❌ Invalid status in $increment_id/spec.md"
    echo "   Found: '$status'"
    echo ""

    # Check if we have a suggested correction
    local correction=$(get_correction "$status")
    if [[ -n "$correction" ]]; then
      echo "   💡 Did you mean: '$correction'?"
      echo ""
      echo "   Fix:"
      echo "   sed -i '' 's/^status: $status/status: $correction/' $spec_file"
    else
      echo "   Valid statuses: ${VALID_STATUSES[*]}"
    fi
    echo ""

    return 1
  fi
}

# Validate all increments
validate_all() {
  local exit_code=0
  local total=0
  local valid=0
  local invalid=0

  echo "Validating all increments in $INCREMENTS_DIR"
  echo ""

  for spec_file in "$INCREMENTS_DIR"/*/spec.md; do
    if [[ -f "$spec_file" ]]; then
      total=$((total + 1))
      if validate_spec "$spec_file"; then
        valid=$((valid + 1))
      else
        invalid=$((invalid + 1))
        exit_code=1
      fi
    fi
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Summary: $total increments checked"
  echo "  ✅ Valid: $valid"
  echo "  ❌ Invalid: $invalid"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ $invalid -gt 0 ]]; then
    echo ""
    echo "⚠️  Please fix invalid status values to use official IncrementStatus enum."
    echo ""
    echo "Valid statuses:"
    for status in "${VALID_STATUSES[@]}"; do
      echo "  - $status"
    done
  fi

  return $exit_code
}

# Main logic
if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <increment-id> | --all"
  echo ""
  echo "Examples:"
  echo "  $0 0042-test-infrastructure-cleanup"
  echo "  $0 --all"
  exit 2
fi

if [[ "$1" == "--all" ]]; then
  validate_all
else
  INCREMENT_ID="$1"
  SPEC_FILE="$INCREMENTS_DIR/$INCREMENT_ID/spec.md"
  validate_spec "$SPEC_FILE"
fi
