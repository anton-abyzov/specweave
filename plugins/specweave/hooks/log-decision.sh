#!/bin/bash
# log-decision.sh - Structured Decision Logging Utility
#
# Shared utility for all SpecWeave hooks to log decisions in structured JSON format.
# Inspired by Claude Code 2.1.27's "Added tool call failures and denials to debug logs"
#
# Usage:
#   source log-decision.sh
#   log_decision "hook_name" "decision" "reason_code" "reason" "context_json" duration_ms
#
# Output:
#   - Appends JSON entry to .specweave/logs/decisions.jsonl
#   - Debug output to stderr when SPECWEAVE_DEBUG_HOOKS=1
#
# Schema:
#   {
#     "timestamp": "ISO8601",
#     "hook": "stop-auto|stop-reflect|user-prompt-submit",
#     "decision": "approve|block",
#     "reason": "Human-readable reason",
#     "reasonCode": "machine_parseable_enum",
#     "durationMs": 123,
#     "context": { ... hook-specific context ... }
#   }

# Max log size before rotation (10MB)
_LOG_MAX_SIZE=10485760

# Debug logging to stderr (only when SPECWEAVE_DEBUG_HOOKS=1)
_log_debug() {
    if [ "${SPECWEAVE_DEBUG_HOOKS:-0}" = "1" ]; then
        local color_reset="\033[0m"
        local color_cyan="\033[36m"
        local color_green="\033[32m"
        local color_red="\033[31m"
        local color_yellow="\033[33m"

        local level="$1"
        shift
        local message="$*"

        local color="$color_cyan"
        case "$level" in
            "DECISION") color="$color_green" ;;
            "BLOCK") color="$color_red" ;;
            "WARN") color="$color_yellow" ;;
        esac

        echo -e "${color}[$level]${color_reset} $message" >&2
    fi
}

# Rotate log file if it exceeds max size
_rotate_log_if_needed() {
    local log_file="$1"

    if [ ! -f "$log_file" ]; then
        return 0
    fi

    local file_size
    # Cross-platform file size (macOS vs Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_size=$(stat -f%z "$log_file" 2>/dev/null || echo "0")
    else
        file_size=$(stat -c%s "$log_file" 2>/dev/null || echo "0")
    fi

    if [ "$file_size" -gt "$_LOG_MAX_SIZE" ]; then
        _log_debug "WARN" "Log rotation triggered (${file_size} > ${_LOG_MAX_SIZE})"

        # Keep last ~5MB by taking last N lines
        # Estimate: average 500 bytes per line, so 5MB = ~10000 lines
        local temp_file="${log_file}.tmp"
        tail -n 10000 "$log_file" > "$temp_file" 2>/dev/null
        mv "$temp_file" "$log_file" 2>/dev/null

        _log_debug "INFO" "Log rotated, kept last 10000 entries"
    fi
}

# Main logging function
# Arguments:
#   $1: hook_name - Name of the hook (stop-auto, stop-reflect, etc.)
#   $2: decision - Decision made (approve, block)
#   $3: reason_code - Machine-parseable reason code (session_inactive, work_remaining, etc.)
#   $4: reason - Human-readable reason message
#   $5: context_json - JSON string with hook-specific context (default: "{}")
#   $6: duration_ms - Execution time in milliseconds (default: 0)
log_decision() {
    local hook_name="$1"
    local decision="$2"
    local reason_code="$3"
    local reason="$4"
    local context_json="${5:-"{}"}"
    local duration_ms="${6:-0}"

    # Compute paths based on current PROJECT_ROOT
    local project_root="${PROJECT_ROOT:-$(pwd)}"
    local log_dir="$project_root/.specweave/logs"
    local log_file="$log_dir/decisions.jsonl"

    # Validate required arguments
    if [ -z "$hook_name" ] || [ -z "$decision" ] || [ -z "$reason_code" ]; then
        _log_debug "WARN" "log_decision called with missing arguments"
        return 1
    fi

    # Guard: only create dirs in initialized SpecWeave projects (prevents .specweave pollution)
    if [ ! -d "$project_root/.specweave/increments" ] && [ ! -f "$project_root/.specweave/config.json" ]; then
        _log_debug "WARN" "Not a SpecWeave project, skipping decision log"
        return 0
    fi

    # Ensure logs directory exists
    if [ ! -d "$log_dir" ]; then
        mkdir -p "$log_dir" 2>/dev/null
        _log_debug "INFO" "Created logs directory: $log_dir"
    fi

    # Check for log rotation
    _rotate_log_if_needed "$log_file"

    # Generate ISO 8601 timestamp
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)

    # Escape special characters in reason for JSON
    local escaped_reason
    escaped_reason=$(printf '%s' "$reason" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')

    # Build JSON entry using jq
    local json_entry
    json_entry=$(jq -n -c \
        --arg timestamp "$timestamp" \
        --arg hook "$hook_name" \
        --arg decision "$decision" \
        --arg reason "$escaped_reason" \
        --arg reasonCode "$reason_code" \
        --argjson durationMs "$duration_ms" \
        --argjson context "$context_json" \
        '{
            timestamp: $timestamp,
            hook: $hook,
            decision: $decision,
            reason: $reason,
            reasonCode: $reasonCode,
            durationMs: $durationMs,
            context: $context
        }' 2>/dev/null)

    # Fallback if jq fails
    if [ -z "$json_entry" ]; then
        json_entry="{\"timestamp\":\"$timestamp\",\"hook\":\"$hook_name\",\"decision\":\"$decision\",\"reason\":\"$escaped_reason\",\"reasonCode\":\"$reason_code\",\"durationMs\":$duration_ms,\"context\":$context_json}"
    fi

    # Append to log file
    printf '%s\n' "$json_entry" >> "$log_file" 2>/dev/null

    # Debug output
    if [ "$decision" = "block" ]; then
        _log_debug "BLOCK" "$hook_name: $reason_code - $reason"
    else
        _log_debug "DECISION" "$hook_name: $decision ($reason_code)"
    fi

    return 0
}
