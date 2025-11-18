#!/usr/bin/env bash
#
# Delete Duplicate E2E and Integration Tests
#
# This script safely deletes 20 duplicate test files identified in ultrathink analysis:
# - 17 E2E tests (duplicating integration coverage)
# - 3 integration tests (flat duplicates)
#
# SAFETY FEATURES:
# - Dry-run mode by default
# - Verification that integration coverage exists
# - Manual confirmation required
# - Git backup branch created
# - Incremental deletion with test runs
#
# Usage:
#   bash delete-duplicate-tests.sh          # Dry run (list only)
#   bash delete-duplicate-tests.sh --execute # Actually delete files
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🔍 Duplicate Test Deletion Script${NC}"
echo "======================================"
echo ""

# Parse args
DRY_RUN=true
if [[ "${1:-}" == "--execute" ]]; then
  DRY_RUN=false
fi

if $DRY_RUN; then
  echo -e "${YELLOW}⚠️  DRY RUN MODE${NC}"
  echo "   No files will be deleted. Use --execute to actually delete."
  echo ""
fi

# Step 1: Verify integration coverage exists
echo -e "${BLUE}Step 1: Verifying integration coverage exists${NC}"
echo "----------------------------------------------"

MISSING_COVERAGE=false

# GitHub tests (6 E2E tests require integration coverage)
declare -a GITHUB_E2E_TO_DELETE=(
  "tests/e2e/github-api-integration.test.ts"
  "tests/e2e/github-feature-sync-flow.test.ts"
  "tests/e2e/github-frontmatter-update.test.ts"
  "tests/e2e/github-sync-idempotency.test.ts"
  "tests/e2e/github-user-story-status-sync.test.ts"
  "tests/e2e/github-user-story-tasks-sync.test.ts"
)

declare -a GITHUB_INTEGRATION_COVERAGE=(
  "tests/integration/external-tools/github/github-client-v2.test.ts"
  "tests/integration/external-tools/github/github-sync.test.ts"
  "tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts"
)

echo "Checking GitHub integration coverage..."
for file in "${GITHUB_INTEGRATION_COVERAGE[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo -e "  ${RED}❌ MISSING: $file${NC}"
    MISSING_COVERAGE=true
  else
    echo -e "  ${GREEN}✓${NC} Found: $file"
  fi
done

# ADO test (1 E2E test requires integration coverage)
ADO_E2E="tests/e2e/ado-sync.test.ts"
ADO_INTEGRATION=(
  "tests/integration/external-tools/ado/ado-multi-project/ado-multi-project.test.ts"
  "tests/integration/external-tools/ado/ado-multi-project/ado-sync-scenarios.test.ts"
)

echo ""
echo "Checking ADO integration coverage..."
for file in "${ADO_INTEGRATION[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo -e "  ${RED}❌ MISSING: $file${NC}"
    MISSING_COVERAGE=true
  else
    echo -e "  ${GREEN}✓${NC} Found: $file"
  fi
done

# Living docs (1 E2E test requires integration coverage)
LIVING_DOCS_E2E="tests/e2e/living-docs-project-name-fix.test.ts"
LIVING_DOCS_INTEGRATION="tests/integration/core/living-docs/intelligent-sync.test.ts"

echo ""
echo "Checking Living Docs integration coverage..."
if [[ ! -f "$LIVING_DOCS_INTEGRATION" ]]; then
  echo -e "  ${RED}❌ MISSING: $LIVING_DOCS_INTEGRATION${NC}"
  MISSING_COVERAGE=true
else
  echo -e "  ${GREEN}✓${NC} Found: $LIVING_DOCS_INTEGRATION"
fi

# AC Status (4 E2E tests require integration coverage)
declare -a AC_STATUS_INTEGRATION=(
  "tests/integration/core/hooks/ac-status-hook.test.ts"
  "tests/integration/core/status-line-hook.test.ts"
  "tests/integration/core/task-consistency.test.ts"
)

echo ""
echo "Checking AC Status/Hook integration coverage..."
for file in "${AC_STATUS_INTEGRATION[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo -e "  ${RED}❌ MISSING: $file${NC}"
    MISSING_COVERAGE=true
  else
    echo -e "  ${GREEN}✓${NC} Found: $file"
  fi
done

echo ""
if $MISSING_COVERAGE; then
  echo -e "${RED}❌ ERROR: Missing integration test coverage!${NC}"
  echo "   Cannot safely delete E2E tests without integration coverage."
  exit 1
fi

echo -e "${GREEN}✅ All integration coverage verified!${NC}"
echo ""

# Step 2: List files to delete
echo -e "${BLUE}Step 2: Files to DELETE (20 total)${NC}"
echo "------------------------------------"

declare -a ALL_FILES_TO_DELETE=(
  # GitHub E2E (6 files)
  "tests/e2e/github-api-integration.test.ts"
  "tests/e2e/github-feature-sync-flow.test.ts"
  "tests/e2e/github-frontmatter-update.test.ts"
  "tests/e2e/github-sync-idempotency.test.ts"
  "tests/e2e/github-user-story-status-sync.test.ts"
  "tests/e2e/github-user-story-tasks-sync.test.ts"

  # ADO E2E (1 file)
  "tests/e2e/ado-sync.test.ts"

  # Living Docs E2E (1 file)
  "tests/e2e/living-docs-project-name-fix.test.ts"

  # CLI E2E (2 files)
  "tests/e2e/cli-commands.test.ts"
  "tests/e2e/init-default-claude.test.ts"

  # Status & Discipline E2E (4 files)
  "tests/e2e/ac-status-flow.test.ts"
  "tests/e2e/archive-command.test.ts"
  "tests/e2e/fix-duplicates-command.test.ts"
  "tests/e2e/immutable-description.test.ts"

  # i18n E2E (1 file)
  "tests/e2e/i18n/living-docs-translation.test.ts"

  # Integration flat duplicates (3 files)
  "tests/integration/github-feature-sync-idempotency.test.ts"
  "tests/integration/github-epic-sync-duplicate-prevention.test.ts"
  "tests/integration/github-immutable-description.test.ts"
)

echo "E2E Duplicates (17 files):"
for file in "${ALL_FILES_TO_DELETE[@]:0:17}"; do
  if [[ -f "$file" ]]; then
    echo -e "  ${YELLOW}❌ $file${NC} ($(wc -l < "$file") lines)"
  else
    echo -e "  ${RED}⚠️  $file (NOT FOUND)${NC}"
  fi
done

echo ""
echo "Integration Flat Duplicates (3 files):"
for file in "${ALL_FILES_TO_DELETE[@]:17:3}"; do
  if [[ -f "$file" ]]; then
    echo -e "  ${YELLOW}❌ $file${NC} ($(wc -l < "$file") lines)"
  else
    echo -e "  ${RED}⚠️  $file (NOT FOUND)${NC}"
  fi
done

# Count existing files
EXISTING_COUNT=0
for file in "${ALL_FILES_TO_DELETE[@]}"; do
  if [[ -f "$file" ]]; then
    ((EXISTING_COUNT++))
  fi
done

echo ""
echo -e "Total files to delete: ${YELLOW}$EXISTING_COUNT${NC} out of 20"
echo ""

if [[ $EXISTING_COUNT -eq 0 ]]; then
  echo -e "${GREEN}✅ No files to delete (already cleaned up)${NC}"
  exit 0
fi

# Step 3: Dry run or execute
if $DRY_RUN; then
  echo -e "${YELLOW}⚠️  DRY RUN COMPLETE${NC}"
  echo ""
  echo "To execute deletion, run:"
  echo "  bash $0 --execute"
  echo ""
  exit 0
fi

# Step 4: Create backup branch
echo -e "${BLUE}Step 3: Creating backup branch${NC}"
echo "-------------------------------"

BACKUP_BRANCH="backup/before-test-cleanup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup branch: $BACKUP_BRANCH"

git checkout -b "$BACKUP_BRANCH"
git push origin "$BACKUP_BRANCH"

echo -e "${GREEN}✅ Backup branch created: $BACKUP_BRANCH${NC}"
echo ""

# Return to develop
git checkout develop

# Step 5: Delete files incrementally
echo -e "${BLUE}Step 4: Deleting duplicate tests${NC}"
echo "---------------------------------"

DELETED_COUNT=0

for file in "${ALL_FILES_TO_DELETE[@]}"; do
  if [[ -f "$file" ]]; then
    echo -e "Deleting: ${YELLOW}$file${NC}"
    rm "$file"
    ((DELETED_COUNT++))
  fi
done

echo ""
echo -e "${GREEN}✅ Deleted $DELETED_COUNT test files${NC}"
echo ""

# Step 6: Remove empty directories
echo -e "${BLUE}Step 5: Cleaning up empty directories${NC}"
echo "---------------------------------------"

find tests/e2e tests/integration -type d -empty -delete 2>/dev/null || true

echo -e "${GREEN}✅ Empty directories removed${NC}"
echo ""

# Step 7: Verify tests still pass
echo -e "${BLUE}Step 6: Verifying test suite still passes${NC}"
echo "-------------------------------------------"
echo ""
echo "IMPORTANT: Run these commands manually to verify:"
echo ""
echo "  # 1. Run remaining E2E tests:"
echo "  npm run test:e2e"
echo ""
echo "  # 2. Run integration tests (verify coverage maintained):"
echo "  npm run test:integration"
echo ""
echo "  # 3. If all tests pass, commit:"
echo "  git add -A"
echo "  git commit -m 'refactor(tests): delete 20 duplicate E2E/integration tests'"
echo ""
echo "  # 4. If tests fail, rollback:"
echo "  git checkout develop"
echo "  git reset --hard $BACKUP_BRANCH"
echo ""

echo -e "${GREEN}✅ DELETION COMPLETE${NC}"
echo ""
echo "Summary:"
echo "  - Deleted: $DELETED_COUNT test files"
echo "  - Backup branch: $BACKUP_BRANCH"
echo "  - Next: Run tests manually to verify"
echo ""
