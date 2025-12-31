#!/bin/bash
# hook-errors.sh - Centralized hook error logging and warning output
#
# PRINCIPLE: Hooks MUST NEVER block operations. All errors become warnings.
#
# Usage:
#   source "$HOOK_DIR/lib/hook-errors.sh"
#   log_hook_warning "task-ac-sync" "Pattern not found in spec.md"
#   log_hook_error "metadata-guard" "JSON parse failed" "$details"
#
# Environment:
#   SPECWEAVE_HOOK_VERBOSE=1 - Show all warnings to user
#   SPECWEAVE_HOOK_DEBUG=1 - Log debug info to files
#
# All functions are non-blocking and always return 0

set +e

# ============================================================================
# Configuration
# ============================================================================

HOOK_ERRORS_VERSION="1.0.0"

# Find project root (CRITICAL: must NOT fallback to pwd!)
_find_hook_project_root() {
  local dir="${1:-$PWD}"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  # Return empty string - NOT pwd (prevents .specweave pollution)
  return 1
}

_HOOK_PROJECT_ROOT=$(_find_hook_project_root)

# Exit early if not a SpecWeave project (prevents .specweave pollution)
if [[ -z "$_HOOK_PROJECT_ROOT" ]] || [[ ! -d "$_HOOK_PROJECT_ROOT/.specweave" ]]; then
  # Define no-op functions so sourcing scripts don't fail
  log_hook_warning() { :; }
  log_hook_error() { :; }
  log_hook_debug() { :; }
  reset_hook_errors() { :; }
  count_hook_errors() { echo "0"; }
  output_hook_warnings() { :; }
  return 0 2>/dev/null || exit 0
fi

_HOOK_LOGS_DIR="$_HOOK_PROJECT_ROOT/.specweave/logs"
_HOOK_STATE_DIR="$_HOOK_PROJECT_ROOT/.specweave/state"

# Ensure directories exist (safe - project root validated above)
mkdir -p "$_HOOK_LOGS_DIR" 2>/dev/null || true
mkdir -p "$_HOOK_STATE_DIR" 2>/dev/null || true

# Log files
_HOOK_ERROR_LOG="$_HOOK_LOGS_DIR/hook-errors.log"
_HOOK_WARNING_LOG="$_HOOK_LOGS_DIR/hook-warnings.log"
_HOOK_DEBUG_LOG="$_HOOK_LOGS_DIR/hook-debug.log"

# ============================================================================
# Internal Helpers
# ============================================================================

_timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

_rotate_log_if_needed() {
  local log_file="$1"
  local max_size="${2:-1048576}"  # 1MB default

  if [[ -f "$log_file" ]]; then
    local size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
    if [[ "$size" -gt "$max_size" ]]; then
      mv "$log_file" "${log_file}.old" 2>/dev/null || true
    fi
  fi
}

# ============================================================================
# Public API: Logging Functions
# ============================================================================

# Log a warning - operation continues, user sees message if VERBOSE=1
# Usage: log_hook_warning "hook-name" "message"
log_hook_warning() {
  local hook_name="${1:-unknown}"
  local message="${2:-No message}"
  local timestamp=$(_timestamp)

  # Always log to file
  echo "[$timestamp] WARNING [$hook_name]: $message" >> "$_HOOK_WARNING_LOG" 2>/dev/null || true

  # Show to user if verbose mode
  if [[ "${SPECWEAVE_HOOK_VERBOSE:-0}" == "1" ]]; then
    echo ""
    echo "  WARNING [$hook_name]: $message"
    echo ""
  fi

  return 0
}

# Log an error - operation continues, but this is significant
# Usage: log_hook_error "hook-name" "message" ["details"]
log_hook_error() {
  local hook_name="${1:-unknown}"
  local message="${2:-No message}"
  local details="${3:-}"
  local timestamp=$(_timestamp)

  # Rotate log if too large
  _rotate_log_if_needed "$_HOOK_ERROR_LOG"

  # Always log to file with details
  {
    echo "============================================================"
    echo "[$timestamp] ERROR [$hook_name]"
    echo "Message: $message"
    if [[ -n "$details" ]]; then
      echo "Details: $details"
    fi
    echo "============================================================"
  } >> "$_HOOK_ERROR_LOG" 2>/dev/null || true

  # Always show errors to user (they're significant)
  echo ""
  echo "  [Hook Warning] $hook_name: $message"
  if [[ -n "$details" ]] && [[ "${SPECWEAVE_HOOK_DEBUG:-0}" == "1" ]]; then
    echo "  Details: $details"
  fi
  echo "  (Operation continues - hook errors are non-blocking)"
  echo ""

  return 0
}

# Log debug info - only to file if DEBUG=1
# Usage: log_hook_debug "hook-name" "message"
log_hook_debug() {
  local hook_name="${1:-unknown}"
  local message="${2:-}"

  if [[ "${SPECWEAVE_HOOK_DEBUG:-0}" == "1" ]]; then
    local timestamp=$(_timestamp)
    _rotate_log_if_needed "$_HOOK_DEBUG_LOG"
    echo "[$timestamp] DEBUG [$hook_name]: $message" >> "$_HOOK_DEBUG_LOG" 2>/dev/null || true
  fi

  return 0
}

# Log hook start - for tracking which hooks ran
# Usage: log_hook_start "hook-name" ["context"]
log_hook_start() {
  local hook_name="${1:-unknown}"
  local context="${2:-}"

  log_hook_debug "$hook_name" "START ${context:+- $context}"
  return 0
}

# Log hook end - with success/failure status
# Usage: log_hook_end "hook-name" "success|failure" ["message"]
log_hook_end() {
  local hook_name="${1:-unknown}"
  local status="${2:-success}"
  local message="${3:-}"

  log_hook_debug "$hook_name" "END ($status) ${message:+- $message}"
  return 0
}

# ============================================================================
# Public API: Safe Execution Helpers
# ============================================================================

# Run a command safely, logging errors but never failing
# Usage: safe_run "hook-name" command arg1 arg2...
safe_run() {
  local hook_name="${1:-unknown}"
  shift

  local output
  local exit_code

  output=$("$@" 2>&1)
  exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    log_hook_warning "$hook_name" "Command failed (exit $exit_code): $*"
    log_hook_debug "$hook_name" "Output: $output"
  fi

  return 0  # Always succeed
}

# Run a file modification safely with backup
# Usage: safe_file_modify "hook-name" "file" "command with \$file placeholder"
safe_file_modify() {
  local hook_name="${1:-unknown}"
  local file="$2"
  local command="$3"

  if [[ ! -f "$file" ]]; then
    log_hook_warning "$hook_name" "File not found: $file"
    return 0
  fi

  # Create backup
  local backup="${file}.hook-backup"
  cp "$file" "$backup" 2>/dev/null || {
    log_hook_warning "$hook_name" "Failed to create backup of $file"
    return 0
  }

  # Run command (replace $file placeholder)
  local actual_command="${command//\$file/$file}"
  if ! eval "$actual_command" 2>/dev/null; then
    log_hook_warning "$hook_name" "Modification failed, restoring backup"
    mv "$backup" "$file" 2>/dev/null || true
    return 0
  fi

  # Verify file is valid (not empty, not truncated)
  if [[ ! -s "$file" ]]; then
    log_hook_error "$hook_name" "File became empty after modification, restoring"
    mv "$backup" "$file" 2>/dev/null || true
    return 0
  fi

  # Success - remove backup
  rm -f "$backup" 2>/dev/null || true
  return 0
}

# ============================================================================
# Public API: Pattern Matching Helpers
# ============================================================================

# Check if a pattern exists in file (with logging)
# Usage: if pattern_exists "hook-name" "file" "pattern"; then ...
pattern_exists() {
  local hook_name="${1:-unknown}"
  local file="$2"
  local pattern="$3"

  if [[ ! -f "$file" ]]; then
    log_hook_debug "$hook_name" "pattern_exists: file not found: $file"
    return 1
  fi

  if grep -qE "$pattern" "$file" 2>/dev/null; then
    log_hook_debug "$hook_name" "pattern_exists: found '$pattern' in $file"
    return 0
  else
    log_hook_debug "$hook_name" "pattern_exists: NOT found '$pattern' in $file"
    return 1
  fi
}

# Safe sed replacement with pattern existence check
# Usage: safe_sed_replace "hook-name" "file" "pattern" "replacement"
safe_sed_replace() {
  local hook_name="${1:-unknown}"
  local file="$2"
  local pattern="$3"
  local replacement="$4"

  if [[ ! -f "$file" ]]; then
    log_hook_warning "$hook_name" "Cannot replace: file not found: $file"
    return 0
  fi

  # Check if pattern exists first
  if ! grep -qE "$pattern" "$file" 2>/dev/null; then
    log_hook_debug "$hook_name" "Pattern not found (may already be updated): $pattern"
    return 0  # Not an error - pattern may have been updated already
  fi

  # Try macOS sed first, then Linux
  if sed -i '' "s|$pattern|$replacement|g" "$file" 2>/dev/null; then
    log_hook_debug "$hook_name" "Replaced pattern (macOS sed)"
    return 0
  elif sed -i "s|$pattern|$replacement|g" "$file" 2>/dev/null; then
    log_hook_debug "$hook_name" "Replaced pattern (Linux sed)"
    return 0
  else
    log_hook_warning "$hook_name" "sed replacement failed for pattern: $pattern"
    return 0  # Still don't fail
  fi
}

# ============================================================================
# Public API: JSON Helpers
# ============================================================================

# Safe JSON read with fallback
# Usage: value=$(safe_json_get "hook-name" "file.json" ".key")
safe_json_get() {
  local hook_name="${1:-unknown}"
  local file="$2"
  local key="$3"
  local default="${4:-}"

  if [[ ! -f "$file" ]]; then
    echo "$default"
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    log_hook_debug "$hook_name" "jq not available, returning default"
    echo "$default"
    return 0
  fi

  local value
  value=$(jq -r "$key // empty" "$file" 2>/dev/null)

  if [[ -z "$value" ]] || [[ "$value" == "null" ]]; then
    echo "$default"
  else
    echo "$value"
  fi

  return 0
}

# Safe JSON update
# Usage: safe_json_set "hook-name" "file.json" ".key" "value"
safe_json_set() {
  local hook_name="${1:-unknown}"
  local file="$2"
  local key="$3"
  local value="$4"

  if [[ ! -f "$file" ]]; then
    log_hook_warning "$hook_name" "Cannot update JSON: file not found: $file"
    return 0
  fi

  if ! command -v jq >/dev/null 2>&1; then
    log_hook_warning "$hook_name" "jq not available, skipping JSON update"
    return 0
  fi

  local tmp_file
  tmp_file=$(mktemp)

  if jq "$key = $value" "$file" > "$tmp_file" 2>/dev/null && [[ -s "$tmp_file" ]]; then
    mv "$tmp_file" "$file" 2>/dev/null || {
      log_hook_warning "$hook_name" "Failed to write JSON update"
      rm -f "$tmp_file"
    }
  else
    log_hook_warning "$hook_name" "jq update failed for $key"
    rm -f "$tmp_file"
  fi

  return 0
}

# ============================================================================
# Public API: Output Helpers
# ============================================================================

# Output a visible warning banner to user
# Usage: show_hook_warning_banner "title" "message line 1" "message line 2"
show_hook_warning_banner() {
  local title="$1"
  shift

  echo ""
  echo "  WARNING: $title"
  echo "  ----------------------------------------"
  for line in "$@"; do
    echo "  $line"
  done
  echo "  ----------------------------------------"
  echo ""
}

# Output a non-blocking info message
# Usage: show_hook_info "Operation completed with warnings"
show_hook_info() {
  local message="$1"
  echo ""
  echo "  [Info] $message"
  echo ""
}

# ============================================================================
# Initialization
# ============================================================================

# Export all functions for use in subshells
export -f log_hook_warning 2>/dev/null || true
export -f log_hook_error 2>/dev/null || true
export -f log_hook_debug 2>/dev/null || true
export -f log_hook_start 2>/dev/null || true
export -f log_hook_end 2>/dev/null || true
export -f safe_run 2>/dev/null || true
export -f safe_file_modify 2>/dev/null || true
export -f pattern_exists 2>/dev/null || true
export -f safe_sed_replace 2>/dev/null || true
export -f safe_json_get 2>/dev/null || true
export -f safe_json_set 2>/dev/null || true
export -f show_hook_warning_banner 2>/dev/null || true
export -f show_hook_info 2>/dev/null || true
