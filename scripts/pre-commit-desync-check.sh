#!/usr/bin/env bash
#
# pre-commit-desync-check.sh - Detect status desyncs before commit
#
# Prevents commits with metadata.json/spec.md status desyncs.
# This enforces CLAUDE.md Rule #7 (source-of-truth discipline).
#
# Incident Reference: 2025-11-20 - Silent failure caused increment 0047
# to have metadata.json="completed" while spec.md="active"
#
# Exit codes:
#   0 - No desyncs found (commit allowed)
#   1 - Desyncs found (commit blocked)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Pre-commit: Checking for status desyncs...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if increments directory exists
if [[ ! -d "$INCREMENTS_DIR" ]]; then
  echo -e "${GREEN}✅ No increments directory - skipping check${NC}"
  echo ""
  exit 0
fi

# Track desyncs found
DESYNCS_FOUND=0
DESYNCS=()

# Scan all increment directories (skip _archive)
while IFS= read -r -d '' increment_dir; do
  increment_id=$(basename "$increment_dir")

  # Skip archive directories
  if [[ "$increment_id" == _* ]]; then
    continue
  fi

  metadata_file="$increment_dir/metadata.json"
  spec_file="$increment_dir/spec.md"

  # Skip if either file doesn't exist
  if [[ ! -f "$metadata_file" ]] || [[ ! -f "$spec_file" ]]; then
    continue
  fi

  # Read status from metadata.json
  metadata_status=$(jq -r '.status // "null"' "$metadata_file" 2>/dev/null || echo "null")

  # Read status from spec.md YAML frontmatter
  spec_status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "null")

  # Check for desync
  if [[ "$metadata_status" != "null" ]] && [[ "$spec_status" != "null" ]] && [[ "$metadata_status" != "$spec_status" ]]; then
    DESYNCS_FOUND=$((DESYNCS_FOUND + 1))
    DESYNCS+=("$increment_id|$metadata_status|$spec_status")
  fi
done < <(find "$INCREMENTS_DIR" -mindepth 1 -maxdepth 1 -type d -print0)

# Report results
if [[ $DESYNCS_FOUND -eq 0 ]]; then
  echo -e "${GREEN}✅ No status desyncs detected${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 0
fi

# Desyncs found - block commit
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}❌ COMMIT BLOCKED - STATUS DESYNCS DETECTED${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${RED}Found $DESYNCS_FOUND status desync(s):${NC}"
echo ""

for desync in "${DESYNCS[@]}"; do
  IFS='|' read -r inc_id meta_status spec_status <<< "$desync"
  echo -e "${RED}❌ $inc_id${NC}"
  echo "   metadata.json: $meta_status"
  echo "   spec.md:       $spec_status"
  echo ""
done

echo -e "${YELLOW}This violates source-of-truth discipline (CLAUDE.md Rule #7).${NC}"
echo -e "${YELLOW}Both metadata.json and spec.md MUST have the same status.${NC}"
echo ""
echo -e "${YELLOW}To fix:${NC}"
echo ""
echo -e "  ${GREEN}# Option 1: Auto-fix all desyncs${NC}"
echo -e "  ${GREEN}/specweave:sync-status --fix${NC}"
echo ""
echo -e "  ${GREEN}# Option 2: Manually check and fix${NC}"
echo -e "  ${GREEN}/specweave:sync-status${NC}"
echo ""
echo -e "  ${GREEN}# Then retry commit${NC}"
echo -e "  ${GREEN}git commit${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit 1
