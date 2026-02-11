#!/bin/bash
# stop-reflect.sh - Session Reflection Hook (v3.1 - Structured Decision Logging)
#
# ARCHITECTURE (v3.1):
# - Uses specweave CLI (TypeScript) for reflection
# - Learnings go to CLAUDE.md under "## Skill Memories" section
# - User can disable via config: { "reflect": { "enabled": false } }
# - Structured decision logging to .specweave/logs/decisions.jsonl
#
# This hook ALWAYS approves (never blocks sessions) but may trigger
# background learning extraction if enabled.

set +e  # Never fail - this is a non-critical hook

# Capture start time for duration tracking (macOS doesn't support %N, fallback to seconds only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    _START_TIME_MS=$(($(date +%s) * 1000))
else
    _START_TIME_MS=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0")))
fi

# Read input from stdin (required by Claude Code hooks)
INPUT=$(cat)

# Parse input fields
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null)

# Project root detection (walk up to find .specweave/ — prevents pollution of subdirectories)
if [[ -n "${PROJECT_ROOT:-}" ]] && [[ -d "$PROJECT_ROOT/.specweave" ]]; then
    : # env var already set and valid
else
    PROJECT_ROOT="$PWD"
    while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
        PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
    done
fi

# Not a SpecWeave project — approve and exit (MUST be before any mkdir)
if [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
    echo '{"decision":"approve"}'
    exit 0
fi

CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
STATE_DIR="$PROJECT_ROOT/.specweave/state"

# Source the shared decision logging utility
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/log-decision.sh" ]; then
    source "$SCRIPT_DIR/log-decision.sh"
fi

# Get duration in milliseconds
_get_duration_ms() {
    local end_time_ms
    if [[ "$OSTYPE" == "darwin"* ]]; then
        end_time_ms=$(($(date +%s) * 1000))
    else
        end_time_ms=$(($(date +%s) * 1000 + $(date +%N 2>/dev/null | cut -c1-3 || echo "0")))
    fi
    echo $((end_time_ms - _START_TIME_MS))
}

# Ensure logs directory exists
mkdir -p "$LOGS_DIR" 2>/dev/null || true

# Logging function
log_reflect() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)
    local log_file="$LOGS_DIR/reflect.log"

    # Rotate if too large (keep last 50 lines)
    if [ -f "$log_file" ]; then
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        if [ "$lines" -gt 100 ]; then
            tail -n 50 "$log_file" > "$log_file.tmp" 2>/dev/null && mv "$log_file.tmp" "$log_file" 2>/dev/null || true
        fi
    fi

    echo "[$timestamp] [$level] $*" >> "$log_file" 2>/dev/null || true
}

# Log decision with context for structured logging
log_reflect_decision() {
    local reason_code="$1"
    local reason="$2"
    local transcript_lines="${3:-0}"
    local reflection_enabled="${4:-true}"
    local learnings_extracted="${5:-0}"
    local learning_categories_json="${6:-[]}"

    if type log_decision &>/dev/null; then
        local context_json
        context_json=$(jq -n \
            --argjson transcriptLines "$transcript_lines" \
            --argjson reflectionEnabled "$reflection_enabled" \
            --argjson learningsExtracted "$learnings_extracted" \
            --argjson learningCategories "$learning_categories_json" \
            --arg exitReason "$reason_code" \
            --arg triggerReason "session_end" \
            '{
                transcriptLines: $transcriptLines,
                reflectionEnabled: $reflectionEnabled,
                learningsExtracted: $learningsExtracted,
                learningCategories: $learningCategories,
                exitReason: $exitReason,
                triggerReason: $triggerReason
            }')

        log_decision "stop-reflect" "approve" "$reason_code" "$reason" "$context_json" "$(_get_duration_ms)"
    fi
}

# Check if reflection is enabled
is_reflect_enabled() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return 0  # Default to enabled if no config
    fi

    # Note: can't use // true because jq treats false as falsy
    local enabled=$(jq -r 'if .reflect.enabled == false then "false" else "true" end' "$CONFIG_FILE" 2>/dev/null)
    [ "$enabled" = "true" ]
}

# Cleanup ephemeral state files
cleanup_session_state() {
    rm -f "$STATE_DIR/.current-agent-type" 2>/dev/null || true
}

# Cross-platform timeout function
# macOS doesn't have GNU timeout - needs gtimeout (coreutils) or perl fallback
run_with_timeout() {
    local timeout_sec="$1"
    shift

    # Try gtimeout first (macOS with coreutils: brew install coreutils)
    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_sec" "$@"
        return $?
    fi

    # Try GNU timeout (Linux, or macOS with coreutils in PATH)
    if command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_sec" "$@"
        return $?
    fi

    # Perl fallback (available on all macOS/Linux by default)
    # alarm() sends SIGALRM after N seconds, which terminates the exec'd process
    perl -e 'alarm shift; exec @ARGV' "$timeout_sec" "$@"
    return $?
}

# Run reflection using TypeScript implementation
run_reflection() {
    local transcript="$1"

    # Check if reflect is enabled
    if ! is_reflect_enabled; then
        log_reflect "info" "Reflection disabled in config"
        return 0
    fi

    # Ensure transcript exists
    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        log_reflect "info" "No transcript available"
        return 0
    fi

    # Check transcript has meaningful content
    local lines=$(wc -l < "$transcript" 2>/dev/null | tr -d ' ')
    if [ "$lines" -lt 10 ]; then
        log_reflect "info" "Transcript too short ($lines lines)"
        return 0
    fi

    log_reflect "info" "Starting reflection ($lines lines)"

    # Use specweave CLI (TypeScript implementation)
    if command -v specweave >/dev/null 2>&1; then
        (
            cd "$PROJECT_ROOT"
            run_with_timeout 60 specweave reflect-stop "$transcript" --silent >> "$LOGS_DIR/auto-reflect.log" 2>&1
            local result=$?

            if [ $result -eq 0 ]; then
                log_reflect "info" "Reflection completed successfully"
            elif [ $result -eq 124 ]; then
                log_reflect "warn" "Reflection timed out"
            else
                log_reflect "warn" "Reflection completed with exit code $result"
            fi
        ) &
        log_reflect "info" "Reflection started in background"
    else
        log_reflect "warn" "specweave CLI not found"
    fi

    return 0
}

# Run reflection with structured logging (synchronous for test purposes, captures learnings)
run_reflection_with_logging() {
    local transcript="$1"
    local transcript_lines="$2"
    local learnings_extracted=0
    local learning_categories="[]"
    local exit_reason="nothing_to_learn"
    local reason_msg="No learnings extracted"

    log_reflect "info" "Starting reflection ($transcript_lines lines)"

    # Use specweave CLI (TypeScript implementation)
    if command -v specweave >/dev/null 2>&1; then
        # Create a temp file to capture output
        local temp_output
        temp_output=$(mktemp)

        (
            cd "$PROJECT_ROOT"
            run_with_timeout 60 specweave reflect-stop "$transcript" --silent 2>&1 | tee "$temp_output" >> "$LOGS_DIR/auto-reflect.log"
            local result=$?

            # Parse learnings from output
            if [ -f "$temp_output" ]; then
                # Try to extract learnings count from output
                local count_line
                count_line=$(grep -i "learnings extracted:" "$temp_output" 2>/dev/null | head -1)
                if [ -n "$count_line" ]; then
                    learnings_extracted=$(echo "$count_line" | grep -oE '[0-9]+' | head -1)
                    learnings_extracted=${learnings_extracted:-0}
                fi

                # Try to extract categories from output
                local cat_line
                cat_line=$(grep -i "categories:" "$temp_output" 2>/dev/null | head -1)
                if [ -n "$cat_line" ]; then
                    # Convert "Categories: devops, logging" to JSON array
                    local cats
                    cats=$(echo "$cat_line" | sed 's/.*[Cc]ategories:[[:space:]]*//' | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' | jq -R . | jq -s .)
                    learning_categories=${cats:-"[]"}
                fi
            fi

            # Determine exit reason based on result and learnings
            if [ $result -eq 124 ]; then
                exit_reason="timeout"
                reason_msg="Reflection timed out"
                log_reflect "warn" "Reflection timed out"
            elif [ $result -ne 0 ]; then
                exit_reason="error"
                reason_msg="Reflection error (exit $result)"
                log_reflect "warn" "Reflection completed with exit code $result"
            elif [ "$learnings_extracted" -gt 0 ]; then
                exit_reason="learnings_saved"
                reason_msg="Extracted $learnings_extracted learnings"
                log_reflect "info" "Reflection completed successfully"
            else
                exit_reason="nothing_to_learn"
                reason_msg="No learnings to extract"
                log_reflect "info" "Reflection completed - no learnings"
            fi

            # Log the decision with full context
            log_reflect_decision "$exit_reason" "$reason_msg" "$transcript_lines" true "$learnings_extracted" "$learning_categories"

            rm -f "$temp_output" 2>/dev/null
        ) &
        log_reflect "info" "Reflection started in background"
    else
        log_reflect "warn" "specweave CLI not found"
        log_reflect_decision "error" "specweave CLI not found" "$transcript_lines" true 0 "[]"
    fi

    return 0
}

# Main execution
main() {
    # SILENT approve - prevents UI feedback loops
    local silent_approve='{"decision":"approve"}'

    # Always cleanup ephemeral session state
    cleanup_session_state

    # Check if reflection is enabled first
    local reflect_enabled=true
    if [ -f "$CONFIG_FILE" ]; then
        local enabled_val
        # Note: can't use // true because jq treats false as falsy
        # Use if-then-else to properly handle boolean false
        enabled_val=$(jq -r 'if .reflect.enabled == false then "false" else "true" end' "$CONFIG_FILE" 2>/dev/null)
        if [ "$enabled_val" = "false" ]; then
            reflect_enabled=false
        fi
    fi

    # Quick bail if no transcript
    if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
        log_reflect_decision "no_transcript" "No transcript available" 0 "$reflect_enabled" 0 "[]"
        echo "$silent_approve"
        exit 0
    fi

    # Get transcript line count
    local transcript_lines
    transcript_lines=$(wc -l < "$TRANSCRIPT_PATH" 2>/dev/null | tr -d ' ') || transcript_lines=0

    # Check if reflection is disabled
    if [ "$reflect_enabled" = "false" ]; then
        log_reflect_decision "disabled" "Reflection disabled in config" "$transcript_lines" false 0 "[]"
        echo "$silent_approve"
        exit 0
    fi

    # Check if transcript is too short
    if [ "$transcript_lines" -lt 10 ]; then
        log_reflect_decision "transcript_too_short" "Transcript too short ($transcript_lines lines)" "$transcript_lines" true 0 "[]"
        echo "$silent_approve"
        exit 0
    fi

    # Run reflection (async, non-blocking) and capture learnings
    run_reflection_with_logging "$TRANSCRIPT_PATH" "$transcript_lines"

    # Always approve
    echo "$silent_approve"
    exit 0
}

main
