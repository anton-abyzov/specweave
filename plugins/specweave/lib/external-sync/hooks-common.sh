#!/bin/bash
#
# Shared hook utilities for external sync operations (GitHub, JIRA, ADO)
# Source this file in tool-specific hooks to reduce boilerplate.
#
# Usage:
#   source "$(dirname "$0")/../../specweave/lib/external-sync/hooks-common.sh"
#

# =============================================================================
# PROJECT ROOT DETECTION
# =============================================================================

# Find project root by looking for .specweave directory
# Returns: Absolute path to project root, or empty string if not found
find_project_root() {
  local current_dir="${1:-$(pwd)}"
  local max_depth=10
  local depth=0

  while [ "$depth" -lt "$max_depth" ]; do
    if [ -d "$current_dir/.specweave" ]; then
      echo "$current_dir"
      return 0
    fi

    local parent_dir
    parent_dir="$(dirname "$current_dir")"

    # Reached filesystem root
    if [ "$parent_dir" = "$current_dir" ]; then
      return 1
    fi

    current_dir="$parent_dir"
    depth=$((depth + 1))
  done

  return 1
}

# =============================================================================
# CIRCUIT BREAKER PATTERN
# =============================================================================

# Initialize circuit breaker for external service calls
# Prevents cascading failures when external service is down
init_circuit_breaker() {
  local tool_name="$1"
  local state_dir="${2:-.specweave/state}"
  local circuit_file="$state_dir/${tool_name}-circuit.json"

  # Create state directory if missing
  mkdir -p "$state_dir"

  # Initialize circuit if not exists
  if [ ! -f "$circuit_file" ]; then
    echo '{"state":"closed","failures":0,"lastFailure":null,"lastSuccess":null}' > "$circuit_file"
  fi

  echo "$circuit_file"
}

# Check if circuit is open (service assumed down)
is_circuit_open() {
  local circuit_file="$1"
  local state

  if [ ! -f "$circuit_file" ]; then
    echo "false"
    return
  fi

  state=$(jq -r '.state // "closed"' "$circuit_file" 2>/dev/null)

  if [ "$state" = "open" ]; then
    # Check if enough time has passed to try again (30 seconds)
    local last_failure
    last_failure=$(jq -r '.lastFailure // ""' "$circuit_file" 2>/dev/null)

    if [ -n "$last_failure" ]; then
      local now
      now=$(date +%s)
      local failure_time
      failure_time=$(date -d "$last_failure" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$last_failure" +%s 2>/dev/null || echo 0)

      if [ $((now - failure_time)) -gt 30 ]; then
        echo "false"  # Allow retry (half-open state)
        return
      fi
    fi

    echo "true"
  else
    echo "false"
  fi
}

# Record a failure in the circuit breaker
record_failure() {
  local circuit_file="$1"
  local threshold="${2:-3}"

  if [ ! -f "$circuit_file" ]; then
    return
  fi

  local failures
  failures=$(jq -r '.failures // 0' "$circuit_file" 2>/dev/null)
  failures=$((failures + 1))

  local new_state="closed"
  if [ "$failures" -ge "$threshold" ]; then
    new_state="open"
  fi

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  jq --arg state "$new_state" --arg now "$now" --argjson failures "$failures" \
    '.state = $state | .failures = $failures | .lastFailure = $now' \
    "$circuit_file" > "$circuit_file.tmp" && mv "$circuit_file.tmp" "$circuit_file"
}

# Record a success in the circuit breaker (reset)
record_success() {
  local circuit_file="$1"

  if [ ! -f "$circuit_file" ]; then
    return
  fi

  local now
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  jq --arg now "$now" \
    '.state = "closed" | .failures = 0 | .lastSuccess = $now' \
    "$circuit_file" > "$circuit_file.tmp" && mv "$circuit_file.tmp" "$circuit_file"
}

# =============================================================================
# FILE LOCKING
# =============================================================================

# Acquire a lock file to prevent concurrent operations
# Returns: 0 if lock acquired, 1 if already locked
acquire_lock() {
  local lock_file="$1"
  local timeout="${2:-10}"
  local waited=0

  while [ -f "$lock_file" ]; do
    if [ "$waited" -ge "$timeout" ]; then
      log_warn "Timeout waiting for lock: $lock_file"
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done

  echo "$$" > "$lock_file"
  return 0
}

# Release a lock file
release_lock() {
  local lock_file="$1"
  rm -f "$lock_file"
}

# =============================================================================
# LOGGING UTILITIES
# =============================================================================

# Color codes (only if terminal supports colors)
if [ -t 1 ] && [ -n "$TERM" ] && [ "$TERM" != "dumb" ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

log_debug() {
  if [ "${DEBUG:-}" = "true" ] || [ "${SPECWEAVE_DEBUG:-}" = "true" ]; then
    echo -e "${BLUE}[DEBUG]${NC} $*" >&2
  fi
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $*" >&2
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# =============================================================================
# CLI TOOL DETECTION
# =============================================================================

# Check if a CLI tool is available and authenticated
check_cli_available() {
  local tool="$1"
  local auth_cmd="$2"

  if ! command -v "$tool" &> /dev/null; then
    log_error "$tool CLI not found. Install it first."
    return 1
  fi

  if [ -n "$auth_cmd" ]; then
    if ! eval "$auth_cmd" &> /dev/null; then
      log_error "$tool CLI not authenticated. Run: $auth_cmd"
      return 1
    fi
  fi

  return 0
}

# =============================================================================
# CONFIG HELPERS
# =============================================================================

# Read a value from .specweave/config.json
read_config() {
  local project_root="$1"
  local jq_query="$2"
  local default="${3:-}"

  local config_file="$project_root/.specweave/config.json"

  if [ ! -f "$config_file" ]; then
    echo "$default"
    return
  fi

  local value
  value=$(jq -r "$jq_query // empty" "$config_file" 2>/dev/null)

  if [ -z "$value" ]; then
    echo "$default"
  else
    echo "$value"
  fi
}

# Check if external writes are allowed
can_update_external() {
  local project_root="$1"
  local value
  value=$(read_config "$project_root" '.sync.settings.canUpdateExternalItems' 'false')

  [ "$value" = "true" ]
}
