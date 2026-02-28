#!/bin/bash
# increment-existence-guard.sh - Enforces spec-first principle for team creation
#
# PURPOSE:
# Team creation (TeamCreate) MUST NOT proceed until at least one increment
# exists with a substantive spec.md. This enforces the core SpecWeave principle:
#   /sw:increment → /sw:team-lead (never skip the spec phase)
#
# Without a spec, agents have no source of truth for scope, acceptance criteria,
# or task boundaries. Skipping /sw:increment leads to uncoordinated implementation
# where agents infer scope from natural language alone.
#
# DETECTION:
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

set -e

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')

# Only check TeamCreate
if [[ "$TOOL_NAME" != "TeamCreate" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

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

# BLOCK — no qualifying increment found
REASON="SPEC-FIRST ENFORCEMENT: Increment Required Before Team Creation

TeamCreate CANNOT proceed without an existing increment with a substantive spec.md.

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

WHY: Without a spec, agents have no source of truth for scope, acceptance criteria,
or task boundaries. Skipping /sw:increment leads to uncoordinated implementation.

Workflow: /sw:increment → /sw:team-lead → /sw:done"

REASON_ESCAPED=$(echo "$REASON" | jq -Rs .)
echo "{\"decision\":\"block\",\"reason\":${REASON_ESCAPED}}"
exit 0
