#!/bin/bash
#
# EMERGENCY: Fix all hooks using dangerous set -e patterns
#
# Critical Safety Rule: Hooks MUST use set +e to prevent Claude Code crashes
# See: CLAUDE.md section 9a - Hook Performance & Safety
#
# This script:
# 1. Finds all hooks with set -e or set -euo pipefail
# 2. Replaces with set +e
# 3. Adds safety comment explaining why
# 4. Reports all changes

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚨 EMERGENCY: Fixing dangerous set -e patterns in hooks..."
echo ""

HOOKS_DIR="plugins/specweave/hooks"
FIXED_COUNT=0
TOTAL_COUNT=0

# Find all .sh files in hooks directory with set -e
while IFS= read -r file; do
  if [[ -f "$file" ]]; then
    TOTAL_COUNT=$((TOTAL_COUNT + 1))

    # Check if file has set -e pattern
    if grep -q '^set -e' "$file"; then
      echo "  🔧 Fixing: $file"

      # Create backup
      cp "$file" "$file.bak"

      # Replace set -euo pipefail with set +e
      sed -i.tmp 's/^set -euo pipefail$/set +e  # EMERGENCY FIX: Changed from set -euo pipefail to prevent Claude Code crashes/' "$file"

      # Replace set -e with set +e (for cases without pipefail)
      sed -i.tmp 's/^set -e$/set +e  # EMERGENCY FIX: Changed from set -e to prevent Claude Code crashes/' "$file"

      # Clean up temp file
      rm -f "$file.tmp"

      FIXED_COUNT=$((FIXED_COUNT + 1))
      echo "     ✅ Fixed (backup: $file.bak)"
    fi
  fi
done < <(find "$HOOKS_DIR" -name "*.sh" -type f)

echo ""
echo "📊 Summary:"
echo "   Total hooks scanned: $TOTAL_COUNT"
echo "   Hooks fixed: $FIXED_COUNT"
echo ""

if [[ $FIXED_COUNT -gt 0 ]]; then
  echo "✅ Emergency fix complete!"
  echo ""
  echo "⚠️  IMPORTANT: Test the hooks before committing:"
  echo "   1. npm run rebuild"
  echo "   2. Edit a task in tasks.md"
  echo "   3. Verify no crashes"
  echo "   4. Check .specweave/logs/hooks-debug.log"
  echo ""
  echo "📝 Backups created with .bak extension"
else
  echo "ℹ️  No dangerous patterns found - all hooks are safe!"
fi
