#!/bin/bash
# Install SpecWeave skills to .claude/skills/
#
# Usage:
#   bash bin/install-skills.sh          # Install to .claude/skills/ (project)
#   bash bin/install-skills.sh --global # Install to ~/.claude/skills/ (global)

set -e

SKILLS_SRC="plugins/specweave/skills"
SKILLS_DEST=".claude/skills"
BACKUP_DIR=".memory-backups"

# Parse arguments
if [ "$1" = "--global" ]; then
  SKILLS_DEST="$HOME/.claude/skills"
  BACKUP_DIR="$HOME/.memory-backups"
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
merge_count=0
backup_count=0

# Copy all skills with smart MEMORY.md merge
for skill in "$SKILLS_SRC"/*; do
  if [ -d "$skill" ]; then
    skill_name=$(basename "$skill")

    # Check if skill has SKILL.md
    if [ -f "$skill/SKILL.md" ]; then
      echo "  🔧 Installing skill: $skill_name"
      mkdir -p "$SKILLS_DEST/$skill_name"

      # Copy files with special handling for MEMORY.md
      for file in "$skill"/*; do
        filename=$(basename "$file")
        target_file="$SKILLS_DEST/$skill_name/$filename"

        # Special handling for MEMORY.md
        if [ "$filename" = "MEMORY.md" ] && [ -f "$target_file" ]; then
          echo "    🔀 Merging MEMORY.md (preserving user learnings)"

          # Create backup directory
          mkdir -p "$BACKUP_DIR"

          # Create timestamped backup
          timestamp=$(date +%Y%m%d-%H%M%S)
          backup_file="$BACKUP_DIR/${skill_name}-MEMORY-${timestamp}.md"
          cp "$target_file" "$backup_file"
          backup_count=$((backup_count + 1))
          echo "    💾 Backup: $backup_file"

          # Merge using CLI script
          if node scripts/merge-skill-memory.js "$target_file" "$file" "$target_file" 2>&1 | sed 's/^/       /'; then
            merge_count=$((merge_count + 1))
          else
            echo "    ⚠️  Merge failed, user memory preserved"
          fi
        else
          # Copy file normally
          cp "$file" "$target_file"
        fi
      done

      skill_count=$((skill_count + 1))
    else
      echo "  ⚠️  Skipping $skill_name (no SKILL.md)"
    fi
  fi
done

# Cleanup: Keep only last 10 backups per skill
if [ -d "$BACKUP_DIR" ]; then
  for skill_name in $(ls -1 "$SKILLS_DEST"); do
    # Count backups for this skill
    backup_pattern="${skill_name}-MEMORY-*.md"
    backup_files=$(ls -1t "$BACKUP_DIR"/$backup_pattern 2>/dev/null || true)
    backup_file_count=$(echo "$backup_files" | grep -c "^" || echo "0")

    # If more than 10, remove oldest
    if [ "$backup_file_count" -gt 10 ]; then
      echo "  🗑️  Pruning old backups for $skill_name"
      echo "$backup_files" | tail -n +11 | xargs rm -f
    fi
  done
fi

echo ""
echo "✅ Installed $skill_count skills to $SKILLS_DEST"
if [ $merge_count -gt 0 ]; then
  echo "   🔀 Merged $merge_count MEMORY.md files (user learnings preserved)"
  echo "   💾 Created $backup_count backup(s) in $BACKUP_DIR"
fi
echo ""
echo "Skills installed:"
ls -1 "$SKILLS_DEST" | sed 's/^/  - /'
echo ""
echo "Skills activate automatically based on their descriptions"
