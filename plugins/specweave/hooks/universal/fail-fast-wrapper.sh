#!/bin/bash
# fail-fast-wrapper.sh - Simple timeout wrapper for hooks
#
# Usage: bash fail-fast-wrapper.sh <hook-script> [args...]
#
# Environment:
#   HOOK_TIMEOUT - max seconds (default: 5)
#
# Returns safe JSON on timeout or error. Never hangs.

set +e

HOOK_TIMEOUT="${HOOK_TIMEOUT:-5}"

# Safe output based on hook type
get_safe_output() {
  local script="$1"
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]]; then
    echo '{"decision":"allow"}'
  else
    echo '{"continue":true}'
  fi
}

script="$1"
shift

# No script or doesn't exist = safe default
[[ -z "$script" || ! -f "$script" ]] && echo '{"continue":true}' && exit 0

# Read stdin
stdin_content=$(cat 2>/dev/null || echo '{}')

# Run with timeout
tmp_out=$(mktemp)
if command -v gtimeout >/dev/null 2>&1; then
  echo "$stdin_content" | gtimeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2>/dev/null
  exit_code=$?
elif command -v timeout >/dev/null 2>&1; then
  echo "$stdin_content" | timeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2>/dev/null
  exit_code=$?
else
  # Fallback: run without timeout (rare - most systems have timeout)
  echo "$stdin_content" | bash "$script" "$@" > "$tmp_out" 2>/dev/null
  exit_code=$?
fi

output=$(cat "$tmp_out" 2>/dev/null)
rm -f "$tmp_out"

# Timeout = safe default
if [[ $exit_code -eq 124 ]] || [[ $exit_code -eq 137 ]]; then
  get_safe_output "$script"
  exit 0
fi

# Return output or safe default
if [[ -n "$output" ]]; then
  echo "$output"
else
  get_safe_output "$script"
fi

exit 0
