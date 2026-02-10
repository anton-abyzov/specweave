#!/usr/bin/env bash
# read-grill-context.sh - Load increment context for /sw:grill code review
#
# Executed by UserPromptSubmit hook when /sw:grill is detected.
# Outputs structured context + review instructions that get injected
# into the LLM's conversation via additionalContext.
#
# Usage: bash read-grill-context.sh [incrementId]
#
# If no incrementId given, auto-detects from active-increment.json.
# Supports partial ID matching (e.g., "0042" matches "0042-auth-feature").
#
# Compatible with bash 3.x (macOS default)

set -e

INCREMENT_ID="${1:-}"

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  echo "No SpecWeave project found (missing .specweave/)"
  exit 1
fi

INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
STATE_DIR="$PROJECT_ROOT/.specweave/state"

# Auto-detect active increment if no ID given
if [[ -z "$INCREMENT_ID" ]]; then
  if [[ -f "$STATE_DIR/active-increment.json" ]] && command -v jq >/dev/null 2>&1; then
    INCREMENT_ID=$(jq -r '.ids[0] // empty' "$STATE_DIR/active-increment.json" 2>/dev/null)
  fi

  if [[ -z "$INCREMENT_ID" ]]; then
    echo "No increment ID provided and no active increment found."
    echo "Usage: /sw:grill <incrementId>"
    exit 1
  fi
fi

# Find increment folder (exact or partial match)
FOUND_DIR=""
if [[ -d "$INCREMENTS_DIR/$INCREMENT_ID" ]]; then
  FOUND_DIR="$INCREMENTS_DIR/$INCREMENT_ID"
else
  # Partial match
  for dir in "$INCREMENTS_DIR"/[0-9]*/; do
    dirname=$(basename "$dir")
    if [[ "$dirname" == "$INCREMENT_ID"* ]]; then
      FOUND_DIR="${dir%/}"  # Strip trailing slash from glob
      INCREMENT_ID="$dirname"
      break
    fi
  done
fi

if [[ -z "$FOUND_DIR" ]] || [[ ! -d "$FOUND_DIR" ]]; then
  echo "Increment not found: ${1:-$INCREMENT_ID}"
  exit 1
fi

# Read metadata
STATUS="unknown"
TYPE="feature"
PRIORITY="P1"
if [[ -f "$FOUND_DIR/metadata.json" ]] && command -v jq >/dev/null 2>&1; then
  STATUS=$(jq -r '.status // "unknown"' "$FOUND_DIR/metadata.json" 2>/dev/null)
  TYPE=$(jq -r '.type // "feature"' "$FOUND_DIR/metadata.json" 2>/dev/null)
  PRIORITY=$(jq -r '.priority // "P1"' "$FOUND_DIR/metadata.json" 2>/dev/null)
fi

# Count tasks
# NOTE: grep -c exits 1 on zero matches but still outputs "0".
# Using || true prevents set -e from killing the script without doubling output.
TASK_TOTAL=0
TASK_COMPLETED=0
TASK_PCT=0
if [[ -f "$FOUND_DIR/tasks.md" ]]; then
  TASK_TOTAL=$(grep -c '### T-[0-9]' "$FOUND_DIR/tasks.md" 2>/dev/null) || true
  TASK_COMPLETED=$(grep -ci '\*\*Status\*\*:\s*\[x\]' "$FOUND_DIR/tasks.md" 2>/dev/null) || true
  [[ -z "$TASK_TOTAL" ]] && TASK_TOTAL=0
  [[ -z "$TASK_COMPLETED" ]] && TASK_COMPLETED=0
  if [[ "$TASK_TOTAL" -gt 0 ]]; then
    TASK_PCT=$((TASK_COMPLETED * 100 / TASK_TOTAL))
  fi
fi

# Count ACs from spec.md
AC_TOTAL=0
AC_COMPLETED=0
AC_PCT=0
if [[ -f "$FOUND_DIR/spec.md" ]]; then
  AC_TOTAL=$(grep -cE '^\s*- \[[ x]\] \*\*AC-' "$FOUND_DIR/spec.md" 2>/dev/null) || true
  AC_COMPLETED=$(grep -cE '^\s*- \[x\] \*\*AC-' "$FOUND_DIR/spec.md" 2>/dev/null) || true
  [[ -z "$AC_TOTAL" ]] && AC_TOTAL=0
  [[ -z "$AC_COMPLETED" ]] && AC_COMPLETED=0
  if [[ "$AC_TOTAL" -gt 0 ]]; then
    AC_PCT=$((AC_COMPLETED * 100 / AC_TOTAL))
  fi
fi

# Output structured grill context
cat <<GRILL_CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRILL MODE ACTIVATED — ${INCREMENT_ID}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXT:
  Status: ${STATUS} | Type: ${TYPE} | Priority: ${PRIORITY}
  Tasks: ${TASK_COMPLETED}/${TASK_TOTAL} (${TASK_PCT}%)
  ACs:   ${AC_COMPLETED}/${AC_TOTAL} (${AC_PCT}%)

INCREMENT FILES:
  spec.md:  ${FOUND_DIR}/spec.md
  tasks.md: ${FOUND_DIR}/tasks.md
  plan.md:  ${FOUND_DIR}/plan.md

INSTRUCTIONS — You are now in GRILL MODE. Act as a demanding senior engineer:

1. Read the increment's spec.md to understand WHAT should have been built
2. Read tasks.md to understand WHAT was done
3. Find all changed files:
   git diff --name-only \$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD develop 2>/dev/null || echo HEAD~10)..HEAD 2>/dev/null
   If git is not available, read the tasks for file references.
4. For EACH significant changed file, check:
   - Correctness: Does it satisfy the ACs? Edge cases? Null handling?
   - Security: Injection? XSS? Auth bypass? Secrets in code?
   - Performance: O(n²)? N+1 queries? Memory leaks? Blocking ops?
   - Maintainability: God functions? Magic numbers? Inconsistent patterns?
5. Categorize every issue found:
   BLOCKER  — Production will break, MUST fix
   CRITICAL — Security/data risk, MUST fix
   MAJOR    — Significant gap, should fix
   MINOR    — Code quality, can fix later
   SUGGESTION — Nice to have improvement

OUTPUT FORMAT:
  For each issue: [{SEVERITY}] Title | File:line | Problem | Fix
  End with: VERDICT: PASS (no blockers/criticals) or FAIL (has blockers/criticals)

If FAIL: List blocking issues and stop. Do NOT proceed with /sw:done.
If PASS: Code is ready for closure.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GRILL_CONTEXT
