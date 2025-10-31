#!/bin/bash
# Install SpecWeave hooks to .claude/hooks/
#
# Usage:
#   bash bin/install-hooks.sh          # Install to .claude/hooks/ (project)
#   bash bin/install-hooks.sh --global # Install to ~/.claude/hooks/ (global)

set -e

HOOKS_SRC="src/hooks"
HOOKS_DEST=".claude/hooks"

# Parse arguments
if [ "$1" = "--global" ]; then
  HOOKS_DEST="$HOME/.claude/hooks"
  echo "Installing hooks globally to $HOOKS_DEST"
else
  echo "Installing hooks to project: $HOOKS_DEST"
fi

# Create destination if not exists
mkdir -p "$HOOKS_DEST"

# Check if source exists
if [ ! -d "$HOOKS_SRC" ]; then
  echo "❌ Error: $HOOKS_SRC directory not found"
  exit 1
fi

# Count hooks
hook_count=0

# Copy all hook files
for hook_file in "$HOOKS_SRC"/*.sh; do
  if [ -f "$hook_file" ]; then
    hook_name=$(basename "$hook_file")
    echo "  🪝 Installing hook: $hook_name"
    cp "$hook_file" "$HOOKS_DEST/"
    # Make executable
    chmod +x "$HOOKS_DEST/$hook_name"
    hook_count=$((hook_count + 1))
  fi
done

# Copy README.md if it exists
if [ -f "$HOOKS_SRC/README.md" ]; then
  echo "  📄 Installing hooks documentation"
  cp "$HOOKS_SRC/README.md" "$HOOKS_DEST/"
fi

echo ""
echo "✅ Installed $hook_count hooks to $HOOKS_DEST"
echo ""
echo "Hooks installed:"
ls -1 "$HOOKS_DEST"/*.sh 2>/dev/null | xargs -n 1 basename | sed 's/^/  - /'
echo ""
echo "Hooks activate automatically based on Claude Code events"
