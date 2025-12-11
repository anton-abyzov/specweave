#!/bin/bash

# SpecWeave Commands Installation Script
# Installs all slash commands from commands/ (core) and plugins/*/commands/ (plugins)

set -e

COMMANDS_SRC="plugins/specweave/commands"
COMMANDS_DEST=".claude/commands"

echo "════════════════════════════════════════════════════════"
echo "  Installing SpecWeave Slash Commands"
echo "════════════════════════════════════════════════════════"
echo ""

# Create destination directory
mkdir -p "$COMMANDS_DEST"

# ───────────────────────────────────────────────────────────
# Part 1: Install Core Commands
# ───────────────────────────────────────────────────────────
echo "📦 Installing core commands..."
echo ""

core_count=0

for cmd_file in "$COMMANDS_SRC"/*.md; do
  if [ -f "$cmd_file" ]; then
    # Extract command name (filename without .md)
    cmd_name=$(basename "$cmd_file" .md)

    # Copy to .claude/commands/
    cp "$cmd_file" "$COMMANDS_DEST/${cmd_name}.md"

    echo "✅ Core: /$cmd_name"
    ((core_count++))
  fi
done

echo ""
echo "Installed $core_count core commands"
echo ""

# ───────────────────────────────────────────────────────────
# Part 2: Install Plugin Commands
# ───────────────────────────────────────────────────────────
echo "🔌 Installing plugin commands..."
echo ""

plugin_count=0

for plugin_dir in plugins/*/; do
  if [ -d "$plugin_dir" ]; then
    # Extract plugin name (remove specweave- prefix if present)
    plugin_name=$(basename "$plugin_dir" | sed 's/^specweave-//')

    if [ -d "$plugin_dir/commands" ]; then
      echo "   Plugin: $plugin_name"

      for cmd_file in "$plugin_dir/commands"/*.md; do
        if [ -f "$cmd_file" ]; then
          cmd_name=$(basename "$cmd_file" .md)
          # Prefix with specweave.plugin-name.
          dest_name="specweave.${plugin_name}.${cmd_name}.md"

          cp "$cmd_file" "$COMMANDS_DEST/$dest_name"
          echo "   ✅ Plugin: /$dest_name"
          ((plugin_count++))
        fi
      done
    fi
  fi
done

echo ""
echo "Installed $plugin_count plugin commands"
echo ""

# ───────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo "  Installation Complete"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Total: $((core_count + plugin_count)) commands installed"
echo "  - Core: $core_count commands"
echo "  - Plugins: $plugin_count commands"
echo ""
echo "Available plugins:"
for plugin_dir in plugins/*/; do
  if [ -d "$plugin_dir" ]; then
    plugin_name=$(basename "$plugin_dir")
    echo "  - $plugin_name"
  fi
done
echo ""

echo "Usage: Type /command-name in Claude Code"
echo ""
echo "Examples:"
echo "  /specweave inc \"user authentication\""
echo "  /specweave do"
echo "  /sw:github:create-issue 0001"
echo "  /sw:github:sync 0001"
echo ""

exit 0
