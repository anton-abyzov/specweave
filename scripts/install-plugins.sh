#!/bin/bash
#
# Install SpecWeave Plugins to .claude/plugins/
#
# This script copies plugins from src/plugins/ to .claude/plugins/
# following Claude Code's native plugin structure.
#
# Usage:
#   bash scripts/install-plugins.sh
#   npm run install:plugins

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_PLUGINS="$PROJECT_ROOT/src/plugins"
DEST_PLUGINS="$PROJECT_ROOT/.claude/plugins"

echo "📦 Installing SpecWeave Plugins"
echo ""

# Ensure destination exists
mkdir -p "$DEST_PLUGINS"

# Function to install a plugin
install_plugin() {
  local plugin_name=$1
  local src_dir="$SRC_PLUGINS/$plugin_name"
  local dest_dir="$DEST_PLUGINS/$plugin_name"

  if [ ! -d "$src_dir" ]; then
    echo "⚠️  Plugin $plugin_name not found in src/plugins/"
    return
  fi

  echo "Installing $plugin_name..."

  # Remove existing installation
  if [ -d "$dest_dir" ]; then
    rm -rf "$dest_dir"
  fi

  # Copy plugin
  cp -r "$src_dir" "$dest_dir"

  # Verify manifest exists
  if [ ! -f "$dest_dir/.claude-plugin/plugin.json" ]; then
    echo "   ❌ Missing plugin.json manifest!"
    return 1
  fi

  echo "   ✅ Installed $plugin_name"
}

# Install core plugin (always required)
install_plugin "specweave"

# Install GitHub plugin (priority #1)
install_plugin "specweave-github"

# Install UI plugin
install_plugin "specweave-ui"

# TODO: Install other plugins as they're created
# install_plugin "specweave-backend-node"
# install_plugin "specweave-backend-python"
# install_plugin "specweave-devops"
# install_plugin "specweave-ml"
# install_plugin "specweave-payments"

echo ""
echo "✅ Plugin installation complete!"
echo ""
echo "Installed plugins:"
ls -1 "$DEST_PLUGINS" 2>/dev/null || echo "   (none)"
echo ""
echo "📍 Location: .claude/plugins/"
echo "🔄 Restart Claude Code to load plugins"
