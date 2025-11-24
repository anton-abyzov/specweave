#!/usr/bin/env bash
#
# validate-hook-variable-order.sh
#
# Validates that PROJECT_ROOT is defined BEFORE RECURSION_GUARD_FILE in all hooks.
# This prevents the critical bug where guard files are created at wrong paths.
#
# Exit codes:
#   0 - All hooks have correct variable order
#   1 - One or more hooks have incorrect variable order
#
# See: .specweave/increments/0051-*/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md
# See: ADR-0073: Hook Recursion Prevention Strategy
# See: CLAUDE.md Section 9a: Hook Variable Initialization Order (v0.26.1)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Hook Variable Order Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking that PROJECT_ROOT is defined BEFORE RECURSION_GUARD_FILE..."
echo ""

HOOKS_DIR="$PROJECT_ROOT/plugins/specweave/hooks"
FAILED=0
CHECKED=0

# Check all .sh files in hooks directory and lib subdirectory
for hook in "$HOOKS_DIR"/*.sh "$HOOKS_DIR"/lib/*.sh; do
  if [[ ! -f "$hook" ]]; then
    continue
  fi

  # Check if hook uses RECURSION_GUARD_FILE
  if ! grep -q "RECURSION_GUARD_FILE" "$hook"; then
    continue
  fi

  CHECKED=$((CHECKED + 1))
  hook_name=$(basename "$hook")

  # Find line numbers for PROJECT_ROOT and RECURSION_GUARD_FILE
  guard_line=$(grep -n "^RECURSION_GUARD_FILE=" "$hook" | head -1 | cut -d: -f1 || echo "")
  root_line=$(grep -n "^PROJECT_ROOT=" "$hook" | head -1 | cut -d: -f1 || echo "")

  # Validate
  if [[ -z "$guard_line" ]]; then
    echo "  ⚠️  $hook_name: Has RECURSION_GUARD_FILE but not as standalone assignment"
    continue
  fi

  if [[ -z "$root_line" ]]; then
    echo "  ❌ ERROR: $hook_name"
    echo "     Has RECURSION_GUARD_FILE (line $guard_line) but no PROJECT_ROOT assignment"
    echo "     This will cause guard file to be created at wrong path!"
    FAILED=$((FAILED + 1))
    continue
  fi

  if [[ $root_line -gt $guard_line ]]; then
    echo "  ❌ ERROR: $hook_name"
    echo "     PROJECT_ROOT (line $root_line) defined AFTER RECURSION_GUARD_FILE (line $guard_line)"
    echo "     Guard file will be created at wrong path: /.specweave/... instead of /full/path/.specweave/..."
    echo ""
    echo "     FIX: Move PROJECT_ROOT definition to BEFORE line $guard_line"
    echo ""
    FAILED=$((FAILED + 1))
  else
    echo "  ✅ $hook_name"
    echo "     PROJECT_ROOT: line $root_line"
    echo "     RECURSION_GUARD_FILE: line $guard_line"
    echo "     Order: CORRECT ✓"
    echo ""
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Hooks checked: $CHECKED"
echo "  Failed: $FAILED"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ❌ VALIDATION FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "One or more hooks have incorrect variable initialization order."
  echo "This WILL cause Claude Code crashes due to recursion guard bypass!"
  echo ""
  echo "See: .specweave/increments/0051-*/reports/PROJECT-ROOT-ORDER-BUG-2025-11-24.md"
  echo ""
  exit 1
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ✅ ALL HOOKS VALIDATED SUCCESSFULLY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "All $CHECKED hooks have correct variable initialization order."
  echo "PROJECT_ROOT is defined BEFORE RECURSION_GUARD_FILE in all cases."
  echo ""
  exit 0
fi
