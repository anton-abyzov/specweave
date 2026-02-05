#!/bin/bash
# fail-fast-wrapper.sh - Non-blocking timeout wrapper for hooks
#
# v1.0.153: Hook-specific timeouts (user-prompt-submit: 30s for LLM detection)
# v1.0.102+: Cross-platform support (Linux, macOS, BSD, Windows Git Bash)
#
# CRITICAL DESIGN PRINCIPLE:
#   - NEVER block tool operations
#   - All errors become warnings shown to user
#   - Safe JSON output even on catastrophic failures
#   - Universal timeout support (Perl fallback for all platforms)
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
WRAPPER_VERSION="1.0.153"

# ============================================================================
# HOOK-SPECIFIC TIMEOUT OVERRIDES (v1.0.153)
# ============================================================================
# Some hooks require longer timeouts due to LLM calls or network operations.
# user-prompt-submit.sh: LLM-based detect-intent (~15s) + plugin installs (~4s)
# Override defaults here while keeping fast timeouts for simple hooks.
#
# Environment overrides (if you need custom values):
#   HOOK_TIMEOUT_USER_PROMPT - timeout for user-prompt-submit (default: 30)
#   HOOK_TIMEOUT_SESSION_START - timeout for session-start (default: 20)

script_name=$(basename "${1:-}" 2>/dev/null)
case "$script_name" in
  user-prompt-submit.sh)
    # LLM detection can timeout (30s) + keyword fallback + plugin installs (~10s)
    # Total worst case: 30s LLM timeout + 10s installs + 5s buffer = 45s
    HOOK_TIMEOUT="${HOOK_TIMEOUT_USER_PROMPT:-45}"
    ;;
  session-start.sh)
    # Project detection may involve file scanning and optional LLM
    HOOK_TIMEOUT="${HOOK_TIMEOUT_SESSION_START:-20}"
    ;;
  stop-auto.sh)
    # May run tests + LLM evaluation + validation
    HOOK_TIMEOUT="${HOOK_TIMEOUT_STOP_AUTO:-120}"
    ;;
  stop-*.sh)
    # Other stop hooks (reflect, sync, grill) are usually fast
    HOOK_TIMEOUT="${HOOK_TIMEOUT_STOP:-15}"
    ;;
esac

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
  # Stop hooks need {"decision":"approve"}, others need {"continue":true}
  if [[ "$script_name" == stop-* ]]; then
    echo '{"decision":"approve"}'
  else
    echo '{"continue": true}'
  fi
  exit 0
fi

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
WARNING_LOG="$LOGS_DIR/hook-warnings.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# ============================================================================
# JSON UTILITIES (v1.0.102+)
# ============================================================================

# Escape string for safe JSON embedding
escape_json() {
  local str="$1"
  # Escape backslash, double quote, newline, carriage return, tab
  str="${str//\\/\\\\}"  # Backslash
  str="${str//\"/\\\"}"  # Double quote
  str="${str//$'\n'/\\n}"  # Newline
  str="${str//$'\r'/\\r}"  # Carriage return
  str="${str//$'\t'/\\t}"  # Tab
  echo "$str"
}

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
# SAFE OUTPUT GENERATION (v1.0.102+)
# ============================================================================

# Safe output with warnings (JSON-escaped)
get_safe_output_with_warnings() {
  local script="$1"
  local severity="$2"
  local message="$3"
  local recommendation="$4"

  local script_name
  script_name=$(basename "$script" 2>/dev/null || echo "unknown")

  # Escape all strings for JSON safety
  local escaped_name
  local escaped_message
  local escaped_recommendation
  escaped_name=$(escape_json "$script_name")
  escaped_message=$(escape_json "$message")
  escaped_recommendation=$(escape_json "$recommendation")

  # Build JSON with warnings array
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]]; then
    cat <<EOF
{"decision":"allow","warnings":[{"severity":"${severity}","message":"${escaped_name}: ${escaped_message}","recommendation":"${escaped_recommendation}"}]}
EOF
  elif [[ "$(basename "$script")" == stop-* ]]; then
    cat <<EOF
{"decision":"approve","warnings":[{"severity":"${severity}","message":"${escaped_name}: ${escaped_message}","recommendation":"${escaped_recommendation}"}]}
EOF
  else
    cat <<EOF
{"continue":true,"warnings":[{"severity":"${severity}","message":"${escaped_name}: ${escaped_message}","recommendation":"${escaped_recommendation}"}]}
EOF
  fi
}

# Safe output without warnings (success case)
get_safe_output() {
  local script="$1"
  if [[ "$script" == *"guard"* ]] || [[ "$script" == *"validator"* ]]; then
    echo '{"decision":"allow","warnings":[]}'
  elif [[ "$(basename "$script")" == stop-* ]]; then
    echo '{"decision":"approve","warnings":[]}'
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

# Read stdin with non-blocking timeout (v1.0.102+)
# Uses Perl for universal cross-platform support
stdin_content=""
if command -v perl >/dev/null 2>&1; then
  # Perl-based timeout (works on all Unix systems)
  stdin_content=$(perl -e '
    use strict;
    use warnings;

    eval {
      local $SIG{ALRM} = sub { die "timeout\n" };
      alarm(1);
      local $/;
      my $input = <STDIN>;
      alarm(0);
      print $input;
    };
    if ($@) {
      print "{}";
    }
  ' 2>/dev/null || echo '{}')
elif command -v gtimeout >/dev/null 2>&1; then
  stdin_content=$(gtimeout 1 cat 2>/dev/null || echo '{}')
elif command -v timeout >/dev/null 2>&1; then
  stdin_content=$(timeout 1 cat 2>/dev/null || echo '{}')
else
  # Last resort: try reading without blocking (may hang if stdin has data)
  stdin_content=$(cat 2>/dev/null || echo '{}')
fi

# Run with timeout (v1.0.102+: Universal cross-platform support)
tmp_out=$(mktemp -t hook-out.XXXXXX 2>/dev/null || echo "/tmp/hook-out-$$")
tmp_err=$(mktemp -t hook-err.XXXXXX 2>/dev/null || echo "/tmp/hook-err-$$")

# Try GNU timeout (Linux), then BSD timeout (macOS with coreutils), then Perl fallback
if command -v gtimeout >/dev/null 2>&1; then
  # GNU timeout (Linux, coreutils on macOS)
  echo "$stdin_content" | gtimeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2> "$tmp_err"
  exit_code=$?
elif command -v timeout >/dev/null 2>&1; then
  # BSD timeout (some systems)
  echo "$stdin_content" | timeout --kill-after=2 "$HOOK_TIMEOUT" bash "$script" "$@" > "$tmp_out" 2> "$tmp_err"
  exit_code=$?
else
  # Bash-only fallback (for systems without timeout/gtimeout - e.g., macOS)
  # Run hook in background
  echo "$stdin_content" | bash "$script" "$@" > "$tmp_out" 2> "$tmp_err" &
  script_pid=$!

  # Wait with timeout using simple loop
  elapsed=0
  while kill -0 $script_pid 2>/dev/null && [ $elapsed -lt $HOOK_TIMEOUT ]; do
    sleep 1
    elapsed=$((elapsed + 1))
  done

  # Check if still running (timeout occurred)
  if kill -0 $script_pid 2>/dev/null; then
    # Timeout - kill the process
    kill -TERM $script_pid 2>/dev/null
    sleep 2
    kill -KILL $script_pid 2>/dev/null
    wait $script_pid 2>/dev/null
    exit_code=124  # Timeout exit code
  else
    # Process finished - get exit code
    wait $script_pid
    exit_code=$?
  fi
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
    error_msg="Hook failed (exit $exit_code)"
    recommendation="Run 'specweave check-hooks' to diagnose issues"

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
