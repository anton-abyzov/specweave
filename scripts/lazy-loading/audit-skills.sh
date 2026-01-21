#!/bin/bash
#
# Audit Skills for Line Count and Context Forking Status
#
# This script analyzes all SKILL.md files and generates a report showing:
# - Line counts per skill
# - Skills over 200 lines (candidates for forking)
# - Current context forking status
#
# Usage: bash scripts/lazy-loading/audit-skills.sh

set -e

PLUGINS_DIR="$(dirname "$0")/../../plugins"
THRESHOLD=200

echo "=========================================="
echo "SpecWeave Skills Audit Report"
echo "=========================================="
echo ""
echo "Date: $(date)"
echo "Threshold: ${THRESHOLD} lines"
echo ""

# Count total skills
TOTAL_SKILLS=$(find "${PLUGINS_DIR}" -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
echo "Total Skills: ${TOTAL_SKILLS}"

# Count skills over threshold
OVER_THRESHOLD=$(find "${PLUGINS_DIR}" -name "SKILL.md" -exec wc -l {} \; 2>/dev/null | awk -v t="${THRESHOLD}" '$1 > t {count++} END {print count+0}')
echo "Skills over ${THRESHOLD} lines: ${OVER_THRESHOLD}"

# Count skills with context forking
FORKED=$(find "${PLUGINS_DIR}" -name "SKILL.md" -exec grep -l "context.*fork" {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "Skills with context forking: ${FORKED}"

echo ""
echo "=========================================="
echo "Skills Over ${THRESHOLD} Lines (Top 30)"
echo "=========================================="
echo ""
printf "%-8s %-50s %s\n" "Lines" "Skill Path" "Forked?"
printf "%-8s %-50s %s\n" "------" "--------------------------------------------------" "-------"

find "${PLUGINS_DIR}" -name "SKILL.md" -exec sh -c '
  for file do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt '"${THRESHOLD}"' ]; then
      # Check if skill has context forking
      if grep -q "context.*fork" "$file" 2>/dev/null; then
        status="Yes"
      else
        status="No"
      fi
      # Extract skill name from path
      skillpath=$(echo "$file" | sed "s|.*/plugins/||" | sed "s|/SKILL.md||")
      printf "%-8d %-50s %s\n" "$lines" "$skillpath" "$status"
    fi
  done
' sh {} + 2>/dev/null | sort -rn | head -30

echo ""
echo "=========================================="
echo "Skills Needing Context Forking"
echo "=========================================="
echo "(Over ${THRESHOLD} lines but no context: fork)"
echo ""

find "${PLUGINS_DIR}" -name "SKILL.md" -exec sh -c '
  for file do
    lines=$(wc -l < "$file")
    if [ "$lines" -gt '"${THRESHOLD}"' ]; then
      if ! grep -q "context.*fork" "$file" 2>/dev/null; then
        skillpath=$(echo "$file" | sed "s|.*/plugins/||" | sed "s|/SKILL.md||")
        printf "%-8d %s\n" "$lines" "$skillpath"
      fi
    fi
  done
' sh {} + 2>/dev/null | sort -rn

echo ""
echo "=========================================="
echo "Recommendations"
echo "=========================================="
echo ""
echo "1. Priority 1: Skills >500 lines should definitely use context forking"
echo "2. Priority 2: Skills 200-500 lines should consider context forking"
echo "3. Skills <200 lines are fine without forking"
echo ""
echo "To add context forking to a skill, add these lines to the YAML frontmatter:"
echo ""
echo "---"
echo "context: fork"
echo "model: opus    # Optional: use specific model"
echo "---"
echo ""
