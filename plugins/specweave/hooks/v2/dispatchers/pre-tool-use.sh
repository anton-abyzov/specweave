#!/bin/bash
# pre-tool-use.sh - Dispatcher for PreToolUse guards
#
# Routes to appropriate guards based on tool type:
# - Write: spec-template-enforcement-guard for spec.md
# - Edit: status-completion-guard for metadata.json protection
#
# Returns: {"decision":"allow"} or {"decision":"block","reason":"..."}
#
# @since 1.0.167
# @updated 1.0.196 - Added status-completion-guard for Edit operations
# @updated 1.0.352 - Added interview-enforcement-guard for agent-spawned spec.md writes

set -e

# Read input once and store
INPUT=$(cat)

# Skip if hooks disabled
[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && echo '{"decision":"allow"}' && exit 0

# Skip if not a SpecWeave project
[[ ! -d ".specweave" ]] && echo '{"decision":"allow"}' && exit 0

# Get plugin root for guard paths
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
GUARDS_DIR="$PLUGIN_ROOT/hooks/v2/guards"

# Extract tool info
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .toolName // ""')

# ============================================================================
# Edit Tool Guards
# ============================================================================

if [[ "$TOOL_NAME" == "Edit" ]]; then
  # Status Completion Guard - Prevents direct status changes to "completed"
  # RULE: Use /sw:done or /sw:auto instead of direct metadata.json edits
  STATUS_GUARD="$GUARDS_DIR/status-completion-guard.sh"
  if [[ -x "$STATUS_GUARD" ]]; then
    STATUS_RESULT=$(echo "$INPUT" | "$STATUS_GUARD" 2>/dev/null || echo '{"decision":"allow"}')
    STATUS_DECISION=$(echo "$STATUS_RESULT" | jq -r '.decision // "allow"')

    if [[ "$STATUS_DECISION" == "block" ]]; then
      echo "$STATUS_RESULT"
      exit 0
    fi
  fi

  echo '{"decision":"allow"}'
  exit 0
fi

# ============================================================================
# Write Tool Guards
# ============================================================================

if [[ "$TOOL_NAME" == "Write" ]]; then
  # Spec Template Enforcement Guard
  # Enforces template-first workflow for spec.md (skill usage)
  SPEC_GUARD="$GUARDS_DIR/spec-template-enforcement-guard.sh"
  if [[ -x "$SPEC_GUARD" ]]; then
    SPEC_RESULT=$(echo "$INPUT" | "$SPEC_GUARD" 2>/dev/null || echo '{"decision":"allow"}')
    SPEC_DECISION=$(echo "$SPEC_RESULT" | jq -r '.decision // "allow"')

    if [[ "$SPEC_DECISION" == "block" ]]; then
      echo "$SPEC_RESULT"
      exit 0
    fi
  fi

  # Interview Enforcement Guard
  # Blocks spec.md writes until deep interview is complete (when strict mode enabled)
  # Needed here because agent-spawned writes don't inherit skill-level hooks
  INTERVIEW_GUARD="$GUARDS_DIR/interview-enforcement-guard.sh"
  if [[ -x "$INTERVIEW_GUARD" ]]; then
    INTERVIEW_RESULT=$(echo "$INPUT" | "$INTERVIEW_GUARD" 2>/dev/null || echo '{"decision":"allow"}')
    INTERVIEW_DECISION=$(echo "$INTERVIEW_RESULT" | jq -r '.decision // "allow"')

    if [[ "$INTERVIEW_DECISION" == "block" ]]; then
      echo "$INTERVIEW_RESULT"
      exit 0
    fi
  fi

  echo '{"decision":"allow"}'
  exit 0
fi

# Allow all other tools
echo '{"decision":"allow"}'
exit 0
