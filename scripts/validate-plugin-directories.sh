#!/usr/bin/env bash
#
# Validate Plugin Structure
# Detects and reports invalid plugin configurations:
# - Empty agent/skill directories
# - Missing AGENT.md or SKILL.md files
# - Duplicate definitions (same name in agents/ and skills/)
#
# Usage: bash scripts/validate-plugin-structure.sh
# Exit codes: 0 = success, 1 = validation errors found
#
# Compatible with bash 3.2+ (works on macOS without Homebrew)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "🔍 Validating plugin structure..."
echo ""

# Colors for output (works in bash 3.2+)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for empty agent directories
echo "📂 Checking agent directories..."
for plugin_dir in "$REPO_ROOT"/plugins/specweave*/agents/*/; do
  if [ -d "$plugin_dir" ]; then
    agent_name=$(basename "$plugin_dir")
    plugin_name=$(basename "$(dirname "$(dirname "$plugin_dir")")")

    # Check if directory is empty (only contains . and ..)
    file_count=$(find "$plugin_dir" -maxdepth 1 -type f | wc -l | tr -d ' ')

    if [ "$file_count" -eq 0 ]; then
      echo -e "${RED}❌ EMPTY AGENT: $plugin_name/agents/$agent_name${NC}"
      echo "   Directory exists but contains no files (no AGENT.md)"
      ERRORS=$((ERRORS + 1))
    else
      # Check for AGENT.md specifically
      if [ ! -f "$plugin_dir/AGENT.md" ]; then
        echo -e "${YELLOW}⚠️  MISSING AGENT.md: $plugin_name/agents/$agent_name${NC}"
        echo "   Files exist but no AGENT.md found"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
done

# Check for empty skill directories
echo ""
echo "📂 Checking skill directories..."
for plugin_dir in "$REPO_ROOT"/plugins/specweave*/skills/*/; do
  if [ -d "$plugin_dir" ]; then
    skill_name=$(basename "$plugin_dir")
    plugin_name=$(basename "$(dirname "$(dirname "$plugin_dir")")")

    # Skip SKILLS-INDEX.md which is a file, not a directory
    if [ "$skill_name" = "SKILLS-INDEX.md" ]; then
      continue
    fi

    # Check if directory is empty
    file_count=$(find "$plugin_dir" -maxdepth 1 -type f | wc -l | tr -d ' ')

    if [ "$file_count" -eq 0 ]; then
      echo -e "${RED}❌ EMPTY SKILL: $plugin_name/skills/$skill_name${NC}"
      echo "   Directory exists but contains no files (no SKILL.md)"
      ERRORS=$((ERRORS + 1))
    else
      # Check for SKILL.md specifically
      if [ ! -f "$plugin_dir/SKILL.md" ]; then
        echo -e "${YELLOW}⚠️  MISSING SKILL.md: $plugin_name/skills/$skill_name${NC}"
        echo "   Files exist but no SKILL.md found"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
done

# Check for duplicate agent/skill names (informational)
echo ""
echo "📂 Checking for duplicate agent/skill names..."

# Collect all agent names (bash 3.2 compatible)
> "$TEMP_DIR/agent_names.txt"
for plugin_dir in "$REPO_ROOT"/plugins/specweave*/agents/*/; do
  if [ -d "$plugin_dir" ] && [ -f "$plugin_dir/AGENT.md" ]; then
    agent_name=$(basename "$plugin_dir")
    plugin_name=$(basename "$(dirname "$(dirname "$plugin_dir")")")
    echo "$agent_name|$plugin_name/agents/$agent_name" >> "$TEMP_DIR/agent_names.txt"
  fi
done

# Collect all skill names and check for duplicates
DUPLICATE_COUNT=0
for plugin_dir in "$REPO_ROOT"/plugins/specweave*/skills/*/; do
  if [ -d "$plugin_dir" ] && [ -f "$plugin_dir/SKILL.md" ]; then
    skill_name=$(basename "$plugin_dir")
    plugin_name=$(basename "$(dirname "$(dirname "$plugin_dir")")")

    # Check if same name exists as agent
    if grep -q "^$skill_name|" "$TEMP_DIR/agent_names.txt" 2>/dev/null; then
      agent_path=$(grep "^$skill_name|" "$TEMP_DIR/agent_names.txt" | cut -d'|' -f2)
      echo -e "${YELLOW}ℹ️  DUAL DEFINITION: $skill_name${NC}"
      echo "   Agent: $agent_path (Task tool)"
      echo "   Skill: $plugin_name/skills/$skill_name (Skill tool)"
      echo "   This is a valid pattern: skill for docs/help, agent for execution"
      DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
    fi
  fi
done

if [ $DUPLICATE_COUNT -gt 0 ]; then
  echo ""
  echo "Note: Dual agent/skill definitions are intentional when:"
  echo "  - Skill provides documentation/reference material"
  echo "  - Agent provides execution/implementation"
  echo "  Use Task tool for agents, Skill tool or slash commands for skills"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ VALIDATION PASSED!${NC}"
  echo "   No empty directories or duplicate names found."
  exit 0
else
  echo -e "${RED}❌ VALIDATION FAILED!${NC}"
  echo "   Found $ERRORS issue(s)."
  echo ""
  echo "How to fix:"
  echo "1. Empty directories: Remove with 'rmdir <path>' or add required .md file"
  echo "2. Missing SKILL.md: Either add SKILL.md with YAML frontmatter, or remove directory"
  echo ""
  echo "Note: Dual agent/skill definitions (ℹ️  above) are OK and intentional!"
  echo ""
  exit 1
fi
