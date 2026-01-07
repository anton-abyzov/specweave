#!/bin/bash
# fail-fast-wrapper.sh - Non-blocking timeout wrapper for hooks
#
# v1.0.43+: Improved error logging and user warnings
#
# CRITICAL DESIGN PRINCIPLE:
#   - NEVER block tool operations
#   - All errors become warnings shown to user
#   - Safe JSON output even on catastrophic failures
#
# Usage: bash fail-fast-wrapper.sh <hook-script> [args...]
#
# Environment:
#   HOOK_TIMEOUT - max seconds (default: 5)
#   SPECWEAVE_HOOK_VERBOSE - show all warnings (default: 1)
#
# Returns safe JSON on timeout or error. Never hangs.

set +e  # CRITICAL: Never exit on error

HOOK_TIMEOUT="${HOOK_TIMEOUT:-5}"
WRAPPER_VERSION="1.0.43"

# ============================================================================
# PROJECT ROOT DETECTION (for logging) - CRITICAL: must NOT fallback to pwd!
# ============================================================================

find_project_root() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  # Return empty - NOT pwd (prevents .specweave pollution)
  return 1
}

PROJECT_ROOT=$(find_project_root)

# Exit early if not a SpecWeave project (prevents .specweave pollution)
if [[ -z "$PROJECT_ROOT" ]] || [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  # Not a SpecWeave project - output success JSON and exit
  echo '{"continue": true}'
  exit 0
fi

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
WARNING_LOG="$LOGS_DIR/hook-warnings.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# LOGGING
# ============================================================================

log_warning() {
  local script="$1"
  local message="$2"
  local details="${3:-}"

  local script_name
  script_name=$(basename "$script" 2>/dev/null || echo "unknown")

  # Log to file only (v1.0.102+: warnings now in JSON response)
  {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING [fail-fast-wrapper]: $message"
    echo "  Script: $script_name"
    [[ -n "$details" ]] && echo "  Details: $details"
  } >> "$WARNING_LOG" 2>/dev/null || true

  # NOTE: No console output - warnings are in JSON response
}

# ============================================================================
# SAFE OUTPUT GENERATION
# ============================================================================

# Safe output with warnings (v1.0.102+)
get_safe_output_with_warnings() {
  local script="$1"
  local severity="$2"
  local message="$3"
  local recommendation="$4"

  local script_name
  script_name=$(basename "$script" 2>/dev/null || echo "unknown")

  # Build JSON with warnings array
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]]; then
    cat <<EOF
{"decision":"allow","warnings":[{"severity":"${severity}","message":"${script_name}: ${message}","recommendation":"${recommendation}"}]}
EOF
  else
    cat <<EOF
{"continue":true,"warnings":[{"severity":"${severity}","message":"${script_name}: ${message}","recommendation":"${recommendation}"}]}
EOF
  fi
}

# Safe output without warnings (success case)
get_safe_output() {
  local script="$1"
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]]; then
    echo '{"decision":"allow","warnings":[]}'
  else
    echo '{"continue":true,"warnings":[]}'
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

script="$1"
shift

# No script = safe default
if [[ -z "$script" ]]; then
  echo '{"continue":true}'
  exit 0
fi

# Script doesn't exist = safe default with warning
if [[ ! -f "$script" ]]; then
  log_warning "$script" "Script not found (may be refreshing)" "Path: $script"
  get_safe_output_with_warnings "$script" "WARNING" "Script not found (may be refreshing)" "Run 'specweave refresh-marketplace' to update plugins"
  exit 0
fi

# Read stdin (with timeout to prevent hangs)
stdin_content=""
if command -v gtimeout >/dev/null 2>&1; then
  stdin_content=$(gtimeout 1 cat 2>/dev/null || echo '{}')
elif command -v timeout >/dev/null 2>&1; then
  stdin_content=$(timeout 1 cat 2>/dev/null || echo '{}')
else
  stdin_content=$(cat 2>/dev/null || echo '{}')
fi

# Run with timeout
tmp_out=$(mktemp 2>/dev/null || echo "/tmp/hook-out-$$")
tmp_err=$(mktemp 2>/dev/null || echo "/tmp/hook-err-$$")

if command -v gtimeout >/dev/null 2>&1; then
  echo "$stdin_content" | gtimeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2> "$tmp_err"
  exit_code=$?
elif command -v timeout >/dev/null 2>&1; then
  echo "$stdin_content" | timeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2> "$tmp_err"
  exit_code=$?
else
  # Fallback: run without timeout (rare - most systems have timeout)
  echo "$stdin_content" | bash "$script" "$@" > "$tmp_out" 2> "$tmp_err"
  exit_code=$?
fi

output=$(cat "$tmp_out" 2>/dev/null)
errors=$(cat "$tmp_err" 2>/dev/null)
rm -f "$tmp_out" "$tmp_err" 2>/dev/null

# Handle different exit scenarios
case $exit_code in
  0)
    # Success - return output or safe default with empty warnings
    if [[ -n "$output" ]]; then
      echo "$output"
    else
      get_safe_output "$script"
    fi
    ;;

  124|137)
    # Timeout (124 = timeout, 137 = SIGKILL)
    log_warning "$script" "Hook timed out after ${HOOK_TIMEOUT}s" "Consider optimizing or increasing HOOK_TIMEOUT"
    get_safe_output_with_warnings "$script" "WARNING" "Hook timed out after ${HOOK_TIMEOUT}s" "Consider optimizing or increasing HOOK_TIMEOUT"
    ;;

  *)
    # Other error
    local error_msg="Hook failed (exit $exit_code)"
    local recommendation="Run 'specweave check-hooks' to diagnose issues"

    if [[ -n "$errors" ]]; then
      log_warning "$script" "$error_msg" "$errors"
      get_safe_output_with_warnings "$script" "ERROR" "$error_msg: $errors" "$recommendation"
    else
      log_warning "$script" "$error_msg"
      get_safe_output_with_warnings "$script" "ERROR" "$error_msg" "$recommendation"
    fi
    ;;
esac

exit 0
