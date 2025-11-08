#!/bin/bash
# Install SpecWeave agents to .claude/agents/
#
# Usage:
#   bash bin/install-agents.sh          # Install to .claude/agents/ (project)
#   bash bin/install-agents.sh --global # Install to ~/.claude/agents/ (global)

set -e

AGENTS_SRC="plugins/specweave/agents"
AGENTS_DEST=".claude/agents"

# Parse arguments
if [ "$1" = "--global" ]; then
  AGENTS_DEST="$HOME/.claude/agents"
  echo "Installing agents globally to $AGENTS_DEST"
else
  echo "Installing agents to project: $AGENTS_DEST"
fi

# Create destination if not exists
mkdir -p "$AGENTS_DEST"

# Check if source exists
if [ ! -d "$AGENTS_SRC" ]; then
  echo "❌ Error: $AGENTS_SRC directory not found"
  exit 1
fi

# Count agents
agent_count=0

# Copy all agents
for agent in "$AGENTS_SRC"/*; do
  if [ -d "$agent" ]; then
    agent_name=$(basename "$agent")

    # Check if agent has AGENT.md or README.md
    if [ -f "$agent/AGENT.md" ] || [ -f "$agent/README.md" ]; then
      echo "  📦 Installing agent: $agent_name"
      # Create destination directory and copy contents (not the folder itself)
      mkdir -p "$AGENTS_DEST/$agent_name"
      cp -r "$agent"/* "$AGENTS_DEST/$agent_name/"
      agent_count=$((agent_count + 1))
    else
      echo "  ⚠️  Skipping $agent_name (no AGENT.md or README.md)"
    fi
  fi
done

echo ""
echo "✅ Installed $agent_count agents to $AGENTS_DEST"
echo ""
echo "Agents installed:"
ls -1 "$AGENTS_DEST" | sed 's/^/  - /'
echo ""
echo "To use agents, invoke via Task tool with subagent_type parameter"
