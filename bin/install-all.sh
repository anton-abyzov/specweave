#!/bin/bash
# Install all SpecWeave agents, skills, and commands
#
# Usage:
#   bash bin/install-all.sh          # Install to .claude/ (project)
#   bash bin/install-all.sh --global # Install to ~/.claude/ (global)

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SpecWeave Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Pass arguments to subscripts
INSTALL_MODE="$1"

# Install agents
echo "📦 Installing Agents..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash bin/install-agents.sh $INSTALL_MODE

echo ""

# Install skills
echo "🔧 Installing Skills..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash bin/install-skills.sh $INSTALL_MODE

echo ""

# Install commands (only project-local, not global)
if [ "$INSTALL_MODE" != "--global" ]; then
  echo "⚡ Installing Slash Commands..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  bash bin/install-commands.sh
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SpecWeave installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code to load agents, skills, and commands"
echo "  2. Try: 'Create a product vision for X' (activates PM agent)"
echo "  3. Try: 'Plan implementation for feature Y' (activates feature-planner skill)"
echo "  4. Try: '/create-project' to bootstrap a new project"
echo ""
