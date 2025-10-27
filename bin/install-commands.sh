#!/bin/bash

# SpecWeave Commands Installation Script
# Installs all slash commands from src/templates/commands/ to .claude/commands/

set -e

COMMANDS_SRC="src/templates/commands"
COMMANDS_DEST=".claude/commands"

echo "════════════════════════════════════════════════════════"
echo "  Installing SpecWeave Slash Commands"
echo "════════════════════════════════════════════════════════"
echo ""

# Create destination directory
mkdir -p "$COMMANDS_DEST"

# Copy all .md files from templates/commands/
installed_count=0

for cmd_file in "$COMMANDS_SRC"/*.md; do
  if [ -f "$cmd_file" ]; then
    # Extract command name (filename without .md)
    cmd_name=$(basename "$cmd_file" .md)

    # Copy to .claude/commands/
    cp "$cmd_file" "$COMMANDS_DEST/${cmd_name}.md"

    echo "✅ Installed: /$cmd_name"
    ((installed_count++))
  fi
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Installation Complete"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Installed $installed_count commands:"
echo ""

# List all installed commands
ls -1 "$COMMANDS_DEST" | sed 's/.md$//' | sed 's/^/  \//'

echo ""
echo "Usage: Type /command-name in Claude Code"
echo ""
echo "Examples:"
echo "  /create-project"
echo "  /create-increment \"user authentication\""
echo "  /review-docs"
echo "  /sync-github"
echo ""

exit 0
