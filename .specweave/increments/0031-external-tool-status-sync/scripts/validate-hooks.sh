#!/bin/bash

# Hook Validation Script
# Quickly validates all SpecWeave hooks for common issues
#
# Usage: bash scripts/validate-hooks.sh
# Exit codes: 0 = success, 1 = validation failures detected

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/plugins/specweave/hooks"
ERRORS=0

echo "🔍 SpecWeave Hook Validation"
echo "============================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check compiled files exist
echo "📦 Checking compiled TypeScript files..."

REQUIRED_FILES=(
  "dist/src/core/increment/metadata-manager.js"
  "dist/src/core/deduplication/command-deduplicator.js"
  "dist/plugins/specweave/lib/hooks/sync-living-docs.js"
  "dist/plugins/specweave/lib/hooks/translate-living-docs.js"
  "dist/plugins/specweave/lib/hooks/update-tasks-md.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$PROJECT_ROOT/$file" ]]; then
    pass "$file exists"
  else
    fail "$file MISSING"
  fi
done

echo ""

# 2. Check for wrong paths (flattened structure)
echo "🔍 Checking for incorrect flattened paths..."

WRONG_PATHS=(
  "dist/cli/index.js"
  "dist/metrics/dora-calculator.js"
)

for file in "${WRONG_PATHS[@]}"; do
  if [[ -f "$PROJECT_ROOT/$file" ]]; then
    warn "$file exists (should be in dist/src/)"
  else
    pass "$file correctly absent (uses dist/src/)"
  fi
done

echo ""

# 3. Check hook scripts for wrong paths
echo "🔍 Scanning hook scripts for incorrect paths..."

HOOK_FILES=(
  "user-prompt-submit.sh"
  "pre-command-deduplication.sh"
  "post-task-completion.sh"
)

# Patterns that indicate wrong paths
WRONG_PATTERNS=(
  "dist/cli/index\.js"
  "dist/metrics/"
)

for hook in "${HOOK_FILES[@]}"; do
  if [[ ! -f "$HOOKS_DIR/$hook" ]]; then
    fail "$hook not found"
    continue
  fi

  FOUND_ISSUES=0
  for pattern in "${WRONG_PATTERNS[@]}"; do
    if grep -q "$pattern" "$HOOKS_DIR/$hook" 2>/dev/null; then
      # Check if it's in a comment or has correct context
      CONTEXT=$(grep "$pattern" "$HOOKS_DIR/$hook" | head -1)
      if ! echo "$CONTEXT" | grep -q "dist/src/" && ! echo "$CONTEXT" | grep -q "^#"; then
        warn "$hook contains '$pattern' (should use dist/src/)"
        FOUND_ISSUES=1
      fi
    fi
  done

  if [[ $FOUND_ISSUES -eq 0 ]]; then
    pass "$hook has correct paths"
  fi
done

echo ""

# 4. Test hook execution
echo "🧪 Testing hook execution..."

# Test user-prompt-submit
SAMPLE_INPUT='{"prompt":"/test","cwd":"'"$PROJECT_ROOT"'"}'
if OUTPUT=$(echo "$SAMPLE_INPUT" | bash "$HOOKS_DIR/user-prompt-submit.sh" 2>&1); then
  # Check if output is valid JSON
  if echo "$OUTPUT" | python3 -m json.tool > /dev/null 2>&1; then
    pass "user-prompt-submit.sh outputs valid JSON"
  else
    fail "user-prompt-submit.sh outputs invalid JSON"
    echo "   Output: $OUTPUT"
  fi
else
  fail "user-prompt-submit.sh failed to execute"
fi

# Test pre-command-deduplication
if OUTPUT=$(echo "$SAMPLE_INPUT" | bash "$HOOKS_DIR/pre-command-deduplication.sh" 2>&1); then
  if echo "$OUTPUT" | python3 -m json.tool > /dev/null 2>&1; then
    pass "pre-command-deduplication.sh outputs valid JSON"
  else
    fail "pre-command-deduplication.sh outputs invalid JSON"
    echo "   Output: $OUTPUT"
  fi
else
  fail "pre-command-deduplication.sh failed to execute"
fi

# Test post-task-completion (doesn't output JSON)
POST_INPUT='{"session_id":"test","cwd":"'"$PROJECT_ROOT"'","hook_event_name":"PostToolUse","tool_name":"TodoWrite","tool_input":{"todos":[]},"tool_response":{"oldTodos":[],"newTodos":[]}}'
if bash "$HOOKS_DIR/post-task-completion.sh" <<< "$POST_INPUT" > /dev/null 2>&1; then
  pass "post-task-completion.sh executes without errors"
else
  warn "post-task-completion.sh had warnings (check logs)"
fi

echo ""

# 5. Check hook permissions
echo "🔐 Checking hook permissions..."

for hook in "${HOOK_FILES[@]}"; do
  if [[ -x "$HOOKS_DIR/$hook" ]]; then
    pass "$hook is executable"
  else
    fail "$hook is NOT executable"
  fi
done

echo ""

# 6. Check syntax
echo "✅ Checking shell script syntax..."

for hook in "${HOOK_FILES[@]}"; do
  if bash -n "$HOOKS_DIR/$hook" 2>/dev/null; then
    pass "$hook has valid syntax"
  else
    fail "$hook has syntax errors"
  fi
done

echo ""

# 7. Check hooks.json
echo "📋 Checking hooks.json configuration..."

HOOKS_JSON="$HOOKS_DIR/hooks.json"
if [[ -f "$HOOKS_JSON" ]]; then
  if python3 -m json.tool "$HOOKS_JSON" > /dev/null 2>&1; then
    pass "hooks.json is valid JSON"
  else
    fail "hooks.json is invalid JSON"
  fi

  # Check required hooks are registered
  if grep -q "UserPromptSubmit" "$HOOKS_JSON"; then
    pass "UserPromptSubmit hook registered"
  else
    fail "UserPromptSubmit hook NOT registered"
  fi

  if grep -q "PostToolUse" "$HOOKS_JSON"; then
    pass "PostToolUse hook registered"
  else
    fail "PostToolUse hook NOT registered"
  fi
else
  fail "hooks.json not found"
fi

echo ""

# Summary
echo "================================"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}✓ All validations passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $ERRORS validation(s) failed${NC}"
  echo ""
  echo "💡 To fix path issues:"
  echo "   1. Run: npm run build"
  echo "   2. Check TypeScript compiles to dist/src/ (not dist/)"
  echo "   3. Update hook scripts to use correct paths"
  echo ""
  exit 1
fi
