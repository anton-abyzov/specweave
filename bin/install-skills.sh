#!/bin/bash
# Install SpecWeave skills to .claude/skills/
#
# Usage:
#   bash bin/install-skills.sh          # Install to .claude/skills/ (project)
#   bash bin/install-skills.sh --global # Install to ~/.claude/skills/ (global)

set -e

SKILLS_SRC="src/skills"
SKILLS_DEST=".claude/skills"

# Parse arguments
if [ "$1" = "--global" ]; then
  SKILLS_DEST="$HOME/.claude/skills"
  echo "Installing skills globally to $SKILLS_DEST"
else
  echo "Installing skills to project: $SKILLS_DEST"
fi

# Create destination if not exists
mkdir -p "$SKILLS_DEST"

# Check if source exists
if [ ! -d "$SKILLS_SRC" ]; then
  echo "❌ Error: $SKILLS_SRC directory not found"
  exit 1
fi

# Count skills
skill_count=0

# Copy all skills
for skill in "$SKILLS_SRC"/*; do
  if [ -d "$skill" ]; then
    skill_name=$(basename "$skill")

    # Check if skill has SKILL.md
    if [ -f "$skill/SKILL.md" ]; then
      echo "  🔧 Installing skill: $skill_name"
      # Create destination directory and copy contents (not the folder itself)
      mkdir -p "$SKILLS_DEST/$skill_name"
      cp -r "$skill"/* "$SKILLS_DEST/$skill_name/"
      skill_count=$((skill_count + 1))
    else
      echo "  ⚠️  Skipping $skill_name (no SKILL.md)"
    fi
  fi
done

echo ""
echo "✅ Installed $skill_count skills to $SKILLS_DEST"
echo ""
echo "Skills installed:"
ls -1 "$SKILLS_DEST" | sed 's/^/  - /'
echo ""
echo "Skills activate automatically based on their descriptions"
