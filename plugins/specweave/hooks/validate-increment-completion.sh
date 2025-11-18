#!/bin/bash
#
# Pre-commit hook: Validate Increment Completion
#
# Prevents commits where increment status="completed" but:
# - Acceptance criteria are still open (- [ ] **AC-...)
# - Tasks are still pending (**Status**: [ ] pending)
#
# This prevents false completion and data integrity violations.
#
# Exit code 0: All completed increments are valid (allow commit)
# Exit code 1: Invalid completion detected (block commit)

# ANSI colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if in SpecWeave project
if [ ! -d ".specweave/increments" ]; then
  # Not a SpecWeave project, skip validation
  exit 0
fi

# Track if any validation failures found
has_failures=false

# Check all increments
for increment_dir in .specweave/increments/*/; do
  # Skip if not a directory
  [ ! -d "$increment_dir" ] && continue

  increment_id=$(basename "$increment_dir")
  spec_file="$increment_dir/spec.md"
  tasks_file="$increment_dir/tasks.md"
  metadata_file="$increment_dir/metadata.json"

  # Skip if required files don't exist
  [ ! -f "$spec_file" ] && continue
  [ ! -f "$tasks_file" ] && continue

  # Get status from spec.md frontmatter
  spec_status=$(grep -m1 "^status:" "$spec_file" 2>/dev/null | cut -d: -f2 | tr -d ' ')

  # Get status from metadata.json (if exists)
  metadata_status=""
  if [ -f "$metadata_file" ]; then
    metadata_status=$(grep -m1 '"status"' "$metadata_file" 2>/dev/null | cut -d'"' -f4)
  fi

  # Only validate if status is "completed"
  if [ "$spec_status" = "completed" ] || [ "$metadata_status" = "completed" ]; then
    # Count open acceptance criteria (- [ ] **AC-)
    open_acs=$(grep -c "^- \[ \] \*\*AC-" "$spec_file" 2>/dev/null || echo 0)

    # Count pending tasks (**Status**: [ ] pending)
    pending_tasks=$(grep -ic "\*\*Status\*\*:\s*\[\s*\]\s*pending" "$tasks_file" 2>/dev/null || echo 0)

    # Validate
    if [ "$open_acs" -gt 0 ] || [ "$pending_tasks" -gt 0 ]; then
      has_failures=true

      echo -e "${RED}❌ COMMIT BLOCKED: Invalid completion detected${NC}"
      echo -e "${YELLOW}Increment: $increment_id${NC}"
      echo -e "Status: $spec_status (spec.md) / $metadata_status (metadata.json)"
      echo ""

      if [ "$open_acs" -gt 0 ]; then
        echo -e "${RED}  • $open_acs acceptance criteria still open${NC}"
      fi

      if [ "$pending_tasks" -gt 0 ]; then
        echo -e "${RED}  • $pending_tasks tasks still pending${NC}"
      fi

      echo ""
      echo -e "${YELLOW}Fix options:${NC}"
      echo "  1. Complete the open work before committing"
      echo "  2. Change status to 'active' or 'paused' in both spec.md and metadata.json"
      echo ""
      echo -e "${YELLOW}To see details:${NC}"
      echo "  cat $spec_file | grep '- \[ \] \*\*AC-'"
      echo "  cat $tasks_file | grep -i 'Status.*pending'"
      echo ""
    fi
  fi
done

# Exit with failure if any validation failures
if [ "$has_failures" = true ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}COMMIT BLOCKED: Cannot commit increments with invalid completion${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}Why this matters:${NC}"
  echo "  • Prevents false completion (status='completed' with open work)"
  echo "  • Ensures data integrity (metadata matches reality)"
  echo "  • Stops misleading status line and GitHub sync"
  echo ""
  echo -e "${YELLOW}To fix:${NC}"
  echo "  1. Complete all open ACs and pending tasks, OR"
  echo "  2. Change status to 'active'/'paused' in spec.md and metadata.json"
  echo ""
  echo -e "${YELLOW}To bypass (NOT RECOMMENDED):${NC}"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

# All validations passed
echo -e "${GREEN}✅ Completion validation passed${NC}"
exit 0
