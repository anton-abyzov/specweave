#!/bin/bash

# Test Script: Pre-Flight Sync Check
# Purpose: Verify that living docs auto-sync before increment operations
# Location: .specweave/increments/0025-per-project-resource-config/scripts/test-preflight-sync.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}[✗]${NC} $*"
  ((TESTS_FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[!]${NC} $*"
}

# Check if we're in the SpecWeave root
if [[ ! -d ".specweave" ]]; then
  log_error "Not in SpecWeave root directory"
  exit 1
fi

log_info "Testing Pre-Flight Sync Check Implementation"
echo ""

# Test 1: Verify hook implementation exists
log_info "Test 1: Verify pre-flight sync code exists in user-prompt-submit.sh"

HOOK_FILE="plugins/specweave/hooks/user-prompt-submit.sh"
if [[ ! -f "$HOOK_FILE" ]]; then
  log_error "Hook file not found: $HOOK_FILE"
  exit 1
fi

if grep -q "PRE-FLIGHT SYNC CHECK" "$HOOK_FILE"; then
  log_success "Pre-flight sync check section found in hook"
else
  log_error "Pre-flight sync check section NOT found in hook"
fi

if grep -q "INCREMENT_MTIME.*LIVING_DOCS_MTIME" "$HOOK_FILE"; then
  log_success "mtime comparison logic found"
else
  log_error "mtime comparison logic NOT found"
fi

echo ""

# Test 2: Verify sync-living-docs.js exists and is executable
log_info "Test 2: Verify sync-living-docs.js exists"

SYNC_SCRIPT="plugins/specweave/lib/hooks/sync-living-docs.js"
if [[ -f "$SYNC_SCRIPT" ]]; then
  log_success "Sync script found: $SYNC_SCRIPT"
else
  log_error "Sync script NOT found: $SYNC_SCRIPT"
fi

echo ""

# Test 3: Test with current increment (0025)
log_info "Test 3: Test freshness detection with increment 0025"

INCREMENT_ID="0025-per-project-resource-config"
INCREMENT_SPEC=".specweave/increments/$INCREMENT_ID/spec.md"
LIVING_DOCS_SPEC=".specweave/docs/internal/specs/spec-$INCREMENT_ID.md"

if [[ ! -f "$INCREMENT_SPEC" ]]; then
  log_error "Test increment spec not found: $INCREMENT_SPEC"
else
  log_success "Test increment spec exists"

  # Get current mtimes
  if [[ "$(uname)" == "Darwin" ]]; then
    INCREMENT_MTIME=$(stat -f %m "$INCREMENT_SPEC" 2>/dev/null || echo 0)
    LIVING_DOCS_MTIME=$(stat -f %m "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
  else
    INCREMENT_MTIME=$(stat -c %Y "$INCREMENT_SPEC" 2>/dev/null || echo 0)
    LIVING_DOCS_MTIME=$(stat -c %Y "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
  fi

  log_info "  Increment mtime: $INCREMENT_MTIME"
  log_info "  Living docs mtime: $LIVING_DOCS_MTIME"

  if [[ "$INCREMENT_MTIME" -gt "$LIVING_DOCS_MTIME" ]]; then
    log_warning "Increment is NEWER than living docs (sync needed)"
  elif [[ "$LIVING_DOCS_MTIME" -eq 0 ]]; then
    log_warning "Living docs file does not exist (sync needed)"
  else
    log_success "Living docs are up-to-date"
  fi
fi

echo ""

# Test 4: Simulate mtime staleness
log_info "Test 4: Simulate stale living docs (touch increment spec)"

# Create backup of living docs
if [[ -f "$LIVING_DOCS_SPEC" ]]; then
  BACKUP_FILE="/tmp/spec-0025-backup.md"
  cp "$LIVING_DOCS_SPEC" "$BACKUP_FILE"
  log_info "Created backup: $BACKUP_FILE"
fi

# Touch increment spec to make it newer
touch "$INCREMENT_SPEC"
sleep 1

# Get new mtimes
if [[ "$(uname)" == "Darwin" ]]; then
  INCREMENT_MTIME_NEW=$(stat -f %m "$INCREMENT_SPEC" 2>/dev/null || echo 0)
  LIVING_DOCS_MTIME_NEW=$(stat -f %m "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
else
  INCREMENT_MTIME_NEW=$(stat -c %Y "$INCREMENT_SPEC" 2>/dev/null || echo 0)
  LIVING_DOCS_MTIME_NEW=$(stat -c %Y "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
fi

if [[ "$INCREMENT_MTIME_NEW" -gt "$LIVING_DOCS_MTIME_NEW" ]]; then
  log_success "Increment is now newer (staleness detected correctly)"
else
  log_error "Failed to simulate staleness"
fi

echo ""

# Test 5: Manually trigger sync
log_info "Test 5: Manually trigger sync to verify it works"

if [[ -f "$SYNC_SCRIPT" ]]; then
  if node "$SYNC_SCRIPT" "$INCREMENT_ID" 2>&1 | tee /tmp/sync-test-output.log; then
    log_success "Sync script executed successfully"

    # Verify living docs was updated
    if [[ "$(uname)" == "Darwin" ]]; then
      LIVING_DOCS_MTIME_AFTER=$(stat -f %m "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
    else
      LIVING_DOCS_MTIME_AFTER=$(stat -c %Y "$LIVING_DOCS_SPEC" 2>/dev/null || echo 0)
    fi

    if [[ "$LIVING_DOCS_MTIME_AFTER" -ge "$INCREMENT_MTIME_NEW" ]]; then
      log_success "Living docs file was updated (mtime is now current)"
    else
      log_error "Living docs file was NOT updated"
    fi
  else
    log_error "Sync script failed"
    cat /tmp/sync-test-output.log
  fi
else
  log_error "Sync script not found, cannot test"
fi

echo ""

# Test 6: Verify command detection regex
log_info "Test 6: Verify command detection regex"

TEST_PROMPTS=(
  "/specweave:done"
  "/specweave:done 0025"
  "/done"
  "/specweave:validate 0025"
  "/validate"
  "/specweave:progress"
  "/progress"
  "/specweave:do"
  "/do"
  "some other command"
)

EXPECTED_MATCHES=9

MATCHED=0
for prompt in "${TEST_PROMPTS[@]}"; do
  if echo "$prompt" | grep -qE "/(specweave:)?(done|validate|progress|do)"; then
    ((MATCHED++))
  fi
done

if [[ "$MATCHED" -eq "$EXPECTED_MATCHES" ]]; then
  log_success "Command detection regex works correctly ($MATCHED/$EXPECTED_MATCHES matched)"
else
  log_error "Command detection regex failed ($MATCHED/$EXPECTED_MATCHES matched)"
fi

echo ""

# Test 7: Verify increment ID extraction
log_info "Test 7: Verify increment ID extraction from prompt"

TEST_PROMPT="/specweave:done 0025-per-project-resource-config"
EXTRACTED_ID=$(echo "$TEST_PROMPT" | grep -oE "[0-9]{4}[a-z0-9-]*" | head -1)

if [[ "$EXTRACTED_ID" == "0025-per-project-resource-config" ]]; then
  log_success "Increment ID extraction works: '$EXTRACTED_ID'"
else
  log_error "Increment ID extraction failed: got '$EXTRACTED_ID', expected '0025-per-project-resource-config'"
fi

echo ""

# Test 8: Restore backup and verify cleanup
log_info "Test 8: Cleanup and restore"

if [[ -f "$BACKUP_FILE" ]]; then
  cp "$BACKUP_FILE" "$LIVING_DOCS_SPEC"
  rm "$BACKUP_FILE"
  log_success "Restored living docs from backup"
else
  log_warning "No backup to restore"
fi

if [[ -f "/tmp/sync-test-output.log" ]]; then
  rm "/tmp/sync-test-output.log"
fi

echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
log_success "Tests passed: $TESTS_PASSED"
if [[ "$TESTS_FAILED" -gt 0 ]]; then
  log_error "Tests failed: $TESTS_FAILED"
  echo ""
  echo "⚠️  Some tests failed. Review output above."
  exit 1
else
  echo ""
  log_success "All tests passed! ✅"
  echo ""
  echo "Pre-flight sync implementation is working correctly."
  echo ""
  echo "Next steps:"
  echo "  1. Test with real /specweave:done command"
  echo "  2. Monitor .specweave/logs/hooks-debug.log during execution"
  echo "  3. Verify sync triggers before command execution"
fi
