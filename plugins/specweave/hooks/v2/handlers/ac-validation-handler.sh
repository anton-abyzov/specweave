#!/bin/bash
# ac-validation-handler.sh - Validate AC completion status
# Checks that completed tasks have their ACs checked in spec.md
# Non-blocking, logs warnings only
set +e

INC_ID="${1:-}"
[[ -z "$INC_ID" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

INC_DIR="$PROJECT_ROOT/.specweave/increments/$INC_ID"
TASKS_FILE="$INC_DIR/tasks.md"
SPEC_FILE="$INC_DIR/spec.md"
LOG_FILE="$PROJECT_ROOT/.specweave/logs/ac-validation.log"

[[ ! -f "$TASKS_FILE" ]] || [[ ! -f "$SPEC_FILE" ]] && exit 0

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

# Find completed tasks and their ACs
WARNINGS=""
while IFS= read -r line; do
  if [[ "$line" =~ ^\*\*Satisfies\ ACs\*\*:\ (.+)$ ]]; then
    ACS="${BASH_REMATCH[1]}"
    # Check each AC
    for ac in $(echo "$ACS" | tr ',' ' '); do
      ac=$(echo "$ac" | tr -d ' ')
      [[ -z "$ac" ]] && continue
      # Check if AC is checked in spec.md
      if ! grep -qE "^\s*-\s*\[x\]\s*\*\*${ac}\*\*" "$SPEC_FILE" 2>/dev/null; then
        WARNINGS="$WARNINGS\n  - $ac not checked in spec.md"
      fi
    done
  fi
done < <(grep -A5 "\[x\] completed" "$TASKS_FILE" 2>/dev/null | grep "Satisfies ACs")

if [[ -n "$WARNINGS" ]]; then
  echo "[$(date)] $INC_ID: AC validation warnings:$WARNINGS" >> "$LOG_FILE"
fi
exit 0
