#!/bin/bash
#
# SpecWeave Internal Docs Structure Fix Script
#
# Purpose: Fix critical violations in .specweave/docs/internal/ structure
# - Deletes unauthorized 'default/' subdirectories in cross-project folders
# - Moves misplaced user stories to correct location
# - Deletes undocumented 'overview/' folder
#
# Usage:
#   ./fix-internal-docs-structure.sh           # Dry run (preview only)
#   ./fix-internal-docs-structure.sh --fix     # Apply fixes
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
INTERNAL_DOCS="$PROJECT_ROOT/.specweave/docs/internal"
DRY_RUN=true

# Parse arguments
if [ "${1:-}" = "--fix" ]; then
  DRY_RUN=false
fi

echo "=================================================="
echo "SpecWeave Internal Docs Structure Fix"
echo "=================================================="
echo ""
echo "Project Root: $PROJECT_ROOT"
echo "Internal Docs: $INTERNAL_DOCS"
echo "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN (preview only)" || echo "APPLY FIXES")"
echo ""

# Violation counter
VIOLATIONS=0

# Function to delete directory
delete_dir() {
  local dir="$1"
  local reason="$2"

  if [ ! -d "$dir" ]; then
    echo -e "${BLUE}ℹ️  Already fixed: $dir${NC}"
    return
  fi

  echo -e "${RED}❌ VIOLATION: $reason${NC}"
  echo "   Directory: $dir"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}   [DRY RUN] Would delete directory${NC}"
  else
    rm -rf "$dir"
    echo -e "${GREEN}   ✅ Deleted${NC}"
  fi

  echo ""
  ((VIOLATIONS++))
}

# Function to move file
move_file() {
  local src="$1"
  local dest="$2"
  local reason="$3"

  if [ ! -f "$src" ]; then
    echo -e "${BLUE}ℹ️  Already fixed: $src${NC}"
    return
  fi

  echo -e "${RED}❌ VIOLATION: $reason${NC}"
  echo "   Source: $src"
  echo "   Destination: $dest"

  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}   [DRY RUN] Would move file${NC}"
  else
    # Create destination directory if needed
    mkdir -p "$(dirname "$dest")"
    mv "$src" "$dest"
    echo -e "${GREEN}   ✅ Moved${NC}"
  fi

  echo ""
  ((VIOLATIONS++))
}

# Check if internal docs exist
if [ ! -d "$INTERNAL_DOCS" ]; then
  echo -e "${RED}❌ Error: Internal docs directory not found!${NC}"
  echo "Expected: $INTERNAL_DOCS"
  exit 1
fi

echo "=================================================="
echo "VIOLATION 1: strategy/default/ Subdirectory"
echo "=================================================="
echo ""
delete_dir "$INTERNAL_DOCS/strategy/default" \
  "strategy/ is a CROSS-PROJECT folder (no project subdirectories allowed)"

echo "=================================================="
echo "VIOLATION 2: delivery/default/ Subdirectory"
echo "=================================================="
echo ""
delete_dir "$INTERNAL_DOCS/delivery/default" \
  "delivery/ is a CROSS-PROJECT folder (no project subdirectories allowed)"

echo "=================================================="
echo "VIOLATION 3: governance/default/ Subdirectory"
echo "=================================================="
echo ""
delete_dir "$INTERNAL_DOCS/governance/default" \
  "governance/ is a CROSS-PROJECT folder (no project subdirectories allowed)"

echo "=================================================="
echo "VIOLATION 4: overview/ Folder"
echo "=================================================="
echo ""
delete_dir "$INTERNAL_DOCS/overview" \
  "overview/ folder is undocumented (not in CLAUDE.md or internal README)"

echo "=================================================="
echo "VIOLATION 5: Misplaced User Stories in strategy/"
echo "=================================================="
echo ""

# Determine destination for user stories
# Check if increment 0017 exists
INCREMENT_0017="$PROJECT_ROOT/.specweave/increments/0017-sync-architecture-fix"

if [ -d "$INCREMENT_0017" ]; then
  # Read increment metadata to find feature mapping
  # For now, default to FS-017 (matching increment number)
  FEATURE_ID="FS-017"
else
  echo -e "${YELLOW}⚠️  Increment 0017 not found, defaulting to FS-017${NC}"
  FEATURE_ID="FS-017"
fi

# Create feature folder if needed (only in --fix mode)
if [ "$DRY_RUN" = false ]; then
  mkdir -p "$INTERNAL_DOCS/specs/_features/$FEATURE_ID"
  mkdir -p "$INTERNAL_DOCS/specs/default/$FEATURE_ID"

  # Create basic FEATURE.md if it doesn't exist
  if [ ! -f "$INTERNAL_DOCS/specs/_features/$FEATURE_ID/FEATURE.md" ]; then
    cat > "$INTERNAL_DOCS/specs/_features/$FEATURE_ID/FEATURE.md" << EOF
---
id: "$FEATURE_ID"
title: "Multi-Provider Sync Architecture"
type: "feature"
status: "completed"
projects: ["default"]
created: "2025-11-15"
---

# $FEATURE_ID: Multi-Provider Sync Architecture

## Overview

Feature for configuring and syncing SpecWeave increments with multiple external providers (GitHub, JIRA, Azure DevOps).

## User Stories

See project-specific user stories in \`specs/default/$FEATURE_ID/\`.

---

**Note**: This FEATURE.md was auto-generated during internal docs structure fix.
**Original increment**: 0017-sync-architecture-fix
EOF
  fi

  # Create basic README.md if it doesn't exist
  if [ ! -f "$INTERNAL_DOCS/specs/default/$FEATURE_ID/README.md" ]; then
    cat > "$INTERNAL_DOCS/specs/default/$FEATURE_ID/README.md" << EOF
# $FEATURE_ID: Multi-Provider Sync Architecture

**Project**: default
**Feature**: [$FEATURE_ID](../../_features/$FEATURE_ID/FEATURE.md)

## User Stories

- [US-001: Single Provider Setup (GitHub Only)](us-001-single-provider-setup-github-only.md)
- [US-002: Multi-Provider Setup (GitHub + Jira)](us-002-multi-provider-setup-github-jira.md)

---

**Note**: This README.md was auto-generated during internal docs structure fix.
EOF
  fi
fi

# Move user stories
move_file \
  "$INTERNAL_DOCS/strategy/us-us1-single-provider-setup-github-only.md" \
  "$INTERNAL_DOCS/specs/default/$FEATURE_ID/us-001-single-provider-setup-github-only.md" \
  "User stories belong in specs/, not strategy/ (strategy is 'Why', specs is 'What')"

move_file \
  "$INTERNAL_DOCS/strategy/us-us2-multi-provider-setup-github-jira.md" \
  "$INTERNAL_DOCS/specs/default/$FEATURE_ID/us-002-multi-provider-setup-github-jira.md" \
  "User stories belong in specs/, not strategy/ (strategy is 'Why', specs is 'What')"

echo "=================================================="
echo "SUMMARY"
echo "=================================================="
echo ""
echo "Total violations found: $VIOLATIONS"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}ℹ️  This was a DRY RUN (preview only)${NC}"
  echo ""
  echo "To apply fixes, run:"
  echo "  $0 --fix"
  echo ""
else
  echo -e "${GREEN}✅ Fixes applied successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Review changes:"
  echo "   tree -L 3 $INTERNAL_DOCS"
  echo ""
  echo "2. Validate structure:"
  echo "   find $INTERNAL_DOCS/{strategy,architecture,delivery,operations,governance} \\"
  echo "     -mindepth 1 -maxdepth 1 -type d ! -name '_*' | wc -l"
  echo "   (Expected: 0)"
  echo ""
  echo "3. Commit changes:"
  echo "   git add .specweave/docs/internal"
  echo "   git commit -m 'fix: correct internal docs structure (remove unauthorized subdirectories)'"
  echo ""
fi

exit 0
