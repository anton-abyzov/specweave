#!/bin/bash
#
# Pre-Increment-Start Hook
#
# Validates increment readiness before allowing `/specweave:do` to start work.
#
# **Critical Checks**:
# 1. spec.md contains Acceptance Criteria
# 2. AC count matches metadata.json
# 3. No duplicate task files (tasks.md, tasks-detailed.md)
# 4. Increment structure is valid
#
# **Triggered by**: /specweave:do command (before starting implementation)
#
# **Exit codes**:
# - 0: Validation passed, safe to start
# - 1: Validation failed, BLOCK start
#
# **See**: ADR-0062 (AC Embedding Architecture)
#

set -euo pipefail

# Get increment path from environment or argument
INCREMENT_PATH="${1:-}"

if [ -z "$INCREMENT_PATH" ]; then
  echo "❌ Error: INCREMENT_PATH not provided"
  echo "Usage: $0 <increment-path>"
  exit 1
fi

if [ ! -d "$INCREMENT_PATH" ]; then
  echo "❌ Error: Increment path not found: $INCREMENT_PATH"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PRE-START VALIDATION: $(basename "$INCREMENT_PATH")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VALIDATION_PASSED=true

# Check 1: spec.md exists
if [ ! -f "$INCREMENT_PATH/spec.md" ]; then
  echo "❌ CRITICAL: spec.md not found"
  VALIDATION_PASSED=false
fi

# Check 2: Acceptance Criteria section exists
if [ -f "$INCREMENT_PATH/spec.md" ]; then
  if ! grep -q "## Acceptance Criteria" "$INCREMENT_PATH/spec.md"; then
    echo "❌ CRITICAL: spec.md missing '## Acceptance Criteria' section"
    echo ""
    echo "   spec.md MUST contain inline Acceptance Criteria for AC sync to work."
    echo "   Even when using 'structure: user-stories', ACs must be embedded in spec.md."
    echo ""
    echo "   💡 SUGGESTED FIX:"
    echo "      Run: /specweave:embed-acs $(basename "$INCREMENT_PATH")"
    echo ""
    VALIDATION_PASSED=false
  fi
fi

# Check 3: Count ACs in spec.md
AC_COUNT=0
if [ -f "$INCREMENT_PATH/spec.md" ]; then
  AC_COUNT=$(grep -cE "^- \[[x ]\] \*\*AC-US[0-9]+-[0-9]+\*\*:" "$INCREMENT_PATH/spec.md" || true)
fi

if [ "$AC_COUNT" -eq 0 ]; then
  echo "❌ CRITICAL: spec.md contains 0 Acceptance Criteria"
  echo ""
  echo "   Cannot start increment with no ACs defined."
  echo ""
  echo "   💡 SUGGESTED FIX:"
  echo "      1. Add ACs manually to spec.md, OR"
  echo "      2. Run: /specweave:embed-acs $(basename "$INCREMENT_PATH") (auto-embed from living docs)"
  echo ""
  VALIDATION_PASSED=false
else
  echo "✅ Acceptance Criteria: $AC_COUNT ACs found in spec.md"
fi

# Check 4: Validate AC count matches metadata.json
if [ -f "$INCREMENT_PATH/metadata.json" ]; then
  EXPECTED_AC_COUNT=$(jq -r '.total_acs // 0' "$INCREMENT_PATH/metadata.json")

  if [ "$EXPECTED_AC_COUNT" -ne "$AC_COUNT" ]; then
    echo "⚠️  WARNING: AC count mismatch"
    echo "   spec.md: $AC_COUNT ACs"
    echo "   metadata.json: $EXPECTED_AC_COUNT ACs"
    echo ""
    echo "   This may cause status line desyncs."
    echo ""
    # Don't block, just warn (metadata.json may be stale)
  else
    echo "✅ AC Count: Matches metadata.json ($EXPECTED_AC_COUNT ACs)"
  fi
fi

# Check 5: No duplicate task files
TASK_FILES=$(find "$INCREMENT_PATH" -maxdepth 1 -name "tasks*.md" -type f | wc -l)
if [ "$TASK_FILES" -gt 1 ]; then
  echo "❌ CRITICAL: Multiple task files detected (MUST be only ONE tasks.md)"
  find "$INCREMENT_PATH" -maxdepth 1 -name "tasks*.md" -type f -exec basename {} \;
  echo ""
  echo "   💡 SUGGESTED FIX:"
  echo "      Keep tasks.md, move others to reports/ directory"
  echo ""
  VALIDATION_PASSED=false
else
  echo "✅ Structure: Single tasks.md file (no duplicates)"
fi

# Check 6: Validate frontmatter for 'structure: user-stories' pattern
if [ -f "$INCREMENT_PATH/spec.md" ]; then
  if grep -q "structure: user-stories" "$INCREMENT_PATH/spec.md"; then
    if [ "$AC_COUNT" -eq 0 ]; then
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "🚨 CRITICAL ARCHITECTURE VIOLATION"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo ""
      echo "spec.md uses 'structure: user-stories' but contains NO inline ACs."
      echo ""
      echo "**Why this is critical**:"
      echo "  - AC sync hooks expect ACs in spec.md (not living docs)"
      echo "  - Without inline ACs, status line will show 0% completion"
      echo "  - Tasks-to-AC traceability will be broken"
      echo ""
      echo "**Architecture requirement (ADR-0062)**:"
      echo "  spec.md is ALWAYS the source of truth for ACs,"
      echo "  even when living docs exist as documentation layer."
      echo ""
      echo "**IMMEDIATE ACTION REQUIRED**:"
      echo "  Run: /specweave:embed-acs $(basename "$INCREMENT_PATH")"
      echo ""
      echo "This will auto-embed ACs from living docs into spec.md."
      echo ""
      VALIDATION_PASSED=false
    else
      echo "✅ Living Docs Structure: ACs properly embedded in spec.md"
    fi
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$VALIDATION_PASSED" = true ]; then
  echo "✅ PRE-START VALIDATION: PASSED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Increment is ready to start. Proceeding with /specweave:do..."
  exit 0
else
  echo "❌ PRE-START VALIDATION: FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Cannot start increment due to validation failures above."
  echo ""
  echo "Fix the issues and try again, or run validation manually:"
  echo "  /specweave:validate $(basename "$INCREMENT_PATH")"
  echo ""
  exit 1
fi
