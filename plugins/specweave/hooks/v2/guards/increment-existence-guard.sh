#!/bin/bash
# increment-existence-guard.sh - Mode-aware guard for team creation
#
# PURPOSE:
# Enforces spec-first principle for IMPLEMENTATION teams while allowing
# non-implementation teams (review, brainstorm, analysis) to proceed freely.
#
# MODES:
# - implementation (default): Requires increment with substantive spec.md
# - review: PR reviews, code audits, architecture reviews — no increment needed
# - brainstorm: Multi-perspective ideation sessions — no increment needed
# - analysis: Codebase research, exploration, audits — no increment needed
# - research: Codebase investigation and web research — no increment needed
# - plan: Parallel planning with PM + Architect — creates its own increment
#
# MODE DETECTION (in priority order):
# 1. team_name prefix: review-*, brainstorm-*, analysis-*, audit-*, research-*, plan-*
# 2. description keywords: "review", "brainstorm", "analyze", "audit", "explore",
#    "ideate", "research", "planning", "pr #", "pull request", "code review",
#    "architecture review"
# 3. Default: implementation mode (requires increment)
#
# DETECTION (implementation mode only):
# - Fires on TeamCreate tool calls (global via hooks.json + skill-scoped via frontmatter)
# - Scans .specweave/increments/ and repositories/*/*/.specweave/increments/
# - Requires spec.md to pass ALL checks:
#   1. File exists and has >500 bytes of content
#   2. No template markers (exact strings or {{VAR}} patterns)
#   3. At least one acceptance criterion (AC- pattern)
# - BLOCKS if no qualifying increment found
# - ALLOWS if at least one passes all checks
#
# @since 1.0.342
# @updated 1.0.417 — multi-mode support

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')

# Only check TeamCreate
if [[ "$TOOL_NAME" != "TeamCreate" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# Env var bypass — allows team creation without increment (e.g. specweave team --no-increment)
if [[ "${SPECWEAVE_NO_INCREMENT:-}" == "1" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# --- MODE DETECTION ---
# Extract team_name and description from the tool input
TEAM_NAME=$(echo "$INPUT" | jq -r '.tool_input.team_name // .input.team_name // ""' 2>/dev/null)
DESCRIPTION=$(echo "$INPUT" | jq -r '.tool_input.description // .input.description // ""' 2>/dev/null)

# Lowercase for matching
TEAM_NAME_LC=$(echo "$TEAM_NAME" | tr '[:upper:]' '[:lower:]')
DESCRIPTION_LC=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]')

# Check 1: team_name prefix
NON_IMPL_MODE=false
case "$TEAM_NAME_LC" in
  review-*|brainstorm-*|analysis-*|audit-*|explore-*|ideate-*|research-*|plan-*)
    NON_IMPL_MODE=true
    ;;
esac

# Check 2: description keywords (only if prefix didn't match)
if [[ "$NON_IMPL_MODE" == "false" ]]; then
  NON_IMPL_KEYWORDS=(
    "review"
    "brainstorm"
    "analyze"
    "audit"
    "explore"
    "ideate"
    "pull request"
    "pr #"
    "pr review"
    "code review"
    "architecture review"
    "security audit"
    "performance audit"
    "code audit"
    "ideation"
    "exploration"
    "research"
    "planning"
    "perspectives"
    "devil's advocate"
    "pros and cons"
  )

  for keyword in "${NON_IMPL_KEYWORDS[@]}"; do
    if [[ "$DESCRIPTION_LC" == *"$keyword"* ]]; then
      NON_IMPL_MODE=true
      break
    fi
  done
fi

# Non-implementation modes bypass the spec check entirely
if [[ "$NON_IMPL_MODE" == "true" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# --- IMPLEMENTATION MODE: Require increment with spec ---

# Template markers — spec.md with these is a template, not a real spec
TEMPLATE_MARKERS=(
  "[Story Title]"
  "[user type]"
  "[goal]"
  "[benefit]"
  "[Specific, testable criterion]"
  "[Component 1]"
  "[High-level description"
  "{{RESOLVED_PROJECT}}"
  "TEMPLATE FILE"
)

check_spec() {
  local spec_path="$1"
  if [[ ! -f "$spec_path" ]]; then
    return 1
  fi

  # Check 1: Minimum size (500 bytes — a real spec with user stories and ACs)
  local size
  size=$(wc -c < "$spec_path" 2>/dev/null || echo "0")
  size=$(echo "$size" | tr -d '[:space:]')
  if [[ "$size" -le 500 ]]; then
    return 1
  fi

  # Check 2: Scan FULL file for template markers (not just first 10 lines)
  local content
  content=$(cat "$spec_path" 2>/dev/null || echo "")

  # Exact template marker strings
  for marker in "${TEMPLATE_MARKERS[@]}"; do
    if [[ "$content" == *"$marker"* ]]; then
      return 1
    fi
  done

  # Regex: {{UPPERCASE_VAR}} mustache placeholders (e.g., {{FEATURE_NAME}})
  if echo "$content" | grep -qE '\{\{[A-Z_]+\}\}' 2>/dev/null; then
    return 1
  fi

  # Regex: High count of [Bracket Placeholders] suggests unfilled template
  # (threshold: 4+ to avoid false positives from markdown links [text](url))
  local bracket_count
  bracket_count=$(echo "$content" | grep -cE '\[[A-Z][^]]{2,}\]' 2>/dev/null || true)
  bracket_count=$(echo "$bracket_count" | tail -1 | tr -d '[:space:]')
  if [[ -n "$bracket_count" ]] && [[ "$bracket_count" -ge 4 ]]; then
    return 1
  fi

  # Check 3: Structural completeness — at least one acceptance criterion
  if ! grep -qE 'AC-US[0-9]+-[0-9]+|AC-[0-9]+' "$spec_path" 2>/dev/null; then
    return 1
  fi

  return 0
}

# Search for qualifying increments
FOUND=false

# Single-repo increments
if [[ -d ".specweave/increments" ]]; then
  while IFS= read -r spec; do
    if check_spec "$spec"; then
      FOUND=true
      break
    fi
  done < <(find .specweave/increments -maxdepth 2 -name "spec.md" 2>/dev/null)
fi

# Multi-repo increments
if [[ "$FOUND" == "false" ]] && [[ -d "repositories" ]]; then
  while IFS= read -r spec; do
    if check_spec "$spec"; then
      FOUND=true
      break
    fi
  done < <(find repositories -path "*/.specweave/increments/*/spec.md" -maxdepth 6 2>/dev/null)
fi

if [[ "$FOUND" == "true" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# BLOCK — no qualifying increment found (implementation mode only)
REASON="SPEC-FIRST ENFORCEMENT: Increment Required Before Team Creation

TeamCreate CANNOT proceed without an existing increment with a substantive spec.md.
This requirement applies to IMPLEMENTATION teams only.

No qualifying increment found. A valid spec.md must have:
  - At least 500 bytes of real content (not templates)
  - No unfilled template markers or {{PLACEHOLDER}} patterns
  - At least one acceptance criterion (AC-USx-xx pattern)

Searched:
  - .specweave/increments/*/spec.md
  - repositories/*/*/.specweave/increments/*/spec.md

REQUIRED ACTION:
  1. Run: /sw:increment \"your feature description\"
  2. Review and approve the spec, plan, and tasks
  3. THEN run: /sw:team-lead to parallelize execution

ALTERNATIVE: For non-implementation work, use a mode-prefixed team name:
  - review-*     → PR reviews, code audits (no increment needed)
  - brainstorm-* → Ideation sessions (no increment needed)
  - analysis-*   → Research and exploration (no increment needed)
  - research-*   → Codebase research and investigation (no increment needed)
  - plan-*       → Parallel planning with PM + Architect (creates increment)

Workflow: /sw:increment → /sw:team-lead → /sw:done"

REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
exit 0
