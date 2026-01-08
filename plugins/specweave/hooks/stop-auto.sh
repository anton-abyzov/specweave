#!/bin/bash
# stop-auto.sh - Stop Hook for Auto Continuation Loop
#
# This hook implements the Ralph Wiggum pattern with WORLD-CLASS testing:
# - Returns {"decision": "block"} to prevent Claude from exiting
# - Re-feeds prompt with iteration context
# - Returns {"decision": "approve"} when work is complete
#
# CRITICAL ENHANCEMENTS (v2.0):
# - Parses actual test RESULTS, not just execution
# - Self-healing loop with max 3 retries per test failure
# - Extracts specific failure details for fix prompts
# - Blocks on ANY test failure (not just >3)
#
# AGENT HIERARCHY LABELS (v2.4):
# - Detects agent type: MAIN ORCHESTRATOR vs SUBAGENT
# - Clear session stop/continue labels with box art
# - Shows "WHEN WILL SESSION STOP?" criteria prominently
# - Subagents show "Returns to: Main Orchestrator" on completion
# - Tracks subagent spawns in session stats
#
# IMPORTANT (v2.3+): Stop hook runs PER AGENT
# - Each spawned subagent (Task tool) gets its own stop hook invocation
# - Iteration count is SHARED across all agents via session file
# - Parent agent's exit triggers hook, subagent exits do NOT by default
# - This means iteration count reflects MAIN agent loops, not subagent work
# - Subagents with stop hooks enabled will ALSO trigger this hook
#
# Claude Code Stop Hook receives:
# - stdin: JSON with transcript_path, stop_hook_active, etc.
# - Expected output: JSON with decision (approve/block) and optional reason/systemMessage

set -e

# Read input from stdin
INPUT=$(cat)

# Parse input fields
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/auto-session.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# ============================================================================
# REFLECT HOOK INTEGRATION - REMOVED (v2.8)
# ============================================================================
# Reflect is now handled by stop-reflect.sh via stop-dispatcher.sh
# This ensures reflect runs on ALL sessions, not just auto mode.
# See: stop-dispatcher.sh for the new architecture.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================================
# CONTEXT SIZE MANAGEMENT - REMOVED (v2.4)
# ============================================================================
# Previously we had custom context size tracking and warnings here.
# REMOVED because Claude Code v2.0.64+ has excellent native auto-compact:
#
# - Instant auto-compacting at smart thresholds (~64-75%)
# - Completion buffer prevents mid-operation interrupts
# - PreCompact hook available for custom logic if needed
# - 3x memory optimization for large conversations
# - Real-time context window % shown in status line
#
# Our custom tracking was:
# - Redundant (duplicated native behavior)
# - Inaccurate (estimated from file size vs actual tokens)
# - Noisy (added warnings without benefit)
#
# Trust Claude Code's native context management instead.
# See: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
# ============================================================================

# ============================================================================
# HEARTBEAT MECHANISM (NEW - v2.1)
# Updates heartbeat timestamp for watchdog detection
# ============================================================================

HEARTBEAT_FILE="$STATE_DIR/heartbeat.json"
HEARTBEAT_STALE_MINUTES=5  # Session is stale if no heartbeat for 5 minutes

# Update heartbeat timestamp
update_heartbeat() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local session_id="${SESSION_ID:-unknown}"

    cat > "$HEARTBEAT_FILE" << EOF
{
  "timestamp": "$timestamp",
  "sessionId": "$session_id",
  "pid": $$,
  "iteration": ${ITERATION:-0}
}
EOF
}

# Check if heartbeat is stale
check_heartbeat_stale() {
    if [ ! -f "$HEARTBEAT_FILE" ]; then
        echo "no_heartbeat"
        return
    fi

    local last_heartbeat=$(jq -r '.timestamp' "$HEARTBEAT_FILE" 2>/dev/null)
    if [ -z "$last_heartbeat" ] || [ "$last_heartbeat" = "null" ]; then
        echo "invalid"
        return
    fi

    # Parse timestamp and check age
    local now_epoch=$(date "+%s")
    local heartbeat_epoch

    # Try different date parsing methods
    heartbeat_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_heartbeat" "+%s" 2>/dev/null) || \
    heartbeat_epoch=$(date -d "$last_heartbeat" "+%s" 2>/dev/null) || \
    heartbeat_epoch=$(python3 -c "import datetime; print(int(datetime.datetime.fromisoformat('$last_heartbeat'.replace('Z','+00:00')).timestamp()))" 2>/dev/null) || \
    heartbeat_epoch=0

    if [ "$heartbeat_epoch" -eq 0 ]; then
        echo "parse_error"
        return
    fi

    local age_seconds=$((now_epoch - heartbeat_epoch))
    local stale_threshold=$((HEARTBEAT_STALE_MINUTES * 60))

    if [ "$age_seconds" -gt "$stale_threshold" ]; then
        echo "stale:${age_seconds}s"
    else
        echo "ok:${age_seconds}s"
    fi
}

# ============================================================================
# TASK-LEVEL CHECKPOINTS (NEW - v2.1)
# Save/restore progress at task boundaries
# ============================================================================

CHECKPOINT_FILE="$STATE_DIR/task-checkpoint.json"

# Save checkpoint before starting task
save_task_checkpoint() {
    local task_id="$1"
    local increment_id="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    cat > "$CHECKPOINT_FILE" << EOF
{
  "taskId": "$task_id",
  "incrementId": "$increment_id",
  "timestamp": "$timestamp",
  "status": "in_progress",
  "iteration": ${ITERATION:-0}
}
EOF

    echo "{\"timestamp\":\"$timestamp\",\"event\":\"checkpoint_saved\",\"task\":\"$task_id\"}" >> "$LOGS_DIR/auto-iterations.log"
}

# Load checkpoint if exists
load_task_checkpoint() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        cat "$CHECKPOINT_FILE"
    else
        echo '{"taskId":null,"status":"none"}'
    fi
}

# Clear checkpoint on task completion
clear_task_checkpoint() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        local task_id=$(jq -r '.taskId' "$CHECKPOINT_FILE" 2>/dev/null)
        rm -f "$CHECKPOINT_FILE"
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"checkpoint_cleared\",\"task\":\"$task_id\"}" >> "$LOGS_DIR/auto-iterations.log"
    fi
}

# Check for incomplete checkpoint (crash recovery)
check_incomplete_checkpoint() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        local status=$(jq -r '.status' "$CHECKPOINT_FILE" 2>/dev/null)
        if [ "$status" = "in_progress" ]; then
            echo "incomplete"
            return
        fi
    fi
    echo "none"
}

# ============================================================================
# COMMAND TIMEOUT WRAPPER (NEW - v2.1)
# Wraps commands with timeout to prevent hangs
# ============================================================================

DEFAULT_COMMAND_TIMEOUT=600  # 10 minutes default
TEST_COMMAND_TIMEOUT=600     # 10 minutes for tests
BUILD_COMMAND_TIMEOUT=1200   # 20 minutes for builds

# ============================================================================
# TDD MODE & STRICT TEST REQUIREMENTS (NEW - v2.2)
# When TDD mode is enabled, tests MUST be green before allowing completion
# ============================================================================

CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"

# Get TDD/testing mode from config
get_test_mode() {
    if [ -f "$CONFIG_FILE" ]; then
        local mode=$(jq -r '.testing.defaultTestMode // "test-after"' "$CONFIG_FILE" 2>/dev/null)
        echo "$mode"
    else
        echo "test-after"
    fi
}

# Get TDD mode from increment-specific config (NEW - v2.2)
# Priority: 1. Increment metadata.json 2. Increment config.json 3. Session 4. Global config
get_increment_tdd_mode() {
    local increment_id="$1"
    local increment_dir="$PROJECT_ROOT/.specweave/increments/$increment_id"

    # 1. Check increment metadata.json first (highest priority)
    local inc_metadata="$increment_dir/metadata.json"
    if [ -f "$inc_metadata" ]; then
        local inc_tdd=$(jq -r '.tddMode // null' "$inc_metadata" 2>/dev/null)
        if [ "$inc_tdd" != "null" ] && [ -n "$inc_tdd" ]; then
            echo "$inc_tdd"
            return
        fi

        # Also check testMode field
        local inc_test_mode=$(jq -r '.testMode // null' "$inc_metadata" 2>/dev/null)
        if [ "$inc_test_mode" = "tdd" ] || [ "$inc_test_mode" = "test-first" ]; then
            echo "true"
            return
        fi
    fi

    # 2. Check increment-specific config.json
    local inc_config="$increment_dir/config.json"
    if [ -f "$inc_config" ]; then
        local inc_tdd=$(jq -r '.tddMode // null' "$inc_config" 2>/dev/null)
        if [ "$inc_tdd" != "null" ] && [ -n "$inc_tdd" ]; then
            echo "$inc_tdd"
            return
        fi

        local inc_test_mode=$(jq -r '.testing.mode // null' "$inc_config" 2>/dev/null)
        if [ "$inc_test_mode" = "tdd" ] || [ "$inc_test_mode" = "test-first" ]; then
            echo "true"
            return
        fi
    fi

    # 3. Check spec.md frontmatter for tdd: true
    local spec_file="$increment_dir/spec.md"
    if [ -f "$spec_file" ]; then
        # Extract YAML frontmatter and check for tdd flag
        local spec_tdd=$(sed -n '/^---$/,/^---$/p' "$spec_file" 2>/dev/null | grep -E '^tdd:\s*true' | head -1)
        if [ -n "$spec_tdd" ]; then
            echo "true"
            return
        fi
    fi

    # Return empty - let caller check session/global
    echo ""
}

# Get TDD strict mode from session or config
# Priority: Increment > Session > Global config
is_tdd_strict_mode() {
    # 1. Check increment-specific config FIRST (NEW - v2.2)
    if [ -n "$CURRENT_INCREMENT" ]; then
        local inc_tdd=$(get_increment_tdd_mode "$CURRENT_INCREMENT")
        if [ "$inc_tdd" = "true" ]; then
            echo "true"
            return
        elif [ "$inc_tdd" = "false" ]; then
            echo "false"
            return
        fi
    fi

    # 2. Check session (--tdd flag from setup-auto.sh)
    local session_tdd=$(echo "$SESSION" 2>/dev/null | jq -r '.tddMode // false')
    if [ "$session_tdd" = "true" ]; then
        echo "true"
        return
    fi

    # 3. Check global config
    local config_mode=$(get_test_mode)
    if [ "$config_mode" = "tdd" ] || [ "$config_mode" = "test-first" ]; then
        echo "true"
        return
    fi

    echo "false"
}

# Get coverage targets from config
get_coverage_targets() {
    if [ -f "$CONFIG_FILE" ]; then
        local unit=$(jq -r '.testing.coverageTargets.unit // 80' "$CONFIG_FILE" 2>/dev/null)
        local integration=$(jq -r '.testing.coverageTargets.integration // 80' "$CONFIG_FILE" 2>/dev/null)
        local e2e=$(jq -r '.testing.coverageTargets.e2e // 80' "$CONFIG_FILE" 2>/dev/null)
        echo "{\"unit\":$unit,\"integration\":$integration,\"e2e\":$e2e}"
    else
        echo '{"unit":80,"integration":80,"e2e":80}'
    fi
}

# ============================================================================
# AGENT TYPE DETECTION & HIERARCHY (NEW - v2.4)
# Distinguishes main orchestrator from subagents for clear labeling
# ============================================================================

# Agent type constants
AGENT_TYPE_ORCHESTRATOR="orchestrator"
AGENT_TYPE_SUBAGENT="subagent"

# Detect if this is main orchestrator or a subagent
# Returns: "orchestrator" or "subagent:<type>"
detect_agent_type() {
    local transcript="$1"

    # No transcript = assume orchestrator
    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        echo "$AGENT_TYPE_ORCHESTRATOR"
        return
    fi

    # Check for /sw:auto command - indicates main orchestrator
    if grep -qE '(/sw:auto|/specweave:auto|setup-auto\.sh)' "$transcript" 2>/dev/null; then
        echo "$AGENT_TYPE_ORCHESTRATOR"
        return
    fi

    # Check for subagent invocation patterns in transcript
    # Subagents are spawned via Task tool with subagent_type parameter
    local subagent_pattern='subagent_type.*?["\x27]([^"\x27]+)["\x27]'
    local subagent_match=$(grep -oE 'subagent_type["\x27]*:\s*["\x27]?[a-zA-Z0-9_:-]+' "$transcript" 2>/dev/null | tail -1)

    if [ -n "$subagent_match" ]; then
        # Extract the type name
        local agent_name=$(echo "$subagent_match" | sed 's/.*["\x27]\([^"\x27]*\)["\x27].*/\1/' | sed 's/subagent_type["\x27]*:\s*["\x27]*//')
        if [ -n "$agent_name" ] && [ "$agent_name" != "subagent_type" ]; then
            echo "$AGENT_TYPE_SUBAGENT:$agent_name"
            return
        fi
    fi

    # Check for specialized agent prompts (subagent indicators)
    if grep -qE '(You are a specialized agent|Task tool|subagent|Agent type:)' "$transcript" 2>/dev/null; then
        # Try to extract agent type from common patterns
        local agent_desc=$(grep -oE '(architect|qa-engineer|security|devops|frontend|backend|ml-engineer|data-scientist|sre|tech-lead|docs-writer)' "$transcript" 2>/dev/null | head -1)
        if [ -n "$agent_desc" ]; then
            echo "$AGENT_TYPE_SUBAGENT:$agent_desc"
            return
        fi
        echo "$AGENT_TYPE_SUBAGENT:unknown"
        return
    fi

    # Default to orchestrator if no subagent patterns found
    echo "$AGENT_TYPE_ORCHESTRATOR"
}

# Get human-readable agent display name
# Input: agent type from detect_agent_type()
# Output: formatted display name
get_agent_display_name() {
    local agent_type="$1"

    case "$agent_type" in
        orchestrator)
            echo "🤖 MAIN ORCHESTRATOR"
            ;;
        subagent:*)
            local subtype="${agent_type#subagent:}"
            # Format common agent types nicely
            case "$subtype" in
                sw:architect:architect|architect)
                    echo "🏗️  SUBAGENT: System Architect"
                    ;;
                sw:tech-lead:tech-lead|tech-lead)
                    echo "👨‍💻 SUBAGENT: Tech Lead"
                    ;;
                sw:qa-lead:qa-lead|qa-lead|qa-engineer)
                    echo "🧪 SUBAGENT: QA Engineer"
                    ;;
                sw:security:security|security)
                    echo "🔐 SUBAGENT: Security Engineer"
                    ;;
                sw-infra:devops:devops|devops)
                    echo "🚀 SUBAGENT: DevOps Engineer"
                    ;;
                sw-frontend:frontend-architect:*|frontend*)
                    echo "🎨 SUBAGENT: Frontend Architect"
                    ;;
                sw-backend:*|backend*)
                    echo "⚙️  SUBAGENT: Backend Engineer"
                    ;;
                sw-ml:ml-engineer:*|ml-engineer)
                    echo "🧠 SUBAGENT: ML Engineer"
                    ;;
                sw-ml:data-scientist:*|data-scientist)
                    echo "📊 SUBAGENT: Data Scientist"
                    ;;
                sw-infra:sre:sre|sre)
                    echo "🔧 SUBAGENT: SRE"
                    ;;
                sw:docs-writer:*|docs-writer)
                    echo "📝 SUBAGENT: Docs Writer"
                    ;;
                Explore|explore)
                    echo "🔍 SUBAGENT: Explorer"
                    ;;
                Plan|plan)
                    echo "📋 SUBAGENT: Planner"
                    ;;
                unknown)
                    echo "🔧 SUBAGENT: Specialized Agent"
                    ;;
                *)
                    echo "🔧 SUBAGENT: $subtype"
                    ;;
            esac
            ;;
        *)
            echo "🤖 AGENT: $agent_type"
            ;;
    esac
}

# Get short agent type for JSON logging
get_agent_type_short() {
    local agent_type="$1"

    case "$agent_type" in
        orchestrator)
            echo "main"
            ;;
        subagent:*)
            echo "${agent_type#subagent:}"
            ;;
        *)
            echo "$agent_type"
            ;;
    esac
}

# Detect recent subagent activity from transcript
# Returns JSON with subagent stats
detect_subagent_activity() {
    local transcript="$1"

    if [ -z "$transcript" ] || [ ! -f "$transcript" ]; then
        echo '{"spawned":0,"types":[]}'
        return
    fi

    # Count Task tool invocations
    local task_count
    task_count=$(grep -c 'Task tool\|subagent_type\|<invoke name="Task">' "$transcript" 2>/dev/null) || task_count=0

    # Extract unique agent types
    local agent_types=$(grep -oE 'subagent_type["\x27]*:\s*["\x27]?[a-zA-Z0-9_:-]+' "$transcript" 2>/dev/null | \
        sed 's/subagent_type["\x27]*:\s*["\x27]*//' | \
        sort -u | \
        head -10 | \
        jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo '[]')

    echo "{\"spawned\":$task_count,\"types\":$agent_types}"
}

# Track subagent in session (called when subagent activity detected)
track_subagent_spawn() {
    local agent_type="$1"
    local short_type=$(get_agent_type_short "$agent_type")

    if [ -f "$SESSION_FILE" ]; then
        local updated=$(cat "$SESSION_FILE" | jq \
            --arg type "$short_type" \
            --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.subagentStats.totalSpawned = ((.subagentStats.totalSpawned // 0) + 1) |
             .subagentStats.lastSpawned = $type |
             .subagentStats.lastSpawnTime = $now |
             .subagentStats.history = ((.subagentStats.history // []) + [{"type": $type, "time": $now}]) |
             .subagentStats.history = (.subagentStats.history | if length > 20 then .[-20:] else . end)')
        echo "$updated" > "$SESSION_FILE"
    fi
}

# Get subagent stats from session
get_subagent_stats() {
    if [ -f "$SESSION_FILE" ]; then
        jq -r '.subagentStats // {"totalSpawned":0,"history":[]}' "$SESSION_FILE"
    else
        echo '{"totalSpawned":0,"history":[]}'
    fi
}

# ============================================================================
# STOP REASON TRACKING (NEW - v2.2)
# Clear logging of WHY auto mode stops
# ============================================================================

log_stop_reason() {
    local reason="$1"
    local details="$2"
    local is_success="${3:-false}"

    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Log to iterations log
    echo "{\"timestamp\":\"$timestamp\",\"event\":\"session_stop\",\"reason\":\"$reason\",\"details\":\"$details\",\"success\":$is_success,\"iteration\":${ITERATION:-0},\"increment\":\"${CURRENT_INCREMENT:-none}\"}" >> "$LOGS_DIR/auto-iterations.log"

    # Also log to dedicated stop log
    mkdir -p "$LOGS_DIR"
    echo "{\"timestamp\":\"$timestamp\",\"sessionId\":\"${SESSION_ID:-unknown}\",\"reason\":\"$reason\",\"details\":\"$details\",\"success\":$is_success,\"iteration\":${ITERATION:-0},\"increment\":\"${CURRENT_INCREMENT:-none}\",\"testsRun\":${TESTS_RUN:-false},\"testsPassed\":${TESTS_PASSED:-0},\"testsFailed\":${TESTS_FAILED:-0}}" >> "$LOGS_DIR/auto-stop-reasons.log"
}

# Get timeout for command type
get_command_timeout() {
    local cmd="$1"

    # Check for test commands
    if echo "$cmd" | grep -qE '(npm test|npx vitest|npx jest|npx playwright|pytest|go test|xcodebuild.*test|swift test)'; then
        echo "$TEST_COMMAND_TIMEOUT"
        return
    fi

    # Check for build commands
    if echo "$cmd" | grep -qE '(npm run build|xcodebuild|gradle|maven|cargo build|go build)'; then
        echo "$BUILD_COMMAND_TIMEOUT"
        return
    fi

    echo "$DEFAULT_COMMAND_TIMEOUT"
}

# Check if a command appears to have timed out in transcript
detect_command_timeout() {
    local transcript="$1"

    if [ ! -f "$transcript" ]; then
        echo "false"
        return
    fi

    # Look for timeout indicators
    if grep -qiE '(command timed out|timeout|killed|signal 9|SIGKILL|SIGTERM|operation timed out)' "$transcript" 2>/dev/null; then
        echo "true"
    else
        echo "false"
    fi
}

# ================================================================
# SOUND NOTIFICATION HELPER (v2.6)
# Cross-platform sound notification for user awareness
# ================================================================
play_notification_sound() {
    # DISABLED: Sounds are currently turned off
    # Remove this return statement to re-enable notification sounds
    return 0

    local sound_type="${1:-attention}"  # "success" or "attention"

    # Detect OS and play appropriate sound
    # NOTE: We use `nohup ... &` and disown to ensure the sound plays even after
    # the script exits. Without this, the background process may be killed.
    case "$(uname -s)" in
        Darwin)
            # macOS - use afplay with system sounds
            # nohup + disown ensures sound continues after script exit
            if [ "$sound_type" = "success" ]; then
                ( nohup afplay /System/Library/Sounds/Glass.aiff >/dev/null 2>&1 & )
            else
                ( nohup afplay /System/Library/Sounds/Ping.aiff >/dev/null 2>&1 & )
            fi
            ;;
        Linux)
            # Linux - try multiple sound systems (paplay, aplay, speaker-test)
            if command -v paplay >/dev/null 2>&1; then
                # PulseAudio (most common on modern Linux)
                if [ "$sound_type" = "success" ]; then
                    ( nohup paplay /usr/share/sounds/freedesktop/stereo/complete.oga >/dev/null 2>&1 & )
                else
                    ( nohup paplay /usr/share/sounds/freedesktop/stereo/bell.oga >/dev/null 2>&1 & )
                fi
            elif command -v aplay >/dev/null 2>&1; then
                # ALSA fallback
                ( nohup aplay /usr/share/sounds/alsa/Front_Center.wav >/dev/null 2>&1 & )
            elif command -v speaker-test >/dev/null 2>&1; then
                # Last resort - system beep
                ( nohup speaker-test -t sine -f 1000 -l 1 >/dev/null 2>&1 & )
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            # Windows (Git Bash, WSL, Cygwin)
            if command -v powershell.exe >/dev/null 2>&1; then
                # Use PowerShell to play sound (sync is OK here, short sounds)
                if [ "$sound_type" = "success" ]; then
                    powershell.exe -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\Windows Notify System Generic.wav').PlaySync();" 2>/dev/null &
                else
                    powershell.exe -c "[console]::beep(800, 300)" 2>/dev/null &
                fi
            fi
            ;;
    esac
}

# Helper: Build status label for visual display
# Returns label as string (no STDERR output)
# NEW v2.9: Used by both approve() and block() for consistent labeling
build_status_label() {
    local label_type="$1"  # "approve_success", "approve_stop", "approve_subagent", "block_continue", "block_subagent"
    local reason="$2"
    local agent_display="$3"
    local subagents_spawned="${4:-0}"
    local stop_criteria="${5:-}"
    local stop_criteria_detail="${6:-}"
    local tdd_mode="${7:-false}"

    local label=""

    case "$label_type" in
        approve_success)
            label="┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ AUTO SESSION COMPLETE                                   ┃
┃  $agent_display                                  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Status: SUCCESS - All work completed                       ┃
┃  Reason: $(printf '%-48s' "$reason")┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  📊 SESSION SUMMARY                                         ┃
┃  ├─ Iterations: ${ITERATION:-0}/${MAX_ITERATIONS:-100}                                       ┃"
            [ -n "$CURRENT_INCREMENT" ] && label="$label
┃  ├─ Increment: $(printf '%-42s' "$CURRENT_INCREMENT")┃"
            [ "$subagents_spawned" -gt 0 ] && label="$label
┃  ├─ Subagents spawned: $(printf '%-35s' "$subagents_spawned")┃"
            if [ "${TESTS_RUN:-false}" = "true" ]; then
                label="$label
┃  └─ Tests: ${TESTS_PASSED:-0} passed, ${TESTS_FAILED:-0} failed                            ┃"
            fi
            label="$label
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
            ;;

        approve_stop)
            label="┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🛑 AUTO SESSION STOPPING                                   ┃
┃  $agent_display                                  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Status: STOPPED - Requires attention                       ┃
┃  Reason: $(printf '%-48s' "$reason")┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  📊 SESSION SUMMARY                                         ┃
┃  ├─ Iterations: ${ITERATION:-0}/${MAX_ITERATIONS:-100}                                       ┃"
            [ -n "$CURRENT_INCREMENT" ] && label="$label
┃  ├─ Increment: $(printf '%-42s' "$CURRENT_INCREMENT")┃"
            [ "$subagents_spawned" -gt 0 ] && label="$label
┃  ├─ Subagents spawned: $(printf '%-35s' "$subagents_spawned")┃"
            label="$label
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
            ;;

        approve_subagent)
            label="┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ↩️  SUBAGENT COMPLETE - Returning to parent               ┃
┃  $agent_display                                  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Result: $(printf '%-49s' "$reason")┃
┃  ↩️  Control returning to: 🤖 Main Orchestrator            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
            ;;

        block_continue)
            label="╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  $agent_display                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Why: $(printf '%-52s' "$reason")║
║  Iteration: $(printf '%-47s' "${ITERATION:-0}/${MAX_ITERATIONS:-2500}")║"
            [ -n "$CURRENT_INCREMENT" ] && label="$label
║  Increment: $(printf '%-47s' "$CURRENT_INCREMENT")║"
            [ "$subagents_spawned" -gt 0 ] && label="$label
║  Subagents used: $(printf '%-42s' "$subagents_spawned")║"
            label="$label
╠══════════════════════════════════════════════════════════════╣
║  🎯 WHEN WILL SESSION STOP?                                  ║
║  ├─ Mode: $(printf '%-48s' "$stop_criteria")║
║  └─ Criteria: $(printf '%-44s' "$stop_criteria_detail")║"
            if [ "${TESTS_RUN:-false}" = "true" ]; then
                if [ "${TESTS_FAILED:-0}" -gt 0 ]; then
                    label="$label
║  ⚠️  Tests: ${TESTS_PASSED:-0} passed, ${TESTS_FAILED:-0} FAILED (blocking!)             ║"
                else
                    label="$label
║  ✅ Tests: ${TESTS_PASSED:-0} passed, 0 failed                             ║"
                fi
            else
                label="$label
║  ⏳ Tests: NOT YET RUN                                       ║"
            fi
            [ "$tdd_mode" = "true" ] && label="$label
║  📋 TDD Source: $(printf '%-42s' "$(get_tdd_source)")║"
            label="$label
╚══════════════════════════════════════════════════════════════╝"
            ;;

        block_subagent)
            label="╔══════════════════════════════════════════════════════════════╗
║  🔧 SUBAGENT CONTINUING WORK                                 ║
║  $agent_display                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Task: $(printf '%-51s' "$reason")║
╠══════════════════════════════════════════════════════════════╣
║  🎯 WHEN WILL SUBAGENT RETURN?                               ║
║  └─ When assigned task is complete                           ║
║  ↩️  Returns to: 🤖 Main Orchestrator                         ║
╚══════════════════════════════════════════════════════════════╝"
            ;;
    esac

    echo "$label"
}

# Helper: Output approve decision
# ALWAYS log why we're stopping for debugging
# Enhanced v2.9: Labels now visible via systemMessage for user visibility
approve() {
    local reason="${1:-Session complete}"
    local is_success="${2:-false}"

    # Detect agent type for proper labeling
    local agent_type=$(detect_agent_type "$TRANSCRIPT_PATH")
    local agent_display=$(get_agent_display_name "$agent_type")
    local agent_short=$(get_agent_type_short "$agent_type")

    # Get subagent stats for summary
    local subagent_stats=$(get_subagent_stats)
    local subagents_spawned=$(echo "$subagent_stats" | jq -r '.totalSpawned // 0')

    # Log the stop reason with agent info
    log_stop_reason "$reason" "approve_called:$agent_short" "$is_success"

    # Build status label for display
    local label_type=""
    if [ "$agent_type" = "orchestrator" ]; then
        if [ "$is_success" = "true" ]; then
            label_type="approve_success"
        else
            label_type="approve_stop"
        fi
    else
        label_type="approve_subagent"
    fi

    local status_label=$(build_status_label "$label_type" "$reason" "$agent_display" "$subagents_spawned")

    # Display label to STDERR (for terminal/logs)
    echo "$status_label" >&2

    # ================================================================
    # SOUND NOTIFICATION (v2.6)
    # Play sound ONLY when session completes SUCCESSFULLY
    # ================================================================
    if [ "$agent_type" = "orchestrator" ] && [ "$is_success" = "true" ]; then
        play_notification_sound "success"
    fi

    # NEW v2.9: Include label in JSON output via systemMessage
    # This makes labels visible to Claude and the user!
    local escaped_label=$(echo "$status_label" | jq -Rs .)
    echo "{\"decision\": \"approve\", \"reason\": \"$reason\", \"agentType\": \"$agent_short\", \"systemMessage\": $escaped_label}"
    exit 0
}

# Helper: Output block decision with system message
# Properly escapes JSON strings with newlines
# Enhanced v2.9: Labels now visible via systemMessage for user visibility
block() {
    local reason="$1"
    local system_message="$2"

    # Detect agent type for proper labeling
    local agent_type=$(detect_agent_type "$TRANSCRIPT_PATH")
    local agent_display=$(get_agent_display_name "$agent_type")
    local agent_short=$(get_agent_type_short "$agent_type")

    # Get current stop criteria for display
    local tdd_mode=$(is_tdd_strict_mode)
    local stop_criteria=""
    local stop_criteria_detail=""

    # Build stop criteria message
    if [ "$tdd_mode" = "true" ]; then
        stop_criteria="TDD STRICT MODE"
        stop_criteria_detail="ALL tasks [x] + ALL tests GREEN (0 failures)"
    else
        stop_criteria="STANDARD MODE"
        stop_criteria_detail="ALL tasks [x] completed + tests passing"
    fi

    # Get subagent activity for display
    local subagent_stats=$(get_subagent_stats)
    local subagents_spawned=$(echo "$subagent_stats" | jq -r '.totalSpawned // 0')

    # Build status label for display
    local label_type=""
    if [ "$agent_type" = "orchestrator" ]; then
        label_type="block_continue"
    else
        label_type="block_subagent"
    fi

    local status_label=$(build_status_label "$label_type" "$reason" "$agent_display" "$subagents_spawned" "$stop_criteria" "$stop_criteria_detail" "$tdd_mode")

    # Display label to STDERR (for terminal/logs)
    echo "$status_label" >&2

    # NOTE: No sound notification on block - sounds only play on SUCCESS
    # When Claude is continuing work, user doesn't need to be notified

    # NEW v2.9: Prepend label to system message for visibility
    local full_message=""
    if [ -n "$system_message" ]; then
        # Combine label + existing system message
        full_message="$status_label

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$system_message"
    else
        # Just the label
        full_message="$status_label"
    fi

    # Escape and output JSON
    local escaped_message=$(echo "$full_message" | jq -Rs .)
    echo "{\"decision\": \"block\", \"reason\": \"$reason\", \"systemMessage\": $escaped_message, \"agentType\": \"$agent_short\"}"
    exit 0
}

# Helper: Get source of TDD mode for debugging
get_tdd_source() {
    if [ -n "$CURRENT_INCREMENT" ]; then
        local inc_dir="$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT"

        # Check increment metadata.json
        if [ -f "$inc_dir/metadata.json" ]; then
            local inc_tdd=$(jq -r '.tddMode // null' "$inc_dir/metadata.json" 2>/dev/null)
            if [ "$inc_tdd" = "true" ] || [ "$inc_tdd" = "false" ]; then
                echo "increment metadata.json"
                return
            fi
            local inc_test_mode=$(jq -r '.testMode // null' "$inc_dir/metadata.json" 2>/dev/null)
            if [ "$inc_test_mode" = "tdd" ] || [ "$inc_test_mode" = "test-first" ]; then
                echo "increment metadata.json (testMode)"
                return
            fi
        fi

        # Check increment config.json
        if [ -f "$inc_dir/config.json" ]; then
            local inc_tdd=$(jq -r '.tddMode // null' "$inc_dir/config.json" 2>/dev/null)
            if [ "$inc_tdd" = "true" ] || [ "$inc_tdd" = "false" ]; then
                echo "increment config.json"
                return
            fi
        fi

        # Check spec.md frontmatter
        if [ -f "$inc_dir/spec.md" ]; then
            if sed -n '/^---$/,/^---$/p' "$inc_dir/spec.md" 2>/dev/null | grep -qE '^tdd:\s*true'; then
                echo "spec.md frontmatter"
                return
            fi
        fi
    fi

    # Check session
    local session_tdd=$(echo "$SESSION" 2>/dev/null | jq -r '.tddMode // false')
    if [ "$session_tdd" = "true" ]; then
        echo "--tdd flag (session)"
        return
    fi

    # Check global config
    if [ -f "$CONFIG_FILE" ]; then
        local config_mode=$(jq -r '.testing.defaultTestMode // "test-after"' "$CONFIG_FILE" 2>/dev/null)
        if [ "$config_mode" = "tdd" ] || [ "$config_mode" = "test-first" ]; then
            echo "global config.json"
            return
        fi
    fi

    echo "default (test-after)"
}

# ============================================================================
# TEST COMMAND DISCOVERY (NEW - v2.2)
# Auto-detect available test commands for each project/technology
# ============================================================================

# Discover test commands for the current project
# Returns JSON with available test commands for each technology
discover_test_commands() {
    local test_commands="[]"

    # Node.js/JavaScript/TypeScript projects
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        local pkg_test=$(jq -r '.scripts.test // null' "$PROJECT_ROOT/package.json" 2>/dev/null)
        local pkg_test_unit=$(jq -r '.scripts["test:unit"] // null' "$PROJECT_ROOT/package.json" 2>/dev/null)
        local pkg_test_e2e=$(jq -r '.scripts["test:e2e"] // null' "$PROJECT_ROOT/package.json" 2>/dev/null)

        if [ "$pkg_test" != "null" ] && [ -n "$pkg_test" ]; then
            test_commands=$(echo "$test_commands" | jq --arg cmd "npm test" --arg type "unit" '. + [{"command": $cmd, "type": $type, "framework": "npm"}]')
        fi
        if [ "$pkg_test_unit" != "null" ] && [ -n "$pkg_test_unit" ]; then
            test_commands=$(echo "$test_commands" | jq --arg cmd "npm run test:unit" --arg type "unit" '. + [{"command": $cmd, "type": $type, "framework": "npm"}]')
        fi
        if [ "$pkg_test_e2e" != "null" ] && [ -n "$pkg_test_e2e" ]; then
            test_commands=$(echo "$test_commands" | jq --arg cmd "npm run test:e2e" --arg type "e2e" '. + [{"command": $cmd, "type": $type, "framework": "npm"}]')
        fi

        # Detect Vitest
        if [ -f "$PROJECT_ROOT/vitest.config.ts" ] || [ -f "$PROJECT_ROOT/vitest.config.js" ] || grep -q '"vitest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "npx vitest run", "type": "unit", "framework": "vitest"}]')
        fi

        # Detect Jest
        if [ -f "$PROJECT_ROOT/jest.config.js" ] || [ -f "$PROJECT_ROOT/jest.config.ts" ] || grep -q '"jest"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "npx jest", "type": "unit", "framework": "jest"}]')
        fi

        # Detect Playwright
        if [ -f "$PROJECT_ROOT/playwright.config.ts" ] || [ -f "$PROJECT_ROOT/playwright.config.js" ]; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "npx playwright test", "type": "e2e", "framework": "playwright"}]')
        fi

        # Detect Cypress
        if [ -f "$PROJECT_ROOT/cypress.config.ts" ] || [ -f "$PROJECT_ROOT/cypress.config.js" ] || [ -d "$PROJECT_ROOT/cypress" ]; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "npx cypress run", "type": "e2e", "framework": "cypress"}]')
        fi

        # Detect Detox (React Native)
        if [ -f "$PROJECT_ROOT/.detoxrc.js" ] || [ -f "$PROJECT_ROOT/.detoxrc.json" ] || grep -q '"detox"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "npx detox test", "type": "e2e", "framework": "detox"}]')
        fi
    fi

    # Python projects
    if [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/setup.py" ] || [ -f "$PROJECT_ROOT/requirements.txt" ]; then
        # Pytest
        if [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -d "$PROJECT_ROOT/tests" ]; then
            test_commands=$(echo "$test_commands" | jq '. + [{"command": "pytest", "type": "unit", "framework": "pytest"}]')
        fi
    fi

    # Go projects
    if [ -f "$PROJECT_ROOT/go.mod" ]; then
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "go test ./...", "type": "unit", "framework": "go"}]')
    fi

    # Rust projects
    if [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "cargo test", "type": "unit", "framework": "cargo"}]')
    fi

    # iOS/macOS projects (Xcode)
    if find "$PROJECT_ROOT" -maxdepth 2 -name "*.xcodeproj" -o -name "*.xcworkspace" 2>/dev/null | head -1 | grep -q .; then
        # Find scheme name
        local xc_project=$(find "$PROJECT_ROOT" -maxdepth 2 -name "*.xcodeproj" 2>/dev/null | head -1)
        local xc_workspace=$(find "$PROJECT_ROOT" -maxdepth 2 -name "*.xcworkspace" 2>/dev/null | head -1)

        if [ -n "$xc_workspace" ]; then
            test_commands=$(echo "$test_commands" | jq --arg ws "$(basename "$xc_workspace")" '. + [{"command": "xcodebuild test -workspace " + $ws + " -scheme <SCHEME> -destination \"platform=iOS Simulator,name=iPhone 15\"", "type": "unit", "framework": "xcode"}]')
        elif [ -n "$xc_project" ]; then
            test_commands=$(echo "$test_commands" | jq --arg proj "$(basename "$xc_project")" '. + [{"command": "xcodebuild test -project " + $proj + " -scheme <SCHEME> -destination \"platform=iOS Simulator,name=iPhone 15\"", "type": "unit", "framework": "xcode"}]')
        fi
    fi

    # Swift Package Manager
    if [ -f "$PROJECT_ROOT/Package.swift" ]; then
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "swift test", "type": "unit", "framework": "swift"}]')
    fi

    # Android projects (Gradle)
    if [ -f "$PROJECT_ROOT/build.gradle" ] || [ -f "$PROJECT_ROOT/build.gradle.kts" ]; then
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "./gradlew test", "type": "unit", "framework": "gradle"}]')
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "./gradlew connectedAndroidTest", "type": "e2e", "framework": "gradle"}]')
    fi

    # Maestro (cross-platform mobile E2E)
    if [ -f "$PROJECT_ROOT/maestro.yaml" ] || [ -d "$PROJECT_ROOT/.maestro" ]; then
        test_commands=$(echo "$test_commands" | jq '. + [{"command": "maestro test", "type": "e2e", "framework": "maestro"}]')
    fi

    echo "$test_commands"
}

# Format test commands for LLM instruction
format_test_instructions() {
    local test_commands=$(discover_test_commands)
    local cmd_count=$(echo "$test_commands" | jq 'length')

    if [ "$cmd_count" -eq 0 ]; then
        echo "No test framework detected. Look for test configuration files and package.json scripts."
        return
    fi

    local instructions="AVAILABLE TEST COMMANDS FOR THIS PROJECT:
"
    # Unit tests
    local unit_cmds=$(echo "$test_commands" | jq -r '[.[] | select(.type == "unit")] | .[] | "  • " + .command + " (" + .framework + ")"')
    if [ -n "$unit_cmds" ]; then
        instructions="${instructions}
Unit/Integration Tests:
${unit_cmds}"
    fi

    # E2E tests
    local e2e_cmds=$(echo "$test_commands" | jq -r '[.[] | select(.type == "e2e")] | .[] | "  • " + .command + " (" + .framework + ")"')
    if [ -n "$e2e_cmds" ]; then
        instructions="${instructions}

E2E Tests:
${e2e_cmds}"
    fi

    instructions="${instructions}

PRIORITY: Run ALL tests BEFORE marking tasks complete!"

    echo "$instructions"
}

# ============================================================================
# TEST RESULT PARSING (NEW - v2.0)
# Parses ACTUAL test results, not just command execution
# ============================================================================

# Parse test results from transcript
# Returns: JSON with {passed, failed, total, framework}
parse_test_results() {
    local transcript="$1"
    local passed=0
    local failed=0
    local total=0
    local framework="unknown"

    if [ ! -f "$transcript" ]; then
        echo '{"passed":0,"failed":0,"total":0,"framework":"none","testsRun":false}'
        return
    fi

    # Vitest format: "Tests  5 passed | 2 failed (7)"
    # Also: "✓ src/test.ts (5 tests)" or "Tests: 5 passed, 2 failed"
    local vitest_result=$(grep -oE 'Tests?\s+[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$vitest_result" ]; then
        framework="vitest"
        passed=$(echo "$vitest_result" | grep -oE '[0-9]+' | head -1)
        local vitest_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
        failed=${vitest_failed:-0}
    fi

    # Jest format: "Tests: 5 passed, 2 failed, 7 total"
    local jest_result=$(grep -oE 'Tests:\s*[0-9]+\s*passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$jest_result" ] && [ "$framework" = "unknown" ]; then
        framework="jest"
        passed=$(echo "$jest_result" | grep -oE '[0-9]+' | head -1)
        local jest_failed=$(grep -oE 'Tests:.*[0-9]+\s*failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+\s*failed' | grep -oE '[0-9]+' || echo "0")
        failed=${jest_failed:-0}
    fi

    # Playwright format: "5 passed (10s)" and "2 failed"
    # Also: "Running 7 tests" or "7 tests in 3 workers"
    local playwright_passed=$(grep -oE '[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')
    local playwright_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')
    if [ -n "$playwright_passed" ] && [ "$framework" = "unknown" ]; then
        framework="playwright"
        passed=${playwright_passed:-0}
        failed=${playwright_failed:-0}
    fi

    # Pytest format: "5 passed, 2 failed in 3.2s" or "PASSED" / "FAILED"
    local pytest_result=$(grep -oE '[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
    if [ -n "$pytest_result" ] && [ "$framework" = "unknown" ]; then
        framework="pytest"
        passed=$(echo "$pytest_result" | grep -oE '[0-9]+')
        local pytest_failed=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
        failed=${pytest_failed:-0}
    fi

    # Go test format: "ok" or "FAIL" with package name
    # "--- PASS:" or "--- FAIL:"
    if grep -qE '(--- PASS:|--- FAIL:|^ok\s|^FAIL\s)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="go"
        passed=$(grep -cE '--- PASS:' "$transcript" 2>/dev/null || echo "0")
        failed=$(grep -cE '--- FAIL:' "$transcript" 2>/dev/null || echo "0")
    fi

    # ========================================================================
    # XCODE / iOS TEST SUPPORT (NEW - v2.1)
    # Formats:
    #   - "Executed 10 tests, with 2 failures (0 unexpected) in 5.123 seconds"
    #   - "Test Suite 'All tests' passed at 2024-01-01"
    #   - "Test Suite 'MyTests' failed at 2024-01-01"
    #   - "** TEST SUCCEEDED **" or "** TEST FAILED **"
    # ========================================================================
    if grep -qE '(xcodebuild.*test|Executed [0-9]+ tests?|Test Suite|TEST SUCCEEDED|TEST FAILED)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="xcode"

        # Check for build failure FIRST (not test failure)
        if grep -qE '(BUILD FAILED|xcodebuild:.*error:|Compile.*error:|error:.*Build input file)' "$transcript" 2>/dev/null; then
            # Build failed - different from test failure
            echo '{"passed":0,"failed":1,"total":1,"framework":"xcode-build","testsRun":false,"buildFailed":true}'
            return
        fi

        # Parse "Executed X tests, with Y failures (Z unexpected) in N.NNN seconds"
        local xcode_summary=$(grep -oE 'Executed [0-9]+ tests?, with [0-9]+ failures?' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$xcode_summary" ]; then
            total=$(echo "$xcode_summary" | grep -oE 'Executed [0-9]+' | grep -oE '[0-9]+')
            failed=$(echo "$xcode_summary" | grep -oE 'with [0-9]+' | grep -oE '[0-9]+')
            passed=$((total - failed))
        else
            # Fallback: count Test Suite pass/fail
            local suite_passed=$(grep -cE "Test Suite '.*' passed" "$transcript" 2>/dev/null || echo "0")
            local suite_failed=$(grep -cE "Test Suite '.*' failed" "$transcript" 2>/dev/null || echo "0")
            passed=${suite_passed:-0}
            failed=${suite_failed:-0}
        fi

        # Check for overall test result
        if grep -qE '\*\* TEST SUCCEEDED \*\*' "$transcript" 2>/dev/null; then
            failed=0
        elif grep -qE '\*\* TEST FAILED \*\*' "$transcript" 2>/dev/null && [ "$failed" -eq 0 ]; then
            failed=1
        fi
    fi

    # ========================================================================
    # SWIFT PACKAGE MANAGER TEST SUPPORT (NEW - v2.1)
    # Format: "Test Suite 'PackageTests' passed at..." or swift test output
    # ========================================================================
    if grep -qE '(swift test|SwiftPM|Test Suite.*swift)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="swift"

        # Similar to Xcode but from swift test command
        local swift_summary=$(grep -oE 'Executed [0-9]+ tests?, with [0-9]+ failures?' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$swift_summary" ]; then
            total=$(echo "$swift_summary" | grep -oE 'Executed [0-9]+' | grep -oE '[0-9]+')
            failed=$(echo "$swift_summary" | grep -oE 'with [0-9]+' | grep -oE '[0-9]+')
            passed=$((total - failed))
        fi
    fi

    # ========================================================================
    # DETOX (React Native) TEST SUPPORT (NEW - v2.2)
    # Format: "detox[XXXX] ✓ test name" or "X passing (Xs)"
    # ========================================================================
    if grep -qE '(detox\[|detox test|react-native.*test)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="detox"

        # Count passing tests (✓ or ✔ checkmarks)
        passed=$(grep -cE '(detox\[[0-9]+\]\s*[✓✔]|✓.*test|passed)' "$transcript" 2>/dev/null || echo "0")
        # Count failing tests (✗ or ✘)
        failed=$(grep -cE '(detox\[[0-9]+\]\s*[✗✘]|✗.*test|failed)' "$transcript" 2>/dev/null || echo "0")

        # Alternative: "X passing (Xs)" format
        local detox_summary=$(grep -oE '[0-9]+\s+passing' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$detox_summary" ]; then
            passed=$(echo "$detox_summary" | grep -oE '^[0-9]+')
        fi
        local detox_failed=$(grep -oE '[0-9]+\s+failing' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$detox_failed" ]; then
            failed=$(echo "$detox_failed" | grep -oE '^[0-9]+')
        fi
    fi

    # ========================================================================
    # MAESTRO (Mobile UI Testing) SUPPORT (NEW - v2.2)
    # Format: "Flow: flow.yaml - PASSED" or "Passed: X, Failed: X"
    # ========================================================================
    if grep -qE '(maestro test|maestro\.yaml|Flow:.*PASSED|Flow:.*FAILED)' "$transcript" 2>/dev/null && [ "$framework" = "unknown" ]; then
        framework="maestro"

        # Count passed/failed flows
        passed=$(grep -cE 'Flow:.*PASSED' "$transcript" 2>/dev/null || echo "0")
        failed=$(grep -cE 'Flow:.*FAILED' "$transcript" 2>/dev/null || echo "0")

        # Alternative summary format
        local maestro_summary=$(grep -oE 'Passed:\s*[0-9]+,\s*Failed:\s*[0-9]+' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$maestro_summary" ]; then
            passed=$(echo "$maestro_summary" | grep -oE 'Passed:\s*[0-9]+' | grep -oE '[0-9]+')
            failed=$(echo "$maestro_summary" | grep -oE 'Failed:\s*[0-9]+' | grep -oE '[0-9]+')
        fi
    fi

    # ========================================================================
    # GENERIC EXIT CODE DETECTION (NEW - v2.1)
    # Fallback for unknown frameworks - detect failure from exit codes and patterns
    # ========================================================================
    if [ "$framework" = "unknown" ]; then
        # Check for explicit exit codes in transcript
        local exit_code_match=$(grep -oE '(exit code|exited with|returned|Exit code:?)\s*[0-9]+' "$transcript" 2>/dev/null | tail -1)
        local exit_code=""
        if [ -n "$exit_code_match" ]; then
            exit_code=$(echo "$exit_code_match" | grep -oE '[0-9]+$')
        fi

        # Check for universal failure patterns (case insensitive)
        local has_failure_pattern=false
        if grep -qiE '(FAIL[^U]|FAILED|ERROR:|FAILURE:|BUILD FAILED|COMPILATION ERROR|tests? failed)' "$transcript" 2>/dev/null; then
            has_failure_pattern=true
        fi

        # Check for universal success patterns
        local has_success_pattern=false
        if grep -qiE '(PASS[^W]|PASSED|SUCCESS|SUCCEEDED|All tests passed|tests? passed)' "$transcript" 2>/dev/null; then
            has_success_pattern=true
        fi

        # Determine result
        if [ -n "$exit_code" ] && [ "$exit_code" != "0" ]; then
            framework="generic"
            failed=1
            passed=0
        elif [ "$has_failure_pattern" = true ]; then
            framework="generic"
            failed=1
            passed=0
        elif [ "$has_success_pattern" = true ]; then
            framework="generic"
            failed=0
            passed=1
        fi
    fi

    # Calculate total
    total=$((passed + failed))

    # Determine if tests were actually run
    local tests_run="false"
    if [ "$total" -gt 0 ] || grep -qE '(npm test|npx vitest|npx jest|npx playwright|pytest|go test|cargo test|xcodebuild.*test|swift test|xctest)' "$transcript" 2>/dev/null; then
        tests_run="true"
    fi

    # Ensure valid integers
    passed=${passed:-0}
    failed=${failed:-0}
    total=${total:-0}

    echo "{\"passed\":$passed,\"failed\":$failed,\"total\":$total,\"framework\":\"$framework\",\"testsRun\":$tests_run}"
}

# ============================================================================
# TEST TYPE BREAKDOWN (NEW - v2.5)
# Categorizes test results by type (unit/integration/E2E) for detailed summary
# ============================================================================

# Get test type breakdown from transcript
# Returns: JSON with {unit: {passed, failed}, integration: {passed, failed}, e2e: {passed, failed}}
get_test_type_breakdown() {
    local transcript="$1"

    if [ ! -f "$transcript" ]; then
        echo "{}"
        return
    fi

    local unit_passed=0
    local unit_failed=0
    local integration_passed=0
    local integration_failed=0
    local e2e_passed=0
    local e2e_failed=0

    # Check for test command patterns to categorize
    # Unit tests: vitest, jest, pytest, go test
    if grep -qE '(npm.*test:unit|npx vitest|npx jest|pytest|go test|cargo test)' "$transcript" 2>/dev/null; then
        # Parse unit test results
        local unit_result=$(grep -oE 'Tests?\s+[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$unit_result" ]; then
            unit_passed=$(echo "$unit_result" | grep -oE '[0-9]+' | head -1)
            local unit_failed_match=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
            unit_failed=${unit_failed_match:-0}
        fi
    fi

    # Integration tests: usually named test:integration
    if grep -qE 'npm.*test:integration' "$transcript" 2>/dev/null; then
        # Parse integration test results (same format as unit)
        local int_result=$(grep -oE 'Tests?\s+[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1)
        if [ -n "$int_result" ]; then
            integration_passed=$(echo "$int_result" | grep -oE '[0-9]+' | head -1)
            local int_failed_match=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+' || echo "0")
            integration_failed=${int_failed_match:-0}
        fi
    fi

    # E2E tests: Playwright, Cypress, Detox, Maestro
    if grep -qE '(npx playwright|npx cypress|npx detox|maestro test|test:e2e)' "$transcript" 2>/dev/null; then
        # Parse E2E test results
        local e2e_passed_match=$(grep -oE '[0-9]+\s+passed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')
        local e2e_failed_match=$(grep -oE '[0-9]+\s+failed' "$transcript" 2>/dev/null | tail -1 | grep -oE '[0-9]+')

        e2e_passed=${e2e_passed_match:-0}
        e2e_failed=${e2e_failed_match:-0}
    fi

    # Return JSON with breakdown
    cat <<EOF
{
  "unit": {
    "passed": $unit_passed,
    "failed": $unit_failed
  },
  "integration": {
    "passed": $integration_passed,
    "failed": $integration_failed
  },
  "e2e": {
    "passed": $e2e_passed,
    "failed": $e2e_failed
  }
}
EOF
}

# Extract detailed failure information from transcript
# Returns: JSON with failure details
extract_failure_details() {
    local transcript="$1"
    local max_failures=3

    if [ ! -f "$transcript" ]; then
        echo '{"failures":[]}'
        return
    fi

    local failures="[]"

    # Playwright/Vitest failure pattern:
    # "FAIL src/test.spec.ts > describe > test name"
    # Or: "1) [chromium] › test.spec.ts:45:3 › Test Name"
    # Extract file:line and error message

    # Look for common failure patterns
    # Pattern 1: "Error: expect(received).toEqual(expected)"
    # Pattern 2: "AssertionError: expected X to equal Y"
    # Pattern 3: "FAIL path/to/test.ts"

    # Extract first few failures with context
    local failure_blocks=$(grep -B 2 -A 10 -E '(FAIL|Error:|AssertionError|expect\(.*\)\.(to|toBe|toEqual|toHaveText))' "$transcript" 2>/dev/null | head -60)

    # ========================================================================
    # XCODE FAILURE EXTRACTION (NEW - v2.1)
    # Patterns:
    #   - "/path/to/File.swift:42: error: -[TestClass testMethod] : XCTAssertEqual failed"
    #   - "Test Case '-[TestClass testMethod]' failed (0.001 seconds)"
    # ========================================================================
    local xcode_failure_blocks=""
    if grep -qE '(xcodebuild|XCTest|XCTAssert|Test Case.*failed)' "$transcript" 2>/dev/null; then
        xcode_failure_blocks=$(grep -B 2 -A 5 -E '(XCTAssert.*failed|Test Case.*failed|error:.*XCT|\.swift:[0-9]+:.*error)' "$transcript" 2>/dev/null | head -60)
    fi

    if [ -n "$xcode_failure_blocks" ]; then
        # Xcode format: /path/File.swift:42: error: message
        local file_line=$(echo "$xcode_failure_blocks" | grep -oE '[a-zA-Z0-9_/-]+\.swift:[0-9]+' | head -1)

        # Extract test method name: -[TestClass testMethod]
        local test_name=$(echo "$xcode_failure_blocks" | grep -oE '\-\[[^\]]+\]' | head -1)

        # Extract XCTAssert error
        local error_msg=$(echo "$xcode_failure_blocks" | grep -oE 'XCTAssert[^:]+:[^\n]+' | head -1)
        if [ -z "$error_msg" ]; then
            error_msg=$(echo "$xcode_failure_blocks" | grep -oE 'error:[^\n]+' | head -1)
        fi

        failures=$(cat <<EOF
[{
  "file": "${file_line:-unknown.swift}",
  "testName": "${test_name:-unknown test}",
  "error": "${error_msg:-XCTest assertion failed}",
  "expected": "",
  "received": "",
  "framework": "xcode",
  "context": $(echo "$xcode_failure_blocks" | head -20 | jq -Rs .)
}]
EOF
)
    elif [ -n "$failure_blocks" ]; then
        # Extract file:line from stack traces or test output
        local file_line=$(echo "$failure_blocks" | grep -oE '[a-zA-Z0-9_/-]+\.(ts|js|tsx|jsx|spec|test)\.[tj]sx?:[0-9]+' | head -1)

        # Extract test name
        local test_name=$(echo "$failure_blocks" | grep -oE '(›|>)\s*[^›>\n]+$' | head -1 | sed 's/^[›>]\s*//')

        # Extract error message
        local error_msg=$(echo "$failure_blocks" | grep -oE '(Error:|AssertionError:)[^\n]+' | head -1)

        # Extract expected/received if available
        local expected=$(echo "$failure_blocks" | grep -oE 'Expected:?[^\n]+' | head -1)
        local received=$(echo "$failure_blocks" | grep -oE 'Received:?[^\n]+' | head -1)

        failures=$(cat <<EOF
[{
  "file": "${file_line:-unknown}",
  "testName": "${test_name:-unknown test}",
  "error": "${error_msg:-Test failed}",
  "expected": "${expected:-}",
  "received": "${received:-}",
  "context": $(echo "$failure_blocks" | head -20 | jq -Rs .)
}]
EOF
)
    fi

    echo "{\"failures\":$failures}"
}

# ============================================================================
# FAILURE CLASSIFICATION SYSTEM (NEW - v2.1)
# Intelligently categorize failures for appropriate handling
# Categories:
#   - transient: Network, timing, flaky - retry immediately
#   - fixable: Code error - needs fix then retry
#   - structural: Architecture issue - needs planning
#   - external: Env/config issue - needs human intervention
#   - unfixable: Beyond scope - skip or abort
# ============================================================================

classify_failure() {
    local error_msg="$1"
    local context="$2"

    # TRANSIENT: Network, timeout, flaky test patterns
    if echo "$error_msg" | grep -qiE '(ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|timed out|connection refused|network|socket hang up|ENOTFOUND|DNS|flaky|intermittent|race condition)'; then
        echo "transient"
        return
    fi

    # EXTERNAL: Environment, configuration, missing dependencies
    if echo "$error_msg" | grep -qiE '(ENOENT|no such file|file not found|command not found|not installed|missing dependency|permission denied|EACCES|env var|environment variable|config|configuration|credentials|secret|token|API key|authentication failed|unauthorized|forbidden)'; then
        echo "external"
        return
    fi

    # STRUCTURAL: Architecture, design, major refactoring needed
    if echo "$error_msg" | grep -qiE '(circular dependency|import cycle|incompatible|breaking change|deprecated|type mismatch|interface.*not implemented|abstract|override|inheritance|polymorphism)'; then
        echo "structural"
        return
    fi

    # UNFIXABLE: Out of scope or requires external action
    if echo "$error_msg" | grep -qiE '(rate limit|quota exceeded|billing|payment|license|subscription|third-party|external service|API limit|429|503|service unavailable)'; then
        echo "unfixable"
        return
    fi

    # XCODE-SPECIFIC: Build vs runtime errors
    if echo "$error_msg" | grep -qiE '(linker error|undefined symbol|duplicate symbol|framework not found|module not found|cannot find.*in scope)'; then
        echo "structural"
        return
    fi

    if echo "$error_msg" | grep -qiE '(provisioning profile|code signing|certificate|entitlement|bundle identifier)'; then
        echo "external"
        return
    fi

    # DEFAULT: Assume fixable (assertion failures, logic errors, etc.)
    echo "fixable"
}

# Get recommended action for failure type
get_failure_action() {
    local failure_type="$1"

    case "$failure_type" in
        transient)
            echo "retry_immediately"
            ;;
        fixable)
            echo "analyze_and_fix"
            ;;
        structural)
            echo "pause_for_planning"
            ;;
        external)
            echo "alert_user"
            ;;
        unfixable)
            echo "skip_and_log"
            ;;
        *)
            echo "analyze_and_fix"
            ;;
    esac
}

# ============================================================================
# SELF-HEALING LOOP (ENHANCED - v2.1)
# Now uses failure classification for smarter retry behavior
# ============================================================================

# Handle test failure with intelligent self-healing
# Args: $1 = failure details JSON
handle_test_failure() {
    local failure_json="$1"
    local retry_count=$(echo "$SESSION" | jq -r '.testRetryCount // 0')
    local current_task=$(echo "$SESSION" | jq -r '.currentTaskId // "unknown"')

    # Extract failure details
    local first_failure=$(echo "$failure_json" | jq -r '.failures[0] // {}')
    local fail_file=$(echo "$first_failure" | jq -r '.file // "unknown"')
    local fail_test=$(echo "$first_failure" | jq -r '.testName // "unknown test"')
    local fail_error=$(echo "$first_failure" | jq -r '.error // "Test failed"')
    local fail_expected=$(echo "$first_failure" | jq -r '.expected // ""')
    local fail_received=$(echo "$first_failure" | jq -r '.received // ""')
    local fail_context=$(echo "$first_failure" | jq -r '.context // ""')

    # CLASSIFY THE FAILURE (NEW - v2.1)
    local failure_type=$(classify_failure "$fail_error" "$fail_context")
    local failure_action=$(get_failure_action "$failure_type")

    # Log classification
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"failure_classified\",\"type\":\"$failure_type\",\"action\":\"$failure_action\",\"error\":\"$fail_error\"}" >> "$LOGS_DIR/auto-iterations.log"

    # Handle based on failure type
    case "$failure_action" in
        retry_immediately)
            # Transient failure - retry without incrementing retry counter
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"transient_retry\",\"task\":\"$current_task\",\"error\":\"$fail_error\"}" >> "$LOGS_DIR/auto-iterations.log"

            block "Transient failure - retrying immediately" "⚡ TRANSIENT FAILURE DETECTED - Auto-retrying

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This appears to be a transient failure (network/timing):
  Error: $fail_error

Re-running tests immediately without code changes.
If this persists, it will be escalated to fixable."
            ;;

        alert_user)
            # External failure - requires user intervention
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg reason "external_failure" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = $reason' \
                > "$SESSION_FILE"

            approve "⚠️ EXTERNAL CONFIGURATION REQUIRED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This failure requires external action (env/config/permissions):
  File: $fail_file
  Error: $fail_error

ACTION NEEDED:
Check environment variables, credentials, file permissions,
or external service configuration.

Run /sw:auto to resume after fixing."
            ;;

        pause_for_planning)
            # Structural failure - needs architectural review
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg reason "structural_failure" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = $reason' \
                > "$SESSION_FILE"

            approve "🏗️ STRUCTURAL ISSUE - Planning Required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This failure indicates an architectural/design issue:
  File: $fail_file
  Error: $fail_error

This requires careful planning before fixing.
Consider updating the spec or plan.md.

Run /sw:auto to resume after planning."
            ;;

        skip_and_log)
            # Unfixable - log and skip
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"unfixable_skipped\",\"task\":\"$current_task\",\"error\":\"$fail_error\"}" >> "$LOGS_DIR/auto-iterations.log"

            # Check if more increments in queue
            local queue_length=$(echo "$SESSION" | jq '.incrementQueue | length')
            if [ "$queue_length" -gt 1 ]; then
                block "Unfixable issue - skipping to next work" "⏭️ UNFIXABLE ISSUE - Skipping

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This issue cannot be fixed automatically:
  Error: $fail_error

This may be due to rate limits, external service issues,
or subscription/licensing problems.

Logging and moving to next task/increment."
            else
                approve "⏭️ UNFIXABLE ISSUE - Session paused

This issue cannot be fixed automatically.
Error: $fail_error"
            fi
            ;;

        analyze_and_fix|*)
            # Default: Standard fix and retry flow
            if [ "$retry_count" -lt 3 ]; then
                # Increment retry counter
                local new_retry=$((retry_count + 1))
                echo "$SESSION" | jq --argjson retry "$new_retry" --arg task "$current_task" \
                    '.testRetryCount = $retry | .lastFailedTask = $task' \
                    > "$SESSION_FILE"

                # Log the retry attempt
                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"test_retry\",\"attempt\":$new_retry,\"task\":\"$current_task\",\"file\":\"$fail_file\",\"error\":\"$fail_error\",\"classification\":\"$failure_type\"}" >> "$LOGS_DIR/auto-iterations.log"

                # Build fix prompt with specific failure details
                local fix_prompt="🔴 TESTS FAILED - FIX AND RETRY (attempt $new_retry/3)
🏷️ Classification: $failure_type

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILURE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 File: $fail_file
🧪 Test: $fail_test
❌ Error: $fail_error"

                if [ -n "$fail_expected" ] && [ "$fail_expected" != "" ]; then
                    fix_prompt="$fix_prompt
✓ Expected: $fail_expected"
                fi

                if [ -n "$fail_received" ] && [ "$fail_received" != "" ]; then
                    fix_prompt="$fix_prompt
✗ Received: $fail_received"
                fi

                fix_prompt="$fix_prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ANALYZE the error above carefully
2. READ the failing test file to understand what's expected
3. FIX the implementation code (NOT the test, unless test is wrong)
4. RE-RUN the tests: npm test or npx playwright test
5. VERIFY all tests pass before continuing

⚠️ DO NOT skip this failure. DO NOT mark task complete until tests pass.
⚠️ After $((3 - new_retry)) more failure(s), session will pause for human review."

                block "Test failure - self-healing retry $new_retry/3" "$fix_prompt"
            else
                # 3 retries exhausted - check for skip option
                local queue_length=$(echo "$SESSION" | jq '.incrementQueue | length')

                # If there are more increments in queue, offer skip option
                if [ "$queue_length" -gt 1 ]; then
                    local next_increment=$(echo "$SESSION" | jq -r '.incrementQueue[1] // null')

                    # Store failure info for potential skip
                    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                        --arg file "$fail_file" --arg error "$fail_error" \
                        '.status = "paused" | .pauseTime = $now | .pauseReason = "test_failures_exhausted" | .testRetryCount = 0 | .pendingSkip = {"increment": .currentIncrement, "reason": "test_failures", "file": $file, "error": $error}' \
                        > "$SESSION_FILE"

                    # Log exhaustion
                    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"retry_exhausted\",\"task\":\"$current_task\",\"file\":\"$fail_file\",\"skipAvailable\":true}" >> "$LOGS_DIR/auto-iterations.log"

                    approve "Tests failed 3x - human review required.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILED: $CURRENT_INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  File: $fail_file
  Error: $fail_error

OPTIONS:
1. Fix the issue and run /sw:auto to continue
2. Skip this increment: /sw:skip-increment (moves to next in queue)
   → Next: $next_increment ($((queue_length - 1)) remaining)

The failed increment will be logged for later review."
                else
                    # No more increments - just pause
                    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                        '.status = "paused" | .pauseTime = $now | .pauseReason = "test_failures_exhausted" | .testRetryCount = 0' \
                        > "$SESSION_FILE"

                    # Log exhaustion
                    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"retry_exhausted\",\"task\":\"$current_task\",\"file\":\"$fail_file\",\"skipAvailable\":false}" >> "$LOGS_DIR/auto-iterations.log"

                    approve "Tests failed 3x in a row - human review required. File: $fail_file, Error: $fail_error"
                fi
            fi
            ;;
    esac
}

# Reset retry counter (call when tests pass or task changes)
reset_retry_counter() {
    echo "$SESSION" | jq '.testRetryCount = 0 | .lastFailedTask = null' > "$SESSION_FILE"
    # Reload session
    SESSION=$(cat "$SESSION_FILE")
}

# ============================================================================
# MAIN HOOK LOGIC
# ============================================================================

# NOTE: stop_hook_active flag indicates Claude is continuing after a previous block.
# We do NOT immediately exit when this is true - that would defeat the Ralph Wiggum
# pattern which requires continuous looping until tasks are complete.
#
# The flag is informational only. We rely on:
# 1. Max iterations (line ~1802) as the safety net for runaway loops
# 2. Task completion + test pass as the primary exit condition
# 3. Completion promise detection for explicit done signals
#
# Previous behavior (buggy): if stop_hook_active=true, immediately approve exit
# New behavior: continue evaluating completion conditions regardless of flag
#
# See: https://docs.anthropic.com/en/docs/claude-code/hooks - Stop hooks section
# "stop_hook_active is true when Claude Code is already continuing as a result of
# a stop hook. Check this value or process the transcript to prevent Claude Code
# from running indefinitely."
#
# We use iteration count (MAX_ITERATIONS) to prevent infinite loops, not this flag.

if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
    # Log continuation event for debugging - do NOT approve exit here
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"stop_hook_continuation\",\"note\":\"Evaluating completion conditions (not auto-exiting)\"}" >> "$LOGS_DIR/auto-iterations.log" 2>/dev/null || true
fi

# Check if session file exists
if [ ! -f "$SESSION_FILE" ]; then
    approve "No auto session active"
fi

# Load session state
SESSION=$(cat "$SESSION_FILE")
STATUS=$(echo "$SESSION" | jq -r '.status // "unknown"')
SESSION_ID=$(echo "$SESSION" | jq -r '.sessionId // "unknown"')
ITERATION=$(echo "$SESSION" | jq -r '.iteration // 0')
MAX_ITERATIONS=$(echo "$SESSION" | jq -r '.maxIterations // 100')
CURRENT_INCREMENT=$(echo "$SESSION" | jq -r '.currentIncrement // null')
SIMPLE_MODE=$(echo "$SESSION" | jq -r '.simple // false')
START_TIME=$(echo "$SESSION" | jq -r '.startTime // ""')
MAX_HOURS=$(echo "$SESSION" | jq -r '.maxHours // null')
TEST_RETRY_COUNT=$(echo "$SESSION" | jq -r '.testRetryCount // 0')

# Check if session is not running
if [ "$STATUS" != "running" ]; then
    approve "Session status is $STATUS, not running"
fi

# ============================================================================
# HEARTBEAT & WATCHDOG (NEW - v2.1)
# Check for stale sessions BEFORE updating heartbeat
# ============================================================================

# Check for stale heartbeat BEFORE updating (watchdog detection)
HEARTBEAT_STATUS=$(check_heartbeat_stale)

# Update heartbeat timestamp (this refreshes it for next iteration)
update_heartbeat
if echo "$HEARTBEAT_STATUS" | grep -q "^stale:"; then
    STALE_AGE=$(echo "$HEARTBEAT_STATUS" | cut -d: -f2)
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"stale_heartbeat_detected\",\"age\":\"$STALE_AGE\"}" >> "$LOGS_DIR/auto-iterations.log"
    # Note: We don't pause here because the stop hook running means the session is active
    # This is more for external watchdog processes to detect
fi

# ============================================================================
# CONTEXT SIZE CHECK - REMOVED (v2.4)
# ============================================================================
# Removed: Claude Code v2.0.64+ handles context management natively.
# See comment at top of file for details.
# ============================================================================

# ============================================================================
# CHECKPOINT RECOVERY CHECK (NEW - v2.1)
# Detect and resume from incomplete checkpoints
# ============================================================================

CHECKPOINT_STATUS=$(check_incomplete_checkpoint)
if [ "$CHECKPOINT_STATUS" = "incomplete" ]; then
    CHECKPOINT_DATA=$(load_task_checkpoint)
    CHECKPOINT_TASK=$(echo "$CHECKPOINT_DATA" | jq -r '.taskId')
    CHECKPOINT_INCREMENT=$(echo "$CHECKPOINT_DATA" | jq -r '.incrementId')

    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"incomplete_checkpoint_found\",\"task\":\"$CHECKPOINT_TASK\"}" >> "$LOGS_DIR/auto-iterations.log"

    # Don't block - just log and continue. The task may have completed.
fi

# Check max iterations
NEXT_ITERATION=$((ITERATION + 1))
if [ "$NEXT_ITERATION" -ge "$MAX_ITERATIONS" ]; then
    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.status = "completed" | .endTime = $now | .endReason = "max_iterations_reached"' \
        > "$SESSION_FILE"
    approve "Max iterations ($MAX_ITERATIONS) reached"
fi

# Check max hours if configured
if [ "$MAX_HOURS" != "null" ] && [ -n "$START_TIME" ]; then
    parse_iso_date() {
        local dt="$1"
        date -j -f "%Y-%m-%dT%H:%M:%SZ" "$dt" "+%s" 2>/dev/null && return
        date -d "$dt" "+%s" 2>/dev/null && return
        python3 -c "import datetime; print(int(datetime.datetime.fromisoformat('$dt'.replace('Z','+00:00')).timestamp()))" 2>/dev/null && return
        node -e "console.log(Math.floor(new Date('$dt').getTime()/1000))" 2>/dev/null && return
        echo "0"
    }

    START_EPOCH=$(parse_iso_date "$START_TIME")
    NOW_EPOCH=$(date "+%s")
    ELAPSED_HOURS=$(( (NOW_EPOCH - START_EPOCH) / 3600 ))

    if [ "$ELAPSED_HOURS" -ge "$MAX_HOURS" ]; then
        echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.status = "completed" | .endTime = $now | .endReason = "max_hours_exceeded"' \
            > "$SESSION_FILE"
        approve "Max hours ($MAX_HOURS) exceeded"
    fi
fi

# ============================================================================
# TRANSCRIPT ANALYSIS (Enhanced v2.0)
# ============================================================================

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Check for completion promise (v2.10 - STRICTER VALIDATION)
    # Only accept completion promise if:
    # 1. Promise is in the LAST 100 lines of transcript (fresh, not legacy)
    # 2. All tasks are marked complete
    # 3. Tests pass OR no tests exist
    if tail -100 "$TRANSCRIPT_PATH" 2>/dev/null | grep -q "<auto-complete>DONE</auto-complete>"; then
        # Verify tasks are actually complete before accepting promise
        TASKS_FILE=""
        if [ -n "$CURRENT_INCREMENT" ] && [ "$CURRENT_INCREMENT" != "null" ]; then
            TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT/tasks.md"
        fi

        PROMISE_VALID="true"
        PROMISE_BLOCK_REASON=""

        if [ -f "$TASKS_FILE" ]; then
            # Use subshell to prevent || echo from appending extra output
            TOTAL_TASKS=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null) || TOTAL_TASKS="0"
            COMPLETED_TASKS=$(grep -c '\[x\].*completed' "$TASKS_FILE" 2>/dev/null) || COMPLETED_TASKS="0"
            # Ensure clean integers (trim whitespace/newlines)
            TOTAL_TASKS=$(echo "$TOTAL_TASKS" | tr -d '[:space:]')
            COMPLETED_TASKS=$(echo "$COMPLETED_TASKS" | tr -d '[:space:]')
            TOTAL_TASKS=${TOTAL_TASKS:-0}
            COMPLETED_TASKS=${COMPLETED_TASKS:-0}

            if [ "$TOTAL_TASKS" -gt 0 ] && [ "$COMPLETED_TASKS" -lt "$TOTAL_TASKS" ]; then
                PROMISE_VALID="false"
                PROMISE_BLOCK_REASON="Completion promise rejected: $COMPLETED_TASKS/$TOTAL_TASKS tasks complete"
            fi
        fi

        # Also check for test failures in recent transcript
        if [ "$PROMISE_VALID" = "true" ]; then
            # Check last 200 lines for test failures
            TEST_FAILURES_DETECTED=$(tail -200 "$TRANSCRIPT_PATH" 2>/dev/null | grep -cE "(FAIL|failed|❌|✗).*test") || TEST_FAILURES_DETECTED="0"
            TEST_PASSES_DETECTED=$(tail -200 "$TRANSCRIPT_PATH" 2>/dev/null | grep -cE "(PASS|passed|✓|✔)") || TEST_PASSES_DETECTED="0"
            TEST_FAILURES_DETECTED=$(echo "$TEST_FAILURES_DETECTED" | tr -d '[:space:]')
            TEST_PASSES_DETECTED=$(echo "$TEST_PASSES_DETECTED" | tr -d '[:space:]')
            TEST_FAILURES_DETECTED=${TEST_FAILURES_DETECTED:-0}
            TEST_PASSES_DETECTED=${TEST_PASSES_DETECTED:-0}

            if [ "$TEST_FAILURES_DETECTED" -gt 0 ] && [ "$TEST_PASSES_DETECTED" -eq 0 ]; then
                PROMISE_VALID="false"
                PROMISE_BLOCK_REASON="Completion promise rejected: test failures detected in recent output"
            fi
        fi

        if [ "$PROMISE_VALID" = "true" ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                '.status = "completed" | .endTime = $now | .endReason = "completion_promise"' \
                > "$SESSION_FILE"
            approve "Completion promise detected (validated)" "true"
        else
            # Log rejected promise
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"completion_promise_rejected\",\"reason\":\"$PROMISE_BLOCK_REASON\"}" >> "$LOGS_DIR/auto-iterations.log"
        fi
    fi

    # Check self-assessment score
    SELF_SCORE=$(grep -oE 'Overall:\s*[0-9]+\.[0-9]+' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1 | grep -oE '[0-9]+\.[0-9]+' || true)
    if [ -n "$SELF_SCORE" ]; then
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"self_assessment\",\"score\":$SELF_SCORE,\"increment\":\"$CURRENT_INCREMENT\"}" >> "$LOGS_DIR/auto-iterations.log"

        if [ "$(echo "$SELF_SCORE < 0.50" | bc 2>/dev/null || echo "0")" -eq 1 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg score "$SELF_SCORE" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "low_confidence_score" | .lastScore = ($score | tonumber)' \
                > "$SESSION_FILE"
            approve "Low confidence score ($SELF_SCORE < 0.50), requesting human review"
        fi
    fi

    # ========================================================================
    # COMPLETION CONDITIONS VALIDATION (v0.4.0+)
    # New flexible framework that validates build, tests, lint, types, etc.
    # with per-condition autoHeal and maxRetries configuration
    # ========================================================================

    # Check if session has completionConditions defined
    HAS_CONDITIONS=$(jq -r 'has("completionConditions")' "$SESSION_FILE" 2>/dev/null || echo "false")
    CONDITIONS_COUNT=$(jq -r '.completionConditions | length' "$SESSION_FILE" 2>/dev/null || echo "0")

    if [ "$HAS_CONDITIONS" = "true" ] && [ "$CONDITIONS_COUNT" -gt 0 ]; then
        # ====================================================================
        # NEW PATH: Use completion conditions validator
        # ====================================================================

        VALIDATOR_SCRIPT="$SCRIPT_DIR/validate-completion-conditions.sh"

        if [ -x "$VALIDATOR_SCRIPT" ]; then
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"completion_conditions_check\",\"conditions\":$CONDITIONS_COUNT}" >> "$LOGS_DIR/auto-iterations.log"

            # Run validator and capture output
            VALIDATOR_OUTPUT=$(bash "$VALIDATOR_SCRIPT" "$SESSION_FILE" "$TRANSCRIPT_PATH" 2>&1)
            VALIDATOR_EXIT=$?

            if [ $VALIDATOR_EXIT -ne 0 ]; then
                # Validation failed - parse which condition failed
                FAILED_CONDITION=$(echo "$VALIDATOR_OUTPUT" | grep "^BLOCK:" | head -1 | sed 's/^BLOCK://')

                # Determine condition type from failure message
                CONDITION_TYPE=""
                if echo "$FAILED_CONDITION" | grep -qi "build"; then
                    CONDITION_TYPE="build"
                elif echo "$FAILED_CONDITION" | grep -qi "test"; then
                    CONDITION_TYPE="tests"
                elif echo "$FAILED_CONDITION" | grep -qi "lint"; then
                    CONDITION_TYPE="lint"
                elif echo "$FAILED_CONDITION" | grep -qi "type"; then
                    CONDITION_TYPE="types"
                elif echo "$FAILED_CONDITION" | grep -qi "coverage"; then
                    CONDITION_TYPE="coverage"
                elif echo "$FAILED_CONDITION" | grep -qi "e2e"; then
                    CONDITION_TYPE="e2e"
                else
                    CONDITION_TYPE="command"
                fi

                # Check if auto-heal is enabled for this condition
                AUTO_HEAL=$(jq -r ".completionConditions[] | select(.type == \"$CONDITION_TYPE\") | .autoHeal // false" "$SESSION_FILE" 2>/dev/null)
                MAX_RETRIES=$(jq -r ".completionConditions[] | select(.type == \"$CONDITION_TYPE\") | .maxRetries // 3" "$SESSION_FILE" 2>/dev/null)

                # Get current retry count for this condition type
                RETRY_COUNT=$(echo "$SESSION" | jq -r ".conditionRetries[\"$CONDITION_TYPE\"] // 0")

                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"condition_failed\",\"condition\":\"$CONDITION_TYPE\",\"autoHeal\":$AUTO_HEAL,\"retryCount\":$RETRY_COUNT,\"maxRetries\":$MAX_RETRIES}" >> "$LOGS_DIR/auto-iterations.log"

                if [ "$AUTO_HEAL" = "true" ] && [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; then
                    # Auto-heal enabled and retries remaining - trigger self-healing
                    NEW_RETRY=$((RETRY_COUNT + 1))

                    # Update retry count in session
                    echo "$SESSION" | jq --arg type "$CONDITION_TYPE" --argjson retry "$NEW_RETRY" \
                        '.conditionRetries[$type] = $retry' \
                        > "$SESSION_FILE"

                    # Build fix prompt based on condition type
                    FIX_PROMPT="🔴 COMPLETION CONDITION FAILED - AUTO-HEAL RETRY $NEW_RETRY/$MAX_RETRIES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONDITION: $CONDITION_TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$FAILED_CONDITION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTO-HEAL INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ANALYZE the $CONDITION_TYPE failure above
2. FIX the underlying issue
3. RE-RUN the validation command
4. VERIFY it passes before continuing

⚠️ Retries remaining: $((MAX_RETRIES - NEW_RETRY))
⚠️ After exhausting retries, session will pause for human review"

                    block "Completion condition failed - auto-heal retry $NEW_RETRY/$MAX_RETRIES" "$FIX_PROMPT"

                elif [ "$AUTO_HEAL" = "true" ] && [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
                    # Retries exhausted
                    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg type "$CONDITION_TYPE" \
                        '.status = "paused" | .pauseTime = $now | .pauseReason = "completion_condition_retries_exhausted" | .conditionRetries[$type] = 0' \
                        > "$SESSION_FILE"

                    approve "Completion condition '$CONDITION_TYPE' failed after $MAX_RETRIES retries - human review required.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILURE: $FAILED_CONDITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auto-healing exhausted. Please fix manually and run /sw:auto to continue."

                else
                    # Auto-heal disabled - block immediately
                    echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg type "$CONDITION_TYPE" \
                        '.status = "paused" | .pauseTime = $now | .pauseReason = "completion_condition_failed_no_autoheal"' \
                        > "$SESSION_FILE"

                    approve "Completion condition '$CONDITION_TYPE' failed - auto-heal disabled, human intervention required.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAILURE: $FAILED_CONDITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auto-healing is DISABLED for this condition type.
Please fix manually and run /sw:auto to continue."
                fi
            else
                # All conditions passed - reset retry counters
                echo "$SESSION" | jq '.conditionRetries = {}' > "$SESSION_FILE"
                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"completion_conditions_passed\",\"conditions\":$CONDITIONS_COUNT}" >> "$LOGS_DIR/auto-iterations.log"
            fi
        else
            # Validator script not executable - fallback to legacy logic
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"validator_not_found\",\"fallback\":true}" >> "$LOGS_DIR/auto-iterations.log"
            HAS_CONDITIONS="false"  # Force fallback
        fi
    fi

    # ========================================================================
    # LEGACY PATH: Fallback for sessions without completionConditions
    # This ensures backward compatibility with existing auto sessions
    # ========================================================================

    if [ "$HAS_CONDITIONS" != "true" ] || [ "$CONDITIONS_COUNT" -eq 0 ]; then
        # ====================================================================
        # CRITICAL: Parse actual test RESULTS (not just execution)
        # ====================================================================
        TEST_RESULTS=$(parse_test_results "$TRANSCRIPT_PATH")
        TESTS_PASSED=$(echo "$TEST_RESULTS" | jq -r '.passed')
        TESTS_FAILED=$(echo "$TEST_RESULTS" | jq -r '.failed')
        TESTS_TOTAL=$(echo "$TEST_RESULTS" | jq -r '.total')
        TEST_FRAMEWORK=$(echo "$TEST_RESULTS" | jq -r '.framework')
        TESTS_RUN=$(echo "$TEST_RESULTS" | jq -r '.testsRun')

        # If tests were run and ANY failed, trigger self-healing loop
        if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -gt 0 ]; then
            # Log test failure
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"test_failure\",\"passed\":$TESTS_PASSED,\"failed\":$TESTS_FAILED,\"framework\":\"$TEST_FRAMEWORK\",\"legacy\":true}" >> "$LOGS_DIR/auto-iterations.log"

            # Extract failure details
            FAILURE_DETAILS=$(extract_failure_details "$TRANSCRIPT_PATH")

            # Trigger self-healing loop (legacy always has auto-heal enabled)
            handle_test_failure "$FAILURE_DETAILS"
        fi

        # If tests passed, reset retry counter
        if [ "$TESTS_RUN" = "true" ] && [ "$TESTS_FAILED" -eq 0 ] && [ "$TESTS_PASSED" -gt 0 ]; then
            if [ "$TEST_RETRY_COUNT" -gt 0 ]; then
                reset_retry_counter
                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"tests_passed_after_retry\",\"passed\":$TESTS_PASSED,\"legacy\":true}" >> "$LOGS_DIR/auto-iterations.log"
            fi
        fi
    fi

    # Check for deployment/credential errors
    if grep -qE "wrangler.*error|supabase.*error|terraform.*error|aws.*error|Error:.*credential|Error:.*secret|Error:.*token" "$TRANSCRIPT_PATH" 2>/dev/null; then
        CRED_ERRORS=$(grep -cE "credential|secret|token" "$TRANSCRIPT_PATH" 2>/dev/null | tr -d '[:space:]' || echo "0")
        if [ "$CRED_ERRORS" -gt 2 ]; then
            echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                '.status = "paused" | .pauseTime = $now | .pauseReason = "credential_errors"' \
                > "$SESSION_FILE"
            approve "Multiple credential/deployment errors, requesting credential check"
        fi
    fi
fi

# ============================================================================
# E2E COVERAGE MANIFEST CHECK (NEW - v2.0)
# Verifies route/viewport coverage before allowing completion
# ============================================================================

# Check E2E coverage manifest and return gap report
check_e2e_coverage() {
    local manifest_file="$STATE_DIR/e2e-manifest.json"

    # No manifest = non-UI project, skip check
    if [ ! -f "$manifest_file" ]; then
        echo '{"hasManifest":false,"coverage":{"routes":0,"viewports":0},"gaps":[]}'
        return
    fi

    # Read manifest
    local manifest=$(cat "$manifest_file")

    # Extract coverage stats
    local route_coverage=$(echo "$manifest" | jq -r '.coverage.routes // 0')
    local viewport_coverage=$(echo "$manifest" | jq -r '.coverage.viewports // 0')

    # Get untested routes
    local untested_routes=$(echo "$manifest" | jq -c '[.routes | to_entries[] | select(.value.tested == false) | .key]')
    local untested_count=$(echo "$untested_routes" | jq 'length')

    # Get routes with missing viewports
    local incomplete_viewports=$(echo "$manifest" | jq -c '[.routes | to_entries[] | select(.value.tested == true and (.value.viewports | length) < 3) | {route: .key, missing: (["mobile","tablet","desktop"] - .value.viewports)}]')

    # Get viewport coverage flags
    local mobile=$(echo "$manifest" | jq -r '.viewportsCovered.mobile // false')
    local tablet=$(echo "$manifest" | jq -r '.viewportsCovered.tablet // false')
    local desktop=$(echo "$manifest" | jq -r '.viewportsCovered.desktop // false')

    # Build gaps array
    local gaps="[]"
    if [ "$untested_count" -gt 0 ]; then
        gaps=$(echo "$untested_routes" | jq 'map({type: "untested_route", route: .})')
    fi

    # Add missing viewports to gaps
    local incomplete_count=$(echo "$incomplete_viewports" | jq 'length')
    if [ "$incomplete_count" -gt 0 ]; then
        local viewport_gaps=$(echo "$incomplete_viewports" | jq 'map({type: "missing_viewports", route: .route, missing: .missing})')
        gaps=$(echo "[$gaps, $viewport_gaps]" | jq 'add')
    fi

    echo "{\"hasManifest\":true,\"coverage\":{\"routes\":$route_coverage,\"viewports\":$viewport_coverage},\"gaps\":$gaps,\"viewports\":{\"mobile\":$mobile,\"tablet\":$tablet,\"desktop\":$desktop},\"untestedCount\":$untested_count}"
}

# ============================================================================
# TASK COMPLETION CHECK
# ============================================================================

if [ -n "$CURRENT_INCREMENT" ]; then
    TASKS_FILE="$PROJECT_ROOT/.specweave/increments/$CURRENT_INCREMENT/tasks.md"

    if [ -f "$TASKS_FILE" ]; then
        TOTAL_TASKS=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        COMPLETED_TASKS=$(grep -c '\[x\].*completed' "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo "0")
        TOTAL_TASKS=${TOTAL_TASKS:-0}
        COMPLETED_TASKS=${COMPLETED_TASKS:-0}

        if [ "$TOTAL_TASKS" -gt 0 ] && [ "$COMPLETED_TASKS" -ge "$TOTAL_TASKS" ]; then
            # All tasks marked complete - but verify tests actually passed

            # ================================================================
            # TDD STRICT MODE CHECK (NEW - v2.2)
            # In TDD mode, tests MUST pass - no exceptions
            # ================================================================
            TDD_MODE=$(is_tdd_strict_mode)
            TEST_MODE=$(get_test_mode)

            # Log TDD mode status
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"completion_check\",\"tddMode\":$TDD_MODE,\"testMode\":\"$TEST_MODE\",\"tasksComplete\":$COMPLETED_TASKS,\"totalTasks\":$TOTAL_TASKS}" >> "$LOGS_DIR/auto-iterations.log"

            # Check for test files in project
            HAS_UNIT_TESTS=false
            HAS_E2E_TESTS=false
            if [ -d "$PROJECT_ROOT/tests" ] || [ -d "$PROJECT_ROOT/src" ]; then
                if find "$PROJECT_ROOT" -maxdepth 6 \
                    -not -path "*/node_modules/*" \
                    -not -path "*/.git/*" \
                    -not -path "*/dist/*" \
                    -not -path "*/build/*" \
                    -not -path "*/coverage/*" \
                    -not -path "*/.next/*" \
                    -not -path "*/vendor/*" \
                    \( -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.js" -o -name "*.spec.js" -o -name "test_*.py" -o -name "*_test.go" \) \
                    2>/dev/null | head -1 | grep -q .; then
                    HAS_UNIT_TESTS=true
                fi
                if [ -f "$PROJECT_ROOT/playwright.config.ts" ] || [ -f "$PROJECT_ROOT/playwright.config.js" ] || [ -d "$PROJECT_ROOT/e2e" ] || [ -d "$PROJECT_ROOT/cypress" ]; then
                    HAS_E2E_TESTS=true
                fi
            fi

            # Verify tests were run AND passed
            if [ "$HAS_UNIT_TESTS" = true ]; then
                if [ "$TESTS_RUN" != "true" ]; then
                    # TDD mode is even stricter
                    if [ "$TDD_MODE" = "true" ]; then
                        block "TDD MODE: Tests MANDATORY before completion" "🔴 TDD STRICT MODE ACTIVE - TESTS REQUIRED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ALL TESTS MUST BE GREEN BEFORE AUTO MODE CAN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks are marked complete but NO TESTS WERE RUN!

In TDD mode, this is a BLOCKING requirement:
1. Write/verify tests exist for all implemented features
2. Run ALL tests: npm test && npx vitest run
3. Verify 100% of tests pass (0 failures)
4. Only then can auto mode complete

Current status:
  Tasks: $COMPLETED_TASKS/$TOTAL_TASKS complete
  Tests: NOT EXECUTED ❌

Run your tests NOW with: npm test"
                    else
                        block "Tasks complete but TESTS NOT RUN" "🧪 MANDATORY: All tasks marked complete but NO TEST EXECUTION detected.

You MUST run tests before completion:
  npm test          (unit/integration)
  npx vitest run    (if using vitest)
  npx playwright test (E2E if applicable)

Continue with /sw:do and run ALL tests. Verify 0 failures before proceeding."
                    fi
                fi

                if [ "$TESTS_FAILED" -gt 0 ]; then
                    # TDD mode - even stricter message
                    if [ "$TDD_MODE" = "true" ]; then
                        block "TDD MODE: $TESTS_FAILED tests FAILING - CANNOT COMPLETE" "🔴 TDD STRICT MODE - TESTS MUST BE GREEN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ $TESTS_FAILED TEST(S) FAILING - AUTO MODE BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TDD Mode requires ALL tests to pass. No exceptions.

Current status:
  Tests passed: $TESTS_PASSED ✅
  Tests failed: $TESTS_FAILED ❌
  Framework: $TEST_FRAMEWORK

YOU CANNOT SKIP THIS. Auto mode will NOT complete until:
1. ALL $TESTS_FAILED failing tests are fixed
2. Re-run tests: npm test
3. Verify 0 failures

This is by design. TDD discipline = quality."
                    else
                        # Standard mode - still blocks but less strict message
                        block "Tasks complete but TESTS FAILING" "🔴 CRITICAL: All tasks marked complete but $TESTS_FAILED tests are FAILING!

You claimed completion but tests are not passing. This is not acceptable.

FIX the failing tests before marking tasks complete.
Re-run: npm test or npx vitest run"
                    fi
                fi

                # TDD MODE: Additional check - require MINIMUM test count
                if [ "$TDD_MODE" = "true" ] && [ "$TESTS_PASSED" -eq 0 ]; then
                    block "TDD MODE: No tests passed - suspicious" "🔴 TDD STRICT MODE - SUSPICIOUS STATE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 0 TESTS PASSED - SOMETHING IS WRONG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have $COMPLETED_TASKS tasks marked complete but 0 tests passed.

This suggests:
1. Tests exist but weren't actually run
2. Test detection isn't working
3. Test output wasn't captured

In TDD mode, you MUST have passing tests for completed work.

Actions:
1. Run tests explicitly: npm test
2. Verify test output shows passed count
3. Check test files exist for implemented features"
                fi
            fi

            # Check E2E separately
            if [ "$HAS_E2E_TESTS" = true ]; then
                E2E_RUN=false
                if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
                    if grep -qE "(playwright test|cypress run|npx playwright|Running.*E2E|e2e.*passed)" "$TRANSCRIPT_PATH" 2>/dev/null; then
                        E2E_RUN=true
                    fi
                fi

                if [ "$E2E_RUN" = false ]; then
                    block "Tasks complete but E2E TESTS NOT RUN" "🎭 MANDATORY: E2E tests exist but were NOT executed.

You MUST run E2E tests for user-facing features:
  npx playwright test
  # or: cypress run

Test EVERY route, EVERY button click, on mobile AND desktop viewports.
Continue with /sw:do and complete E2E testing."
                fi

                # ================================================================
                # E2E COVERAGE MANIFEST CHECK
                # Block if routes/viewports not fully covered
                # ================================================================
                E2E_COVERAGE=$(check_e2e_coverage)
                E2E_HAS_MANIFEST=$(echo "$E2E_COVERAGE" | jq -r '.hasManifest')

                if [ "$E2E_HAS_MANIFEST" = "true" ]; then
                    E2E_ROUTE_COVERAGE=$(echo "$E2E_COVERAGE" | jq -r '.coverage.routes')
                    E2E_VIEWPORT_COVERAGE=$(echo "$E2E_COVERAGE" | jq -r '.coverage.viewports')
                    E2E_UNTESTED_COUNT=$(echo "$E2E_COVERAGE" | jq -r '.untestedCount')
                    E2E_MOBILE=$(echo "$E2E_COVERAGE" | jq -r '.viewports.mobile')
                    E2E_TABLET=$(echo "$E2E_COVERAGE" | jq -r '.viewports.tablet')
                    E2E_DESKTOP=$(echo "$E2E_COVERAGE" | jq -r '.viewports.desktop')

                    # Log coverage check
                    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"e2e_coverage_check\",\"routes\":$E2E_ROUTE_COVERAGE,\"viewports\":$E2E_VIEWPORT_COVERAGE,\"untested\":$E2E_UNTESTED_COUNT}" >> "$LOGS_DIR/auto-iterations.log"

                    # Get configurable threshold (default 80%)
                    E2E_THRESHOLD=$(echo "$SESSION" | jq -r '.e2eCoverageThreshold // 80')

                    # Block if coverage below threshold
                    if [ "$E2E_ROUTE_COVERAGE" -lt "$E2E_THRESHOLD" ]; then
                        # Build untested routes list
                        UNTESTED_LIST=$(echo "$E2E_COVERAGE" | jq -r '[.gaps[] | select(.type == "untested_route") | .route] | join("\n  - ")' | sed 's/^/  - /')

                        block "E2E coverage incomplete ($E2E_ROUTE_COVERAGE%)" "📊 E2E COVERAGE BELOW THRESHOLD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COVERAGE REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Route Coverage: $E2E_ROUTE_COVERAGE% (threshold: $E2E_THRESHOLD%)
📱 Viewport Coverage: $E2E_VIEWPORT_COVERAGE%
  - Mobile:  $([ \"$E2E_MOBILE\" = \"true\" ] && echo '✅' || echo '❌')
  - Tablet:  $([ \"$E2E_TABLET\" = \"true\" ] && echo '✅' || echo '❌')
  - Desktop: $([ \"$E2E_DESKTOP\" = \"true\" ] && echo '✅' || echo '❌')

❌ UNTESTED ROUTES ($E2E_UNTESTED_COUNT):
$UNTESTED_LIST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add E2E tests for the untested routes above.
Each test should visit the route and verify key functionality.

Example for a login route:
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading')).toContainText('Login');
  });

Continue with /sw:do and add missing E2E tests."
                    fi

                    # Warn about incomplete viewport coverage (don't block)
                    if [ "$E2E_VIEWPORT_COVERAGE" -lt 100 ]; then
                        # Get missing viewport details
                        MISSING_VIEWPORTS=""
                        [ "$E2E_MOBILE" = "false" ] && MISSING_VIEWPORTS="$MISSING_VIEWPORTS mobile"
                        [ "$E2E_TABLET" = "false" ] && MISSING_VIEWPORTS="$MISSING_VIEWPORTS tablet"
                        [ "$E2E_DESKTOP" = "false" ] && MISSING_VIEWPORTS="$MISSING_VIEWPORTS desktop"

                        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"viewport_coverage_warning\",\"missing\":\"$MISSING_VIEWPORTS\"}" >> "$LOGS_DIR/auto-iterations.log"
                    fi
                fi
            fi

            # Check queue for more increments
            QUEUE_LENGTH=$(echo "$SESSION" | jq '.incrementQueue | length')

            # Generate transition summary for completed increment
            generate_increment_summary() {
                local inc_id="$1"
                local tasks_file="$PROJECT_ROOT/.specweave/increments/$inc_id/tasks.md"
                local summary=""

                if [ -f "$tasks_file" ]; then
                    local total=$(grep -c "^### T-" "$tasks_file" 2>/dev/null | tr -d '[:space:]' || echo "0")
                    local completed=$(grep -c '\[x\].*completed' "$tasks_file" 2>/dev/null | tr -d '[:space:]' || echo "0")
                    summary="Tasks: $completed/$total"
                else
                    summary="Tasks: unknown"
                fi

                # Calculate duration if start time available
                local inc_start=$(echo "$SESSION" | jq -r ".incrementStartTimes[\"$inc_id\"] // null")
                if [ "$inc_start" != "null" ]; then
                    local start_epoch=$(date -d "$inc_start" "+%s" 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$inc_start" "+%s" 2>/dev/null || echo "0")
                    local now_epoch=$(date "+%s")
                    if [ "$start_epoch" -gt 0 ]; then
                        local duration_mins=$(( (now_epoch - start_epoch) / 60 ))
                        summary="$summary | Duration: ${duration_mins}m"
                    fi
                fi

                echo "$summary"
            }

            # Save increment summary to logs
            save_increment_summary() {
                local inc_id="$1"
                local summary_file="$LOGS_DIR/increment-$inc_id-summary.json"
                local summary_data="{
                    \"incrementId\": \"$inc_id\",
                    \"completedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                    \"tasksCompleted\": ${COMPLETED_TASKS:-0},
                    \"tasksTotal\": ${TOTAL_TASKS:-0},
                    \"testsRun\": ${TESTS_RUN:-false},
                    \"testsPassed\": ${TESTS_PASSED:-0},
                    \"testsFailed\": ${TESTS_FAILED:-0}
                }"
                echo "$summary_data" > "$summary_file"

                # Log to iterations log
                echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"increment_complete\",\"increment\":\"$inc_id\",\"tasks\":${COMPLETED_TASKS:-0},\"tests\":${TESTS_PASSED:-0}}" >> "$LOGS_DIR/auto-iterations.log"
            }

            if [ "$QUEUE_LENGTH" -le 1 ]; then
                # Final completion - all tests passed, all tasks done
                save_increment_summary "$CURRENT_INCREMENT"

                # Generate final session summary
                COMPLETED_COUNT=$(echo "$SESSION" | jq '.completedIncrements | length')
                FAILED_COUNT=$(echo "$SESSION" | jq '.failedIncrements | length')

                echo "$SESSION" | jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                    --argjson passed "${TESTS_PASSED:-0}" --argjson failed "${TESTS_FAILED:-0}" \
                    '.status = "completed" | .endTime = $now | .endReason = "all_tasks_complete" | .finalTestResults = {"passed": $passed, "failed": $failed}' \
                    > "$SESSION_FILE"

                # Build detailed completion reason with test breakdown (NEW - v2.5)
                completion_reason="All tasks completed"
                test_breakdown=$(get_test_type_breakdown "$TRANSCRIPT_PATH")
                if [ -n "$test_breakdown" ] && [ "$test_breakdown" != "{}" ]; then
                    unit_p=$(echo "$test_breakdown" | jq -r '.unit.passed // 0')
                    int_p=$(echo "$test_breakdown" | jq -r '.integration.passed // 0')
                    e2e_p=$(echo "$test_breakdown" | jq -r '.e2e.passed // 0')

                    test_details=""
                    [ "$unit_p" -gt 0 ] && test_details="${test_details}${unit_p} unit"
                    [ "$int_p" -gt 0 ] && test_details="${test_details}${test_details:+, }${int_p} integration"
                    [ "$e2e_p" -gt 0 ] && test_details="${test_details}${test_details:+, }${e2e_p} E2E"

                    if [ -n "$test_details" ]; then
                        completion_reason="$completion_reason, tests passed: $test_details"
                    else
                        completion_reason="$completion_reason, all tests passed ($TESTS_PASSED passed, 0 failed)"
                    fi
                else
                    completion_reason="$completion_reason, all tests passed ($TESTS_PASSED passed, 0 failed)"
                fi

                # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                # VALIDATE COMPLETION CONDITIONS (v1.1.0)
                # Run comprehensive validation BEFORE approving session completion
                # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                VALIDATOR_SCRIPT="$(dirname "$0")/validate-completion-conditions.sh"
                if [ -f "$VALIDATOR_SCRIPT" ]; then
                    echo "" >&2
                    echo "🔍 Validating completion conditions..." >&2

                    # Run validator with session file and transcript
                    if ! "$VALIDATOR_SCRIPT" "$SESSION_FILE" "$TRANSCRIPT_PATH" 2>&1 | tee -a "$LOGS_DIR/auto-iterations.log"; then
                        # Validation FAILED - extract failure details
                        VALIDATION_OUTPUT=$("$VALIDATOR_SCRIPT" "$SESSION_FILE" "$TRANSCRIPT_PATH" 2>&1 || true)

                        # Extract failed conditions
                        FAILED_CONDITIONS=$(echo "$VALIDATION_OUTPUT" | grep "^BLOCK:" | sed 's/^BLOCK://' | paste -sd ", " -)

                        if [ -z "$FAILED_CONDITIONS" ]; then
                            FAILED_CONDITIONS="Unknown validation failure"
                        fi

                        # HARD BLOCK - conditions not met
                        block "❌ COMPLETION CONDITIONS NOT MET

$VALIDATION_OUTPUT

The auto session cannot complete until ALL mandatory conditions pass.

🔧 Next Steps:
  1. Review the failed conditions above
  2. Fix the issues identified
  3. Re-run the validation
  4. Session will continue automatically

⚠️  This is a HARD BLOCK - mandatory conditions cannot be bypassed.
Tasks are marked [x] but quality gates have not been met.

Run /sw:progress to check current status.
Run /sw:validate to see detailed validation results." "validation_failed:$FAILED_CONDITIONS"
                    fi

                    echo "✅ All completion conditions passed!" >&2
                fi

                # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                approve "$completion_reason" "true"
            else
                # More increments in queue - transition to next
                NEXT_INCREMENT=$(echo "$SESSION" | jq -r '.incrementQueue[1] // null')
                if [ "$NEXT_INCREMENT" != "null" ]; then
                    # Save summary of completed increment
                    save_increment_summary "$CURRENT_INCREMENT"
                    INCREMENT_SUMMARY=$(generate_increment_summary "$CURRENT_INCREMENT")

                    # Get remaining increments count
                    REMAINING=$((QUEUE_LENGTH - 1))

                    # Track start time for next increment
                    echo "$SESSION" | jq --arg next "$NEXT_INCREMENT" --arg completed "$CURRENT_INCREMENT" \
                        --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                        '.currentIncrement = $next | .completedIncrements += [$completed] | .incrementQueue = .incrementQueue[1:] | .testRetryCount = 0 | .incrementStartTimes[$next] = $now' \
                        > "$SESSION_FILE"

                    block "Increment complete, starting next" "✅ INCREMENT COMPLETE: $CURRENT_INCREMENT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 $INCREMENT_SUMMARY
  🧪 Tests: $TESTS_PASSED passed, 0 failed
  ✅ Status: All acceptance criteria met

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT INCREMENT: $NEXT_INCREMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Queue: $REMAINING increment(s) remaining

Continue with /sw:do to start the next increment."
                fi
            fi
        fi
    fi
fi

# ============================================================================
# LIVING DOCS UPDATE CHECK
# ============================================================================

LIVING_DOCS_CHECKPOINT="$STATE_DIR/living-docs-checkpoint.json"

if [ -f "$LIVING_DOCS_CHECKPOINT" ]; then
    CURRENT_PHASE=$(jq -r '.currentPhase // "unknown"' "$LIVING_DOCS_CHECKPOINT")
    COMPLETED_PHASES=$(jq -r '.completedPhases | length' "$LIVING_DOCS_CHECKPOINT")
    TOTAL_PHASES=$(jq -r '.totalPhases // 8' "$LIVING_DOCS_CHECKPOINT")
    PHASE_NAMES=("A:Discovery" "B:Deep Analysis" "C:Org Synthesis" "D:Architecture" "E:Inconsistencies" "F:Strategy" "G:Enterprise" "H:Diagrams")

    if [ "$COMPLETED_PHASES" -lt "$TOTAL_PHASES" ]; then
        # Map phase letter to name
        case "$CURRENT_PHASE" in
            A) PHASE_NAME="Discovery" ;;
            B) PHASE_NAME="Deep Analysis" ;;
            C) PHASE_NAME="Org Synthesis" ;;
            D) PHASE_NAME="Architecture" ;;
            E) PHASE_NAME="Inconsistencies" ;;
            F) PHASE_NAME="Strategy" ;;
            G) PHASE_NAME="Enterprise" ;;
            H) PHASE_NAME="Diagrams" ;;
            *) PHASE_NAME="Unknown" ;;
        esac

        PROGRESS_PCT=$((COMPLETED_PHASES * 100 / TOTAL_PHASES))

        # Build phase status list
        PHASE_STATUS=""
        for i in {0..7}; do
            PHASE_LETTER=$(echo "${PHASE_NAMES[$i]}" | cut -d: -f1)
            PHASE_LABEL=$(echo "${PHASE_NAMES[$i]}" | cut -d: -f2)
            if [ $i -lt "$COMPLETED_PHASES" ]; then
                PHASE_STATUS="${PHASE_STATUS}  ✅ Phase $PHASE_LETTER: $PHASE_LABEL\n"
            elif [ "$PHASE_LETTER" = "$CURRENT_PHASE" ]; then
                PHASE_STATUS="${PHASE_STATUS}  🔄 Phase $PHASE_LETTER: $PHASE_LABEL (in progress)\n"
            else
                PHASE_STATUS="${PHASE_STATUS}  ⏳ Phase $PHASE_LETTER: $PHASE_LABEL\n"
            fi
        done

        # Log living docs progress
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"living_docs_progress\",\"phase\":\"$CURRENT_PHASE\",\"completed\":$COMPLETED_PHASES,\"total\":$TOTAL_PHASES}" >> "$LOGS_DIR/auto-iterations.log"

        block "Living docs update in progress" "📚 LIVING DOCS UPDATE ($PROGRESS_PCT% complete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Phase: $PHASE_NAME
Progress: $COMPLETED_PHASES/$TOTAL_PHASES phases complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase Status:
$(echo -e "$PHASE_STATUS")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Continue with /sw:do to proceed with living docs update.
This will run for multiple iterations until all phases complete.

💡 Living docs runs in chunked mode (2 hours/iteration) and saves
   checkpoints after each phase. Safe to interrupt anytime!"
    fi

    # All phases complete - clean up and allow exit
    if [ "$COMPLETED_PHASES" -eq "$TOTAL_PHASES" ]; then
        rm -f "$LIVING_DOCS_CHECKPOINT"
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"living_docs_complete\",\"phases\":$TOTAL_PHASES}" >> "$LOGS_DIR/auto-iterations.log"
        # Don't approve exit here - let normal task completion flow handle it
    fi
fi

# Check for human gate pending
PENDING_GATE=$(echo "$SESSION" | jq -r '.humanGates.pending // null')
if [ "$PENDING_GATE" != "null" ]; then
    GATE_OP=$(echo "$PENDING_GATE" | jq -r '.operation // "unknown"')
    approve "Human gate pending: $GATE_OP - waiting for user approval"
fi

# Update iteration and continue
echo "$SESSION" | jq --argjson iter "$NEXT_ITERATION" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '.iteration = $iter | .lastActivity = $now' \
    > "$SESSION_FILE"

# Build context message with test instructions (v2.4 enhanced with agent hierarchy)
# Detect agent type for context message
AGENT_TYPE=$(detect_agent_type "$TRANSCRIPT_PATH")
AGENT_DISPLAY=$(get_agent_display_name "$AGENT_TYPE")

# Get subagent activity for context
SUBAGENT_ACTIVITY=$(detect_subagent_activity "$TRANSCRIPT_PATH")
SUBAGENT_COUNT=$(echo "$SUBAGENT_ACTIVITY" | jq -r '.spawned // 0')

if [ "$SIMPLE_MODE" = "true" ]; then
    CONTEXT="Continue working. Iteration $NEXT_ITERATION/$MAX_ITERATIONS."
else
    # Get TDD mode status
    TDD_MODE=$(is_tdd_strict_mode)

    PROGRESS=""
    if [ -n "$CURRENT_INCREMENT" ] && [ -f "$TASKS_FILE" ]; then
        PROGRESS="Tasks: $COMPLETED_TASKS/$TOTAL_TASKS completed."
    fi

    TEST_STATUS=""
    if [ "$TESTS_RUN" = "true" ]; then
        if [ "$TESTS_FAILED" -eq 0 ]; then
            TEST_STATUS="Tests: ✅ $TESTS_PASSED passed."
        else
            TEST_STATUS="Tests: ⚠️ $TESTS_PASSED passed, $TESTS_FAILED FAILED."
        fi
    else
        # Tests not run - add warning
        TEST_STATUS="Tests: ⚠️ NOT RUN YET!"
    fi

    # Get test instructions for this project (NEW - v2.2)
    TEST_INSTRUCTIONS=$(format_test_instructions)

    # Build agent header based on type (NEW - v2.4)
    AGENT_HEADER=""
    if [ "$AGENT_TYPE" = "orchestrator" ]; then
        AGENT_HEADER="
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  $AGENT_DISPLAY                                  ┃
┃  AUTO SESSION - Iteration $NEXT_ITERATION/$MAX_ITERATIONS                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
    else
        AGENT_HEADER="
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  $AGENT_DISPLAY                                  ┃
┃  Working under: 🤖 Main Orchestrator                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
    fi

    # Build stop criteria message - MUST be clear for each agent (v2.4)
    STOP_CRITERIA=""
    if [ "$AGENT_TYPE" = "orchestrator" ]; then
        # Main orchestrator stop criteria
        if [ "$TDD_MODE" = "true" ]; then
            STOP_CRITERIA="
╔══════════════════════════════════════════════════════════════╗
║  🎯 SESSION STOP CONDITION (TDD STRICT MODE)                 ║
╠══════════════════════════════════════════════════════════════╣
║  ✅ ALL tasks in tasks.md marked [x] completed               ║
║  ✅ ALL tests pass (0 failures required)                     ║
║  ✅ Test execution detected in output                        ║
╠══════════════════════════════════════════════════════════════╣
║  TDD Source: $(printf '%-42s' "$(get_tdd_source)")║
╚══════════════════════════════════════════════════════════════╝"
        else
            STOP_CRITERIA="
╔══════════════════════════════════════════════════════════════╗
║  🎯 SESSION STOP CONDITION                                   ║
╠══════════════════════════════════════════════════════════════╣
║  ✅ ALL tasks in tasks.md marked [x] completed               ║
║  ✅ Tests executed and passing                               ║
╚══════════════════════════════════════════════════════════════╝"
        fi
    else
        # Subagent stop criteria - simpler, just complete the task
        STOP_CRITERIA="
╔══════════════════════════════════════════════════════════════╗
║  🎯 SUBAGENT STOP CONDITION                                  ║
╠══════════════════════════════════════════════════════════════╣
║  ✅ Complete the assigned task                               ║
║  ↩️  Then return control to Main Orchestrator                ║
╚══════════════════════════════════════════════════════════════╝"
    fi

    # Build subagent info if any were spawned (NEW - v2.4)
    SUBAGENT_INFO=""
    if [ "$SUBAGENT_COUNT" -gt 0 ] && [ "$AGENT_TYPE" = "orchestrator" ]; then
        SUBAGENT_TYPES=$(echo "$SUBAGENT_ACTIVITY" | jq -r '.types | join(", ")' 2>/dev/null || echo "various")
        SUBAGENT_INFO="
📦 SUBAGENT ACTIVITY (this session):
  ├─ Spawned: $SUBAGENT_COUNT subagent(s)
  └─ Types: $SUBAGENT_TYPES"
    fi

    # Build full context message (v2.4)
    CONTEXT="$AGENT_HEADER
$STOP_CRITERIA

📊 CURRENT PROGRESS:
  $PROGRESS
  $TEST_STATUS
$SUBAGENT_INFO

$TEST_INSTRUCTIONS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REQUIRED ACTIONS (do these in order):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review remaining tasks in tasks.md
2. Implement next incomplete task
3. RUN TESTS via CLI (mandatory - see commands above)
4. Verify tests pass before marking task complete
5. Continue with /sw:do"

    # Add TDD workflow guidance if in TDD mode (v1.0.105)
    if [ "$TDD_MODE" = "true" ]; then
        TDD_GUIDANCE=$(echo "$SESSION" | jq -r '.tddGuidance // null' 2>/dev/null)
        if [ "$TDD_GUIDANCE" != "null" ] && [ -n "$TDD_GUIDANCE" ]; then
            CONTEXT="$CONTEXT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 TDD WORKFLOW (MANDATORY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$TDD_GUIDANCE

For each feature/task, follow this strict order:
  1. 🔴 [RED] Write a FAILING test first - test MUST fail
  2. 🟢 [GREEN] Write MINIMAL code to make test pass
  3. 🔵 [REFACTOR] Improve code quality, keep tests green

⚠️ NEVER skip the RED phase! Tests first, implementation second."
        fi
    fi

    CONTEXT="$CONTEXT

⚠️ This agent will NOT stop until the STOP CONDITION above is met!"
fi

# Log iteration with agent info (v2.4)
AGENT_SHORT=$(get_agent_type_short "$AGENT_TYPE")
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"iteration\",\"iteration\":$NEXT_ITERATION,\"increment\":\"$CURRENT_INCREMENT\",\"agentType\":\"$AGENT_SHORT\",\"subagentsSpawned\":$SUBAGENT_COUNT,\"testsRun\":$TESTS_RUN,\"testsPassed\":${TESTS_PASSED:-0},\"testsFailed\":${TESTS_FAILED:-0}}" >> "$LOGS_DIR/auto-iterations.log"

# Block exit and re-feed prompt
block "Work incomplete, continuing..." "$CONTEXT"
