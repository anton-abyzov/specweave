#!/bin/bash
# crash-prevention.sh - Unified Crash Prevention Runtime
#
# Consolidates ALL crash prevention patterns from 9 crash categories:
#   1. Bash heredoc hangs (infinite wait for EOF)
#   2. Context explosion (>280KB total)
#   3. Hook recursion loops
#   4. Process storms (bulk operations)
#   5. Agent chunking violations
#   6. Direct completion bypass
#   7. Hook registration duplicates
#   8. Context compaction deadlock
#   9. MCP connection drops
#
# This is the SINGLE SOURCE OF TRUTH for crash prevention.
# Consolidated from ADRs: 0060, 0068, 0073, 0127, 0128, 0130, 0133, 0157, 0189
#
# v0.33.0 - Initial consolidation

set +e

# ============================================================================
# CRASH CATEGORY 1: BASH HEREDOC DETECTION
# ============================================================================

# Patterns that cause INFINITE HANGS (shell waits forever for EOF)
detect_bash_hang_pattern() {
  local command="$1"

  # Heredoc patterns (MOST DANGEROUS)
  if echo "$command" | grep -qE "<<-?[[:space:]]*['\"]?[A-Za-z_]+" 2>/dev/null; then
    echo "heredoc"
    return 0
  fi

  # Cat stdin redirect (waits forever)
  if echo "$command" | grep -qE "^[[:space:]]*cat[[:space:]]+>[[:space:]]*[^>]" 2>/dev/null; then
    echo "cat-stdin"
    return 0
  fi

  # DD command with output file
  if echo "$command" | grep -qE "^[[:space:]]*dd[[:space:]].*of=" 2>/dev/null; then
    echo "dd-stdin"
    return 0
  fi

  # Echo/printf to file (truncation risk)
  if echo "$command" | grep -qE "^[[:space:]]*(echo|printf)[[:space:]]" 2>/dev/null; then
    if echo "$command" | grep -qE '>[[:space:]]*[^>]' 2>/dev/null; then
      if ! echo "$command" | grep -qE '>>' 2>/dev/null; then
        echo "echo-redirect"
        return 0
      fi
    fi
  fi

  return 1
}

# ============================================================================
# CRASH CATEGORY 2: CONTEXT BUDGET ESTIMATION
# ============================================================================

# Rough token estimation (1 token ≈ 4 chars)
estimate_tokens() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local chars
    chars=$(wc -c < "$file" 2>/dev/null || echo "0")
    echo $((chars / 4))
  else
    echo "0"
  fi
}

# Check if context is in danger zone
check_context_budget() {
  local project_root="$1"
  local active_increment="$2"

  local total_tokens=0
  local warning_threshold=150000  # ~150K tokens
  local danger_threshold=200000   # ~200K tokens

  # Estimate increment context
  if [[ -n "$active_increment" ]] && [[ -d "$project_root/.specweave/increments/$active_increment" ]]; then
    local inc_dir="$project_root/.specweave/increments/$active_increment"

    local spec_tokens=$(estimate_tokens "$inc_dir/spec.md")
    local plan_tokens=$(estimate_tokens "$inc_dir/plan.md")
    local tasks_tokens=$(estimate_tokens "$inc_dir/tasks.md")

    total_tokens=$((spec_tokens + plan_tokens + tasks_tokens))
  fi

  # Return status
  if [[ $total_tokens -gt $danger_threshold ]]; then
    echo "DANGER:$total_tokens"
    return 2
  elif [[ $total_tokens -gt $warning_threshold ]]; then
    echo "WARNING:$total_tokens"
    return 1
  else
    echo "OK:$total_tokens"
    return 0
  fi
}

# Count tasks in active increment
count_increment_tasks() {
  local project_root="$1"
  local active_increment="$2"

  local tasks_file="$project_root/.specweave/increments/$active_increment/tasks.md"
  if [[ -f "$tasks_file" ]]; then
    grep -c "^### T-" "$tasks_file" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# ============================================================================
# CRASH CATEGORY 3: PROCESS STORM DETECTION
# ============================================================================

# Count running hook processes
count_hook_processes() {
  ps aux 2>/dev/null | grep -c "specweave.*hook" || echo "0"
}

# Detect if we're in a process storm
detect_process_storm() {
  local threshold="${1:-20}"
  local count
  count=$(count_hook_processes)

  if [[ "$count" -gt "$threshold" ]]; then
    echo "STORM:$count"
    return 1
  fi
  echo "OK:$count"
  return 0
}

# ============================================================================
# CRASH CATEGORY 4: ZOMBIE PROCESS DETECTION
# ============================================================================

# Find and kill zombie heredoc processes
kill_zombie_heredocs() {
  # Kill any cat processes waiting for EOF
  pkill -f "cat.*EOF" 2>/dev/null || true
  pkill -f "cat.*<<" 2>/dev/null || true

  # Kill stale bash processes related to specweave hooks
  local stale_pids
  stale_pids=$(ps aux 2>/dev/null | grep -E "bash.*specweave.*hook" | grep -v grep | awk '{print $2}' | head -10)

  for pid in $stale_pids; do
    # Check if process is older than 30 seconds
    local elapsed
    elapsed=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
    if [[ -n "$elapsed" ]] && [[ "$elapsed" -gt 30 ]]; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

# ============================================================================
# CRASH CATEGORY 5: LOCK FILE CLEANUP
# ============================================================================

# Clean stale lock files (older than 60s)
clean_stale_locks() {
  local project_root="$1"
  local state_dir="$project_root/.specweave/state"

  [[ ! -d "$state_dir" ]] && return

  find "$state_dir" -name "*.lock" -type d -mmin +1 2>/dev/null | while read -r lock; do
    rmdir "$lock" 2>/dev/null || true
  done

  # Also clean stale guard files
  find "$state_dir" -name ".hook-*-guard" -type f -mmin +1 2>/dev/null | while read -r guard; do
    rm -f "$guard" 2>/dev/null
  done
}

# ============================================================================
# CRASH CATEGORY 6: SESSION HEALTH CHECK
# ============================================================================

# Comprehensive health check
check_session_health() {
  local project_root="$1"
  local issues=()

  # Check 1: Process storm
  local storm_status
  storm_status=$(detect_process_storm 15)
  if [[ "$storm_status" == STORM* ]]; then
    issues+=("Process storm detected: $storm_status")
  fi

  # Check 2: Stale locks
  local stale_locks
  stale_locks=$(find "$project_root/.specweave/state" -name "*.lock" -type d -mmin +1 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$stale_locks" -gt 0 ]]; then
    issues+=("Stale locks: $stale_locks")
  fi

  # Check 3: Circuit breaker status
  local cb_file="$project_root/.specweave/state/.hook-circuit-breaker"
  if [[ -f "$cb_file" ]]; then
    local failures
    failures=$(cat "$cb_file" 2>/dev/null || echo "0")
    if [[ "$failures" -ge 3 ]]; then
      issues+=("Circuit breaker OPEN: $failures failures")
    fi
  fi

  # Check 4: Active increment task count
  local active_inc
  active_inc=$(find "$project_root/.specweave/increments" -maxdepth 1 -type d -name "[0-9]*" 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  if [[ -n "$active_inc" ]]; then
    local task_count
    task_count=$(count_increment_tasks "$project_root" "$active_inc")
    if [[ "$task_count" -gt 8 ]]; then
      issues+=("Task count exceeds limit: $task_count/8 in $active_inc")
    fi
  fi

  # Report
  if [[ ${#issues[@]} -eq 0 ]]; then
    echo "HEALTHY"
    return 0
  else
    echo "ISSUES:"
    printf '%s\n' "${issues[@]}"
    return 1
  fi
}

# ============================================================================
# CRASH CATEGORY 7: EMERGENCY CLEANUP
# ============================================================================

# Nuclear option: clean ALL state
emergency_cleanup() {
  local project_root="$1"

  echo "=== EMERGENCY CLEANUP ==="

  # 1. Kill zombie processes
  echo "1. Killing zombie processes..."
  kill_zombie_heredocs
  pkill -9 -f "bash.*specweave" 2>/dev/null || true

  # 2. Remove all locks
  echo "2. Removing all locks..."
  rm -rf "$project_root/.specweave/state/"*.lock 2>/dev/null
  rm -f "$project_root/.specweave/state/.hook-"* 2>/dev/null
  rm -f "$project_root/.specweave/state/.processor.lock" 2>/dev/null

  # 3. Reset circuit breakers
  echo "3. Resetting circuit breakers..."
  rm -f "$project_root/.specweave/state/.hook-circuit-breaker"* 2>/dev/null

  # 4. Clear dedup cache
  echo "4. Clearing dedup cache..."
  rm -rf "$project_root/.specweave/state/.dedup-cache" 2>/dev/null

  # 5. Clear bulk operation counter
  echo "5. Clearing bulk operation counter..."
  rm -f "$project_root/.specweave/state/.bulk-op-counter" 2>/dev/null

  echo "=== CLEANUP COMPLETE ==="
  echo "Restart Claude Code to continue."
}

# ============================================================================
# RUNTIME GUARDS (for use in hooks)
# ============================================================================

# Pre-execution guard for any hook
guard_hook_execution() {
  local hook_name="$1"
  local project_root="$2"

  # Check for process storm
  local storm
  storm=$(detect_process_storm 20)
  if [[ "$storm" == STORM* ]]; then
    echo "[GUARD] Blocking $hook_name: $storm" >&2
    return 1
  fi

  return 0
}

# ============================================================================
# MAIN (when run directly)
# ============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-health}" in
    health)
      PROJECT_ROOT=$(find "$PWD" -maxdepth 3 -type d -name ".specweave" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
      if [[ -n "$PROJECT_ROOT" ]]; then
        check_session_health "$PROJECT_ROOT"
      else
        echo "Not in a SpecWeave project"
        exit 1
      fi
      ;;
    cleanup)
      PROJECT_ROOT=$(find "$PWD" -maxdepth 3 -type d -name ".specweave" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
      if [[ -n "$PROJECT_ROOT" ]]; then
        emergency_cleanup "$PROJECT_ROOT"
      else
        echo "Not in a SpecWeave project"
        exit 1
      fi
      ;;
    kill-zombies)
      kill_zombie_heredocs
      echo "Zombie processes cleaned"
      ;;
    *)
      echo "Usage: $0 {health|cleanup|kill-zombies}"
      exit 1
      ;;
  esac
fi
