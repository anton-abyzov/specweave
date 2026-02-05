#!/bin/bash
#
# Pre-commit check: Prevent `name:` field in SKILL.md and command frontmatter
#
# The `name:` field in YAML frontmatter causes Claude Code to strip the plugin
# namespace prefix (e.g., `/sw:grill` becomes `/grill`), breaking slash commands.
#
# Skill/command names are derived automatically from directory/file names.
#
# Incident Reference: 2026-02-05 - All 90+ skills lost prefix, commands not invocable
#

# Get staged SKILL.md and command .md files
staged_skills=$(git diff --cached --name-only --diff-filter=ACM | grep -E '(SKILL\.md|plugins/.*/commands/.*\.md)' || true)

if [ -z "$staged_skills" ]; then
  exit 0
fi

found_issues=0

for file in $staged_skills; do
  # Extract YAML frontmatter (between first --- and second ---)
  # Use awk to get content between first two --- delimiters
  frontmatter=$(awk '/^---$/{c++;next}c==1{print}c==2{exit}' "$file")

  if [ -z "$frontmatter" ]; then
    continue
  fi

  # Check if frontmatter contains name: field (at start of line)
  if echo "$frontmatter" | grep -qE '^name:'; then
    if [ $found_issues -eq 0 ]; then
      echo ""
      echo "🚨 ═══════════════════════════════════════════════════════════════"
      echo "🚨  ERROR: name: field found in SKILL/command frontmatter!"
      echo "🚨 ═══════════════════════════════════════════════════════════════"
      echo ""
      echo "  The name: field strips the plugin namespace prefix in Claude Code."
      echo "  Example: /sw:grill becomes /grill (BROKEN!)"
      echo ""
    fi
    echo "  ❌ $file"
    found_issues=$((found_issues + 1))
  fi
done

if [ $found_issues -gt 0 ]; then
  echo ""
  echo "  Fix: Remove name: from YAML frontmatter in the files above."
  echo "  Names are derived from directory (skills) or filename (commands)."
  echo ""
  echo "  ⚠️  To bypass: git commit --no-verify"
  echo ""
  echo "🚨 ═══════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

exit 0
