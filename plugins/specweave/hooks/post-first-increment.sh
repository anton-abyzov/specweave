#!/usr/bin/env bash
# SpecWeave Post-First-Increment Hook
#
# Triggers after the first increment is completed
# Suggests docs-preview plugin for internal documentation
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

# Check if docs-preview plugin is already installed
PLUGIN_INSTALLED=false
if command -v claude &> /dev/null; then
  if claude plugin list --installed 2>/dev/null | grep -q "specweave-docs-preview"; then
    PLUGIN_INSTALLED=true
  fi
fi

# If already installed, skip suggestion
if [ "$PLUGIN_INSTALLED" = true ]; then
  exit 0
fi

# Show suggestion (non-interactive message)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Congratulations! You completed your first increment!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Preview your documentation in a beautiful UI?"
echo ""
echo "The specweave-docs-preview plugin can generate a Docusaurus site from"
echo "your .specweave/docs/ folder with:"
echo ""
echo "   ✓ Auto-generated sidebar from folder structure"
echo "   ✓ Hot reload (edit markdown, see changes instantly)"
echo "   ✓ Mermaid diagram rendering"
echo "   ✓ Priority sorting (Strategy → Specs → Architecture → ...)"
echo ""
echo "📦 Install with:"
echo "   /plugin install specweave-docs-preview"
echo ""
echo "🚀 Then launch:"
echo "   /specweave:docs preview"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
