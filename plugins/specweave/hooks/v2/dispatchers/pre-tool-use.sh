#!/bin/bash
# pre-tool-use.sh - Dispatcher for PreToolUse guards
#
# Routes to appropriate guards based on tool and file path:
# 1. implementation-requires-increment-guard.sh - Blocks source code writes without increment
# 2. spec-template-enforcement-guard.sh - Enforces template-first workflow for spec.md
#
# Returns: {"decision":"allow"} or {"decision":"block","reason":"..."}
#
# @since 1.0.167

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
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .toolInput.file_path // ""')

# Only process Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  echo '{"decision":"allow"}'
  exit 0
fi

# ============================================================================
# GUARD 1: Implementation Requires Increment
# Blocks source code writes without active increment
# ============================================================================

IMPL_GUARD="$GUARDS_DIR/implementation-requires-increment-guard.sh"
if [[ -x "$IMPL_GUARD" ]]; then
  IMPL_RESULT=$(echo "$INPUT" | "$IMPL_GUARD" 2>/dev/null || echo '{"decision":"allow"}')
  IMPL_DECISION=$(echo "$IMPL_RESULT" | jq -r '.decision // "allow"')

  if [[ "$IMPL_DECISION" == "block" ]]; then
    echo "$IMPL_RESULT"
    exit 0
  fi
fi

# ============================================================================
# GUARD 2: Spec Template Enforcement
# Enforces template-first workflow for spec.md
# ============================================================================

SPEC_GUARD="$GUARDS_DIR/spec-template-enforcement-guard.sh"
if [[ -x "$SPEC_GUARD" ]]; then
  SPEC_RESULT=$(echo "$INPUT" | "$SPEC_GUARD" 2>/dev/null || echo '{"decision":"allow"}')
  SPEC_DECISION=$(echo "$SPEC_RESULT" | jq -r '.decision // "allow"')

  if [[ "$SPEC_DECISION" == "block" ]]; then
    echo "$SPEC_RESULT"
    exit 0
  fi
fi

# ============================================================================
# All guards passed - allow operation
# ============================================================================

echo '{"decision":"allow"}'
exit 0
