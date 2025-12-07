#!/bin/bash
# common-setup.sh - Unified Hook Library for Crash Prevention
#
# This library consolidates ALL common patterns from 19+ hooks into
# a single source of truth. Extracted from ADRs: 0060, 0068, 0073,
# 0128, 0130, 0157, 0189.
#
# USAGE:
#   source "${CLAUDE_PLUGIN_ROOT}/hooks/lib/common-setup.sh"
#   setup_hook_environment || exit 0
#
# v0.33.0 - Consolidated from 7 ADRs (2,500+ lines → 200 lines)

set +e  # NEVER use set -e in hooks (ADR-0157 Rule 2)

# ============================================================================
# CONFIGURATION
# ============================================================================

export HOOK_VERSION="0.33.0"
export HOOK_TIMEOUT="${HOOK_TIMEOUT:-5}"
export HOOK_DEBUG="${HOOK_DEBUG:-0}"

# State directories (lazy-created)
_STATE_DIR=""
_CACHE_DIR=""
_LOG_DIR=""

# ============================================================================
# 1. PROJECT ROOT DETECTION (ADR-0068, ADR-0128)
# ============================================================================

find_project_root() {
  local dir="${1:-$(pwd)}"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.specweave" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

# ============================================================================
# 2. EMERGENCY KILL SWITCH (ADR-0068 Layer 1, ADR-0157 Rule 4)
# ============================================================================

check_kill_switch() {
  if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
    [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Kill switch active" >&2
    return 1
  fi
  return 0
}

# ============================================================================
# 3. CIRCUIT BREAKER (ADR-0068 Layer 2)
# ============================================================================

# Circuit breaker state (3 failures = trip)
_CIRCUIT_BREAKER_FILE=""
_CIRCUIT_BREAKER_THRESHOLD=3

init_circuit_breaker() {
  local project_root="$1"
  _CIRCUIT_BREAKER_FILE="${project_root}/.specweave/state/.hook-circuit-breaker"
  mkdir -p "$(dirname "$_CIRCUIT_BREAKER_FILE")" 2>/dev/null
}

check_circuit_breaker() {
  [[ -z "$_CIRCUIT_BREAKER_FILE" ]] && return 0

  if [[ -f "$_CIRCUIT_BREAKER_FILE" ]]; then
    local failures
    failures=$(cat "$_CIRCUIT_BREAKER_FILE" 2>/dev/null || echo "0")
    if [[ "$failures" -ge "$_CIRCUIT_BREAKER_THRESHOLD" ]]; then
      [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Circuit breaker OPEN ($failures failures)" >&2
      return 1
    fi
  fi
  return 0
}

record_circuit_breaker_failure() {
  [[ -z "$_CIRCUIT_BREAKER_FILE" ]] && return

  local failures
  failures=$(cat "$_CIRCUIT_BREAKER_FILE" 2>/dev/null || echo "0")
  echo "$((failures + 1))" > "$_CIRCUIT_BREAKER_FILE"
}

reset_circuit_breaker() {
  [[ -n "$_CIRCUIT_BREAKER_FILE" ]] && rm -f "$_CIRCUIT_BREAKER_FILE"
}

# ============================================================================
# 4. FILE-BASED RECURSION GUARD (ADR-0073 - replaces failed env var approach)
# ============================================================================

_RECURSION_GUARD_FILE=""

init_recursion_guard() {
  local project_root="$1"
  _RECURSION_GUARD_FILE="${project_root}/.specweave/state/.hook-recursion-guard"
}

check_recursion_guard() {
  [[ -z "$_RECURSION_GUARD_FILE" ]] && return 0

  if [[ -f "$_RECURSION_GUARD_FILE" ]]; then
    # Check if guard is stale (>30s old)
    local guard_age
    if [[ "$(uname)" == "Darwin" ]]; then
      guard_age=$(( $(date +%s) - $(stat -f %m "$_RECURSION_GUARD_FILE" 2>/dev/null || echo "0") ))
    else
      guard_age=$(( $(date +%s) - $(stat -c %Y "$_RECURSION_GUARD_FILE" 2>/dev/null || echo "0") ))
    fi

    if [[ "$guard_age" -lt 30 ]]; then
      [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Recursion guard active (${guard_age}s old)" >&2
      return 1
    else
      # Stale guard - clean it up
      rm -f "$_RECURSION_GUARD_FILE"
    fi
  fi
  return 0
}

acquire_recursion_guard() {
  [[ -z "$_RECURSION_GUARD_FILE" ]] && return 1

  touch "$_RECURSION_GUARD_FILE"
  # Auto-cleanup on exit
  trap 'rm -f "$_RECURSION_GUARD_FILE" 2>/dev/null' EXIT
  return 0
}

release_recursion_guard() {
  [[ -n "$_RECURSION_GUARD_FILE" ]] && rm -f "$_RECURSION_GUARD_FILE" 2>/dev/null
}

# ============================================================================
# 5. LOCK FILE ACQUISITION (ADR-0068 Layer 3)
# ============================================================================

_LOCK_FILE=""
_LOCK_TIMEOUT=5

acquire_hook_lock() {
  local lock_name="${1:-default}"
  local project_root="${2:-$(find_project_root)}"

  _LOCK_FILE="${project_root}/.specweave/state/.hook-${lock_name}.lock"
  mkdir -p "$(dirname "$_LOCK_FILE")" 2>/dev/null

  local attempts=0
  while [[ $attempts -lt $((_LOCK_TIMEOUT * 5)) ]]; do
    if mkdir "$_LOCK_FILE" 2>/dev/null; then
      trap 'rmdir "$_LOCK_FILE" 2>/dev/null || true' EXIT
      return 0
    fi

    # Check for stale lock (>60s old)
    if [[ -d "$_LOCK_FILE" ]]; then
      local lock_age
      if [[ "$(uname)" == "Darwin" ]]; then
        lock_age=$(( $(date +%s) - $(stat -f %m "$_LOCK_FILE" 2>/dev/null || echo "0") ))
      else
        lock_age=$(( $(date +%s) - $(stat -c %Y "$_LOCK_FILE" 2>/dev/null || echo "0") ))
      fi

      if [[ "$lock_age" -gt 60 ]]; then
        rmdir "$_LOCK_FILE" 2>/dev/null
        continue
      fi
    fi

    sleep 0.2
    attempts=$((attempts + 1))
  done

  [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Lock acquisition timeout: $lock_name" >&2
  return 1
}

release_hook_lock() {
  [[ -n "$_LOCK_FILE" ]] && rmdir "$_LOCK_FILE" 2>/dev/null
  _LOCK_FILE=""
}

# ============================================================================
# 6. DEBOUNCING (ADR-0060 Tier 1, ADR-0130)
# ============================================================================

_DEBOUNCE_FILE=""
_DEBOUNCE_WINDOW=5  # seconds

check_debounce() {
  local debounce_key="${1:-default}"
  local project_root="${2:-$(find_project_root)}"

  _DEBOUNCE_FILE="${project_root}/.specweave/state/.last-hook-${debounce_key}"

  if [[ -f "$_DEBOUNCE_FILE" ]]; then
    local last_run
    last_run=$(cat "$_DEBOUNCE_FILE" 2>/dev/null || echo "0")
    local now
    now=$(date +%s)

    if [[ $((now - last_run)) -lt $_DEBOUNCE_WINDOW ]]; then
      [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Debounced: $debounce_key" >&2
      return 1
    fi
  fi
  return 0
}

record_debounce() {
  [[ -n "$_DEBOUNCE_FILE" ]] && date +%s > "$_DEBOUNCE_FILE"
}

# ============================================================================
# 7. BULK OPERATION DETECTION (ADR-0130)
# ============================================================================

_BULK_COUNTER_FILE=""
_BULK_THRESHOLD=5  # 5+ ops in 10s = bulk mode
_BULK_WINDOW=10

is_bulk_operation() {
  local project_root="${1:-$(find_project_root)}"

  _BULK_COUNTER_FILE="${project_root}/.specweave/state/.bulk-op-counter"
  mkdir -p "$(dirname "$_BULK_COUNTER_FILE")" 2>/dev/null

  local now
  now=$(date +%s)

  # Read current count and timestamp
  local count=0
  local start_time=$now

  if [[ -f "$_BULK_COUNTER_FILE" ]]; then
    read -r count start_time < "$_BULK_COUNTER_FILE" 2>/dev/null || true

    # Reset if window expired
    if [[ $((now - start_time)) -gt $_BULK_WINDOW ]]; then
      count=0
      start_time=$now
    fi
  fi

  # Increment and save
  count=$((count + 1))
  echo "$count $start_time" > "$_BULK_COUNTER_FILE"

  if [[ $count -ge $_BULK_THRESHOLD ]]; then
    [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Bulk operation detected ($count ops in window)" >&2
    return 0  # IS bulk operation
  fi
  return 1  # NOT bulk operation
}

# ============================================================================
# 8. LOG ROTATION (ADR-0060)
# ============================================================================

_LOG_FILE=""
_LOG_MAX_SIZE=1048576  # 1MB

init_log() {
  local log_name="${1:-hooks}"
  local project_root="${2:-$(find_project_root)}"

  _LOG_DIR="${project_root}/.specweave/logs"
  mkdir -p "$_LOG_DIR" 2>/dev/null
  _LOG_FILE="${_LOG_DIR}/${log_name}.log"

  # Rotate if too large
  if [[ -f "$_LOG_FILE" ]]; then
    local size
    size=$(stat -f%z "$_LOG_FILE" 2>/dev/null || stat -c%s "$_LOG_FILE" 2>/dev/null || echo "0")
    if [[ "$size" -gt "$_LOG_MAX_SIZE" ]]; then
      mv "$_LOG_FILE" "${_LOG_FILE}.1" 2>/dev/null
    fi
  fi
}

log_hook() {
  local level="$1"
  shift
  local msg="$*"

  [[ -z "$_LOG_FILE" ]] && return
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [$level] $msg" >> "$_LOG_FILE"
}

# ============================================================================
# 9. UNIFIED SETUP (ALL CHECKS IN ONE CALL)
# ============================================================================

setup_hook_environment() {
  local hook_name="${1:-unnamed}"
  local require_lock="${2:-false}"
  local enable_recursion_guard="${3:-false}"

  # Find project root
  PROJECT_ROOT=$(find_project_root)
  if [[ -z "$PROJECT_ROOT" ]]; then
    [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Not in SpecWeave project" >&2
    return 1
  fi
  export PROJECT_ROOT

  # Initialize state directory
  _STATE_DIR="${PROJECT_ROOT}/.specweave/state"
  mkdir -p "$_STATE_DIR" 2>/dev/null

  # Layer 1: Kill switch
  check_kill_switch || return 1

  # Layer 2: Circuit breaker
  init_circuit_breaker "$PROJECT_ROOT"
  check_circuit_breaker || return 1

  # Layer 3: Recursion guard (if enabled)
  if [[ "$enable_recursion_guard" == "true" ]]; then
    init_recursion_guard "$PROJECT_ROOT"
    check_recursion_guard || return 1
  fi

  # Layer 4: Lock (if required)
  if [[ "$require_lock" == "true" ]]; then
    acquire_hook_lock "$hook_name" "$PROJECT_ROOT" || return 1
  fi

  # Layer 5: Debouncing
  check_debounce "$hook_name" "$PROJECT_ROOT" || return 1

  # Initialize logging
  init_log "hooks" "$PROJECT_ROOT"

  [[ "$HOOK_DEBUG" == "1" ]] && echo "[HOOK] Environment ready: $hook_name" >&2
  return 0
}

# ============================================================================
# 10. SAFE EXIT HANDLERS
# ============================================================================

# Always exit 0 from hooks (ADR-0157 Rule 6)
# Exception: PreToolUse guards exit 2 to block
hook_exit_success() {
  release_hook_lock
  release_recursion_guard
  exit 0
}

hook_exit_block() {
  release_hook_lock
  release_recursion_guard
  exit 2  # Block PreToolUse
}

# Record failure and exit safely
hook_exit_with_failure() {
  local msg="$1"
  record_circuit_breaker_failure
  log_hook "ERROR" "$msg"
  release_hook_lock
  release_recursion_guard
  exit 0  # Still exit 0 to not break Claude
}
