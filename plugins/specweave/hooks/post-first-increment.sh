#!/usr/bin/env bash
# SpecWeave Post-First-Increment Hook
#
# Triggers after the first increment is completed
# Congratulates the user on completing their first increment
#
# NON-INTERACTIVE: Just shows a message (hooks run in background)

set -euo pipefail

# Get project root (where .specweave/ lives)
PROJECT_ROOT="$(pwd)"

# Check if .specweave directory exists
if [ ! -d ".specweave" ]; then
  # Not in SpecWeave project, skip
  exit 0
fi

# Check if this is the first increment completion
# Count completed increments in .specweave/increments/
COMPLETED_COUNT=0
if [ -d ".specweave/increments" ]; then
  # Count directories that have COMPLETION-REPORT.md or completion metadata
  for inc_dir in .specweave/increments/[0-9][0-9][0-9][0-9]-*/; do
    if [ -d "$inc_dir" ]; then
      if [ -f "${inc_dir}reports/COMPLETION-REPORT.md" ] || \
         [ -f "${inc_dir}COMPLETION-SUMMARY.md" ] || \
         ([ -f "${inc_dir}metadata.json" ] && grep -q '"status".*"completed"' "${inc_dir}metadata.json" 2>/dev/null); then
        COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
      fi
    fi
  done
fi

# Only trigger on first completion
if [ "$COMPLETED_COUNT" -ne 1 ]; then
  exit 0
fi

# Show congratulations message (non-interactive)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Congratulations! You completed your first increment!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Your increment has been documented in:"
echo "   .specweave/increments/[increment-id]/"
echo ""
echo "📚 View your documentation:"
echo "   - Specs: .specweave/docs/internal/specs/"
echo "   - Architecture: .specweave/docs/internal/architecture/"
echo ""
echo "🚀 Next steps:"
echo "   - Review your increment: /specweave:status"
echo "   - Start next increment: /specweave:increment \"feature name\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
