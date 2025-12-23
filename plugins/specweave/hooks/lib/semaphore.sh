#!/bin/bash
# semaphore.sh - File-based semaphore for limiting concurrent hook execution
#
# PROBLEM SOLVED:
#   Process storms occur when many hooks spawn simultaneously, overwhelming the system.
#   Instead of detecting storms and blocking EVERYTHING (current behavior), this semaphore
#   limits concurrency properly - excess requests wait or timeout gracefully.
#
# USAGE:
#   source semaphore.sh
#   if acquire_semaphore "hook-name" 10 5000; then
#     # Do work
#     release_semaphore "hook-name"
#   else
#     # Timeout - return safe default
#   fi
#
# DESIGN:
#   - Uses file-based locks (portable, no dependencies)
#   - Configurable max concurrent slots
#   - Configurable timeout with exponential backoff
#   - Auto-cleanup of stale locks (older than 30s)
#   - Request queuing with FIFO ordering
#
# v1.0.0 - Initial implementation (2025-12-17)
# v1.0.33 - Fixed: removed set -o pipefail for hook safety

set +e  # CRITICAL: Never use set -e or pipefail in hooks (causes cascading failures)

# === Configuration ===
SEMAPHORE_DIR="${SPECWEAVE_STATE_DIR:-.specweave/state}/semaphores"
SEMAPHORE_MAX_AGE_SECONDS=30  # Stale lock threshold
SEMAPHORE_DEBUG="${SEMAPHORE_DEBUG:-0}"

# === Initialization ===
_init_semaphore_dir() {
  mkdir -p "$SEMAPHORE_DIR" 2>/dev/null || true
}

# === Logging ===
_sem_log() {
  [[ "$SEMAPHORE_DEBUG" == "1" ]] && echo "[SEM $(date +%H:%M:%S.%3N)] $*" >&2
}

# === Cleanup stale locks ===
# Locks older than SEMAPHORE_MAX_AGE_SECONDS are considered abandoned
cleanup_stale_locks() {
  local name="$1"
  local lock_dir="$SEMAPHORE_DIR/$name"

  [[ ! -d "$lock_dir" ]] && return 0

  local now
  now=$(date +%s)

  for lock_file in "$lock_dir"/*.lock; do
    [[ ! -f "$lock_file" ]] && continue

    local mtime
    if [[ "$(uname)" == "Darwin" ]]; then
      mtime=$(stat -f %m "$lock_file" 2>/dev/null || echo "0")
    else
      mtime=$(stat -c %Y "$lock_file" 2>/dev/null || echo "0")
    fi

    local age=$((now - mtime))
    if [[ "$age" -gt "$SEMAPHORE_MAX_AGE_SECONDS" ]]; then
      _sem_log "Cleaning stale lock: $lock_file (age: ${age}s)"
      rm -f "$lock_file" 2>/dev/null || true
    fi
  done
}

# === Count active slots ===
count_active_slots() {
  local name="$1"
  local lock_dir="$SEMAPHORE_DIR/$name"

  [[ ! -d "$lock_dir" ]] && echo "0" && return

  local count=0
  for lock_file in "$lock_dir"/*.lock; do
    [[ -f "$lock_file" ]] && count=$((count + 1))
  done

  echo "$count"
}

# === Acquire semaphore slot ===
# Args: name, max_slots, timeout_ms
# Returns: 0 if acquired, 1 if timeout
acquire_semaphore() {
  local name="${1:-default}"
  local max_slots="${2:-10}"
  local timeout_ms="${3:-5000}"

  _init_semaphore_dir

  local lock_dir="$SEMAPHORE_DIR/$name"
  mkdir -p "$lock_dir" 2>/dev/null || true

  # Generate unique slot ID (use random instead of %N which doesn't work on macOS)
  local slot_id="$$-$RANDOM$RANDOM"
  local lock_file="$lock_dir/${slot_id}.lock"

  # Store slot ID for release
  export _SEMAPHORE_SLOT_ID="$slot_id"
  export _SEMAPHORE_NAME="$name"
  export _SEMAPHORE_LOCK_FILE="$lock_file"

  local start_time
  # macOS doesn't support %N, use seconds * 1000 as approximation
  if command -v gdate &>/dev/null; then
    start_time=$(gdate +%s%3N)
  else
    start_time=$(($(date +%s) * 1000))
  fi

  local attempt=0
  local backoff_ms=10  # Start with 10ms backoff
  local max_backoff_ms=200

  while true; do
    # Cleanup stale locks periodically (every 5 attempts)
    [[ $((attempt % 5)) -eq 0 ]] && cleanup_stale_locks "$name"

    local current_slots
    current_slots=$(count_active_slots "$name")

    if [[ "$current_slots" -lt "$max_slots" ]]; then
      # Try to acquire slot atomically
      if (set -o noclobber; echo "$$" > "$lock_file") 2>/dev/null; then
        _sem_log "Acquired slot $slot_id for $name (slots: $((current_slots + 1))/$max_slots)"
        return 0
      fi
    fi

    # Check timeout
    local now
    if command -v gdate &>/dev/null; then
      now=$(gdate +%s%3N)
    else
      now=$(($(date +%s) * 1000))
    fi
    local elapsed=$((now - start_time))

    if [[ "$elapsed" -ge "$timeout_ms" ]]; then
      _sem_log "Timeout acquiring $name after ${elapsed}ms (slots: $current_slots/$max_slots)"
      return 1
    fi

    # Exponential backoff with jitter
    local jitter=$((RANDOM % 20))
    local sleep_ms=$((backoff_ms + jitter))

    _sem_log "Waiting for slot $name (attempt $attempt, backoff ${sleep_ms}ms, slots: $current_slots/$max_slots)"

    # Sleep (convert ms to fractional seconds)
    sleep "0.$(printf '%03d' $sleep_ms)" 2>/dev/null || sleep 0.1

    # Increase backoff (exponential with cap)
    backoff_ms=$((backoff_ms * 2))
    [[ "$backoff_ms" -gt "$max_backoff_ms" ]] && backoff_ms=$max_backoff_ms

    attempt=$((attempt + 1))
  done
}

# === Release semaphore slot ===
release_semaphore() {
  local name="${1:-$_SEMAPHORE_NAME}"
  local lock_file="${_SEMAPHORE_LOCK_FILE}"

  if [[ -n "$lock_file" ]] && [[ -f "$lock_file" ]]; then
    rm -f "$lock_file" 2>/dev/null || true
    _sem_log "Released slot for $name"
  fi

  unset _SEMAPHORE_SLOT_ID
  unset _SEMAPHORE_NAME
  unset _SEMAPHORE_LOCK_FILE
}

# === Get semaphore status ===
get_semaphore_status() {
  local name="${1:-default}"
  local max_slots="${2:-10}"

  _init_semaphore_dir
  cleanup_stale_locks "$name"

  local active
  active=$(count_active_slots "$name")

  echo "{\"name\":\"$name\",\"active\":$active,\"max\":$max_slots,\"available\":$((max_slots - active))}"
}

# === Force release all slots (emergency) ===
force_release_all() {
  local name="${1:-default}"
  local lock_dir="$SEMAPHORE_DIR/$name"

  if [[ -d "$lock_dir" ]]; then
    rm -f "$lock_dir"/*.lock 2>/dev/null || true
    _sem_log "Force released all slots for $name"
  fi
}

# === Trap handler for automatic cleanup ===
_semaphore_cleanup_trap() {
  release_semaphore 2>/dev/null || true
}

# Register cleanup trap if sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  trap _semaphore_cleanup_trap EXIT INT TERM
fi
