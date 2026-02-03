#!/bin/bash
# Migrate plugin commands to skills format
# Commands: plugins/specweave/commands/X.md -> Skills: plugins/specweave/skills/X/SKILL.md

set -e

COMMANDS_DIR="plugins/specweave/commands"
SKILLS_DIR="plugins/specweave/skills"

# Count files
total=$(ls -1 "$COMMANDS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
echo "Found $total command files to migrate"

migrated=0
skipped=0

for cmd_file in "$COMMANDS_DIR"/*.md; do
    # Get command name (without .md extension)
    cmd_name=$(basename "$cmd_file" .md)

    # Target skill directory
    skill_dir="$SKILLS_DIR/$cmd_name"
    skill_file="$skill_dir/SKILL.md"

    # Check if skill already exists
    if [ -d "$skill_dir" ]; then
        echo "SKIP: $cmd_name (skill already exists)"
        ((skipped++))
        continue
    fi

    # Create skill directory
    mkdir -p "$skill_dir"

    # Copy command content to SKILL.md
    cp "$cmd_file" "$skill_file"

    echo "MIGRATED: $cmd_name -> $skill_dir/SKILL.md"
    ((migrated++))
done

echo ""
echo "Migration complete!"
echo "  Migrated: $migrated"
echo "  Skipped (already exist): $skipped"
echo ""
echo "Next steps:"
echo "  1. Review migrated skills"
echo "  2. Delete old commands: rm -rf $COMMANDS_DIR"
echo "  3. Test with: claude -p '/sw:progress'"
