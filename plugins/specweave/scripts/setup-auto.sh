#!/bin/bash
# setup-auto.sh - Initialize Auto Session
#
# Usage: setup-auto.sh [OPTIONS] [INCREMENT_IDS...]
#
# Options:
#   --max-iterations N   Maximum iterations (default: 100)
#   --max-hours N        Maximum hours to run (default: none)
#   --simple             Simple/Ralph mode (minimal context)
#   --dry-run            Show what would happen without creating session
#   --increments A,B,C   Explicit increment queue
#   --all-backlog        Process all backlog items
#   --skip-gates G1,G2   Pre-approve specific gates
#   --no-increment       Skip auto-creation of increments (work on existing only)
#   --no-inc             Alias for --no-increment (short form)
#   --prompt "text"      Analyze prompt and create increments (intelligent chunking)
#   --yes                Auto-approve increment plan (skip user approval)
#   -h, --help           Show this help

set -e

# Defaults
MAX_ITERATIONS=100
MAX_HOURS=""
SIMPLE_MODE=false
DRY_RUN=false
INCREMENT_IDS=()
ALL_BACKLOG=false
SKIP_GATES=""
NO_INCREMENT=false
PROMPT=""
AUTO_APPROVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --max-hours)
            MAX_HOURS="$2"
            shift 2
            ;;
        --simple)
            SIMPLE_MODE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --increments)
            IFS=',' read -ra INCREMENT_IDS <<< "$2"
            shift 2
            ;;
        --all-backlog)
            ALL_BACKLOG=true
            shift
            ;;
        --skip-gates)
            SKIP_GATES="$2"
            shift 2
            ;;
        --no-increment|--no-inc)
            NO_INCREMENT=true
            shift
            ;;
        --prompt)
            PROMPT="$2"
            shift 2
            ;;
        --yes|-y)
            AUTO_APPROVE=true
            shift
            ;;
        -h|--help)
            grep '^#' "$0" | grep -v '!/bin/bash' | sed 's/^# //'
            exit 0
            ;;
        *)
            # Assume it's an increment ID
            INCREMENT_IDS+=("$1")
            shift
            ;;
    esac
done

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
SESSION_FILE="$STATE_DIR/auto-session.json"
LOCK_FILE="$STATE_DIR/active-session.lock"
INCREMENTS_DIR="$PROJECT_ROOT/.specweave/increments"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

# Ensure directories exist
mkdir -p "$STATE_DIR" "$LOGS_DIR"

# Check for existing active session
if [ -f "$SESSION_FILE" ]; then
    EXISTING_STATUS=$(jq -r '.status' "$SESSION_FILE" 2>/dev/null || echo "unknown")
    if [ "$EXISTING_STATUS" = "running" ]; then
        EXISTING_ID=$(jq -r '.sessionId' "$SESSION_FILE")
        echo "❌ Auto session already active: $EXISTING_ID"
        echo ""
        echo "Options:"
        echo "  1. Cancel it: /sw:cancel-auto"
        echo "  2. Check status: /sw:auto-status"
        echo "  3. Let it continue (close this tab)"
        exit 1
    fi
fi

# Handle --prompt (intelligent chunking)
if [ -n "$PROMPT" ]; then
    echo "🧠 Analyzing prompt for intelligent chunking..."
    echo ""

    # Find the chunk-prompt.js script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CHUNK_SCRIPT="$SCRIPT_DIR/chunk-prompt.js"

    if [ ! -f "$CHUNK_SCRIPT" ]; then
        echo "❌ chunk-prompt.js not found at $CHUNK_SCRIPT"
        exit 1
    fi

    # Run the chunking analysis
    CHUNK_ARGS=("$PROMPT")
    if [ "$AUTO_APPROVE" = "true" ]; then
        CHUNK_ARGS+=("--yes")
    fi
    CHUNK_ARGS+=("--project-path" "$PROJECT_ROOT")

    if ! node "$CHUNK_SCRIPT" "${CHUNK_ARGS[@]}"; then
        echo "❌ Prompt chunking failed"
        exit 1
    fi

    # Read generated increment IDs
    CHUNKED_IDS_FILE="$STATE_DIR/chunked-increments.txt"
    if [ -f "$CHUNKED_IDS_FILE" ]; then
        echo ""
        echo "📋 Plan saved. The increments will be created during execution."
        echo ""

        # If auto-approve, signal that increments need to be created
        if [ "$AUTO_APPROVE" = "true" ]; then
            echo '{"needsIncrementCreation": true, "fromChunking": true, "autoApproved": true, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$STATE_DIR/auto-needs-increment.json"
            echo "✅ Plan auto-approved. Ready to create increments."
        else
            echo '{"needsIncrementCreation": true, "fromChunking": true, "autoApproved": false, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$STATE_DIR/auto-needs-increment.json"
            echo ""
            echo "💡 To proceed:"
            echo "   1. Review the plan above"
            echo "   2. Run /sw:auto again to start execution"
            echo "   3. Or use --yes to auto-approve"
        fi

        # Exit with code 2 to signal LLM should create increments
        exit 2
    else
        echo "❌ No increments generated from prompt"
        exit 1
    fi
fi

# Build increment queue
if [ "$ALL_BACKLOG" = "true" ]; then
    # Find all backlog increments, sorted by priority
    INCREMENT_IDS=()
    for dir in "$INCREMENTS_DIR"/[0-9][0-9][0-9][0-9]-*/; do
        if [ -d "$dir" ]; then
            SPEC_FILE="$dir/spec.md"
            if [ -f "$SPEC_FILE" ]; then
                STATUS=$(grep -m1 "^status:" "$SPEC_FILE" 2>/dev/null | sed 's/status: *//' || echo "")
                if [ "$STATUS" = "backlog" ] || [ "$STATUS" = "planned" ]; then
                    INCREMENT_ID=$(basename "$dir")
                    INCREMENT_IDS+=("$INCREMENT_ID")
                fi
            fi
        fi
    done

    if [ ${#INCREMENT_IDS[@]} -eq 0 ]; then
        echo "⚠️ No backlog or planned increments found"
        exit 0
    fi
fi

# If no increments specified, find current in-progress increment
if [ ${#INCREMENT_IDS[@]} -eq 0 ]; then
    for dir in "$INCREMENTS_DIR"/[0-9][0-9][0-9][0-9]-*/; do
        if [ -d "$dir" ]; then
            META_FILE="$dir/metadata.json"
            if [ -f "$META_FILE" ]; then
                STATUS=$(jq -r '.status' "$META_FILE" 2>/dev/null || echo "")
                if [ "$STATUS" = "active" ] || [ "$STATUS" = "in-progress" ]; then
                    INCREMENT_ID=$(basename "$dir")
                    INCREMENT_IDS+=("$INCREMENT_ID")
                    break
                fi
            fi
        fi
    done
fi

if [ ${#INCREMENT_IDS[@]} -eq 0 ]; then
    if [ "$NO_INCREMENT" = "true" ]; then
        echo "❌ No increments specified and no active increment found"
        echo ""
        echo "Usage: setup-auto.sh [INCREMENT_IDS...]"
        echo "       setup-auto.sh --all-backlog"
        exit 1
    else
        # Signal to Claude that increment creation is needed
        echo "🤔 No increments found. Auto mode will analyze context and create increments as needed."
        echo ""
        echo "💡 The LLM will:"
        echo "   1. Analyze user prompt and project context"
        echo "   2. Match existing increments OR create new ones"
        echo "   3. Start autonomous execution"
        echo ""
        echo "To skip auto-creation and require existing increments: use --no-increment"
        echo ""
        # Create a marker file to signal increment creation needed
        echo '{"needsIncrementCreation": true, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$STATE_DIR/auto-needs-increment.json"
        # Exit with special code to signal LLM should create increment
        exit 2
    fi
fi

# Validate increments exist
for INC_ID in "${INCREMENT_IDS[@]}"; do
    INC_DIR="$INCREMENTS_DIR/$INC_ID"
    if [ ! -d "$INC_DIR" ]; then
        # Try to find by prefix
        FOUND=$(find "$INCREMENTS_DIR" -maxdepth 1 -type d -name "${INC_ID}*" | head -1)
        if [ -z "$FOUND" ]; then
            echo "❌ Increment not found: $INC_ID"
            exit 1
        fi
    fi
done

# Generate session ID
SESSION_ID="auto-$(date +%Y-%m-%d)-$(head -c 4 /dev/urandom | xxd -p)"

# Dry run output
if [ "$DRY_RUN" = "true" ]; then
    echo "🔍 Dry Run - Session Preview"
    echo ""
    echo "Session ID: $SESSION_ID"
    echo "Max Iterations: $MAX_ITERATIONS"
    [ -n "$MAX_HOURS" ] && echo "Max Hours: $MAX_HOURS"
    echo "Simple Mode: $SIMPLE_MODE"
    echo ""
    echo "Increment Queue:"
    for INC_ID in "${INCREMENT_IDS[@]}"; do
        echo "  • $INC_ID"
    done
    echo ""
    echo "Run without --dry-run to create session."
    exit 0
fi

# Build session JSON
SESSION_JSON=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "status": "running",
  "startTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "iteration": 0,
  "maxIterations": $MAX_ITERATIONS,
  $([ -n "$MAX_HOURS" ] && echo "\"maxHours\": $MAX_HOURS,")
  "incrementQueue": $(printf '%s\n' "${INCREMENT_IDS[@]}" | jq -R . | jq -s .),
  "currentIncrement": "${INCREMENT_IDS[0]}",
  "completedIncrements": [],
  "failedIncrements": [],
  "humanGates": {
    "pending": null,
    "approved": [],
    "blocked": []
  },
  "circuitBreakers": {
    "github": { "state": "closed", "failures": 0 },
    "jira": { "state": "closed", "failures": 0 },
    "ado": { "state": "closed", "failures": 0 }
  },
  "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "simple": $SIMPLE_MODE
}
EOF
)

# Handle skip-gates
if [ -n "$SKIP_GATES" ]; then
    IFS=',' read -ra GATES <<< "$SKIP_GATES"
    GATES_JSON=$(printf '%s\n' "${GATES[@]}" | jq -R . | jq -s .)
    SESSION_JSON=$(echo "$SESSION_JSON" | jq --argjson gates "$GATES_JSON" '.humanGates.approved = $gates')
fi

# Create session lock
echo "{\"sessionId\": \"$SESSION_ID\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"pid\": $$}" > "$LOCK_FILE"

# Save session
echo "$SESSION_JSON" | jq . > "$SESSION_FILE"

# Log session start
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"session_start\",\"sessionId\":\"$SESSION_ID\",\"increments\":${#INCREMENT_IDS[@]}}" >> "$LOGS_DIR/auto-sessions.log"

# Output
echo "🚀 Auto Session Started"
echo ""
echo "Session ID: $SESSION_ID"
echo "Max Iterations: $MAX_ITERATIONS"
[ -n "$MAX_HOURS" ] && echo "Max Hours: $MAX_HOURS"
echo "Simple Mode: $SIMPLE_MODE"
echo ""
echo "Increment Queue (${#INCREMENT_IDS[@]}):"
for INC_ID in "${INCREMENT_IDS[@]}"; do
    echo "  • $INC_ID"
done
echo ""
echo "Current: ${INCREMENT_IDS[0]}"
echo ""
echo "The session will continue until:"
echo "  • All tasks complete"
echo "  • Max iterations ($MAX_ITERATIONS) reached"
[ -n "$MAX_HOURS" ] && echo "  • Max hours ($MAX_HOURS) exceeded"
echo "  • You run /sw:cancel-auto"
echo "  • A human gate requires approval"
echo ""
echo "💡 Tip: Close this tab anytime to pause. Resume with /sw:do"
