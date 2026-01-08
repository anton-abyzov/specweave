#!/bin/bash
# setup-go.sh - Initialize Go Session (Ralph Wiggum Pattern for SpecWeave)
#
# Pure iteration loop following Ralph pattern:
# - Same prompt every iteration
# - Claude sees previous work (files, test output, git history)
# - Loop until completion promise found OR max iterations reached
#
# Usage: setup-go.sh "PROMPT" [OPTIONS]

set -e

# ============================================================================
# Argument Parsing
# ============================================================================

PROMPT=""
MAX_ITERATIONS=100
COMPLETION_PROMISE=""
BUILD_REQUIRED=false
TESTS_REQUIRED=false
E2E_REQUIRED=false
LINT_REQUIRED=false
TYPES_REQUIRED=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --completion-promise)
            COMPLETION_PROMISE="$2"
            shift 2
            ;;
        --build)
            BUILD_REQUIRED=true
            shift
            ;;
        --tests)
            TESTS_REQUIRED=true
            shift
            ;;
        --e2e)
            E2E_REQUIRED=true
            shift
            ;;
        --lint)
            LINT_REQUIRED=true
            shift
            ;;
        --types)
            TYPES_REQUIRED=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            cat << 'EOF'
Usage: setup-go.sh "PROMPT" [OPTIONS]

Options:
  --max-iterations N              Stop after N iterations (default: 100)
  --completion-promise "TEXT"     Exact phrase that signals completion
  --build                         Build must pass before completion
  --tests                         Tests must pass before completion
  --e2e                           E2E tests must pass before completion
  --lint                          Linting must pass before completion
  --types                         Type-checking must pass before completion
  --dry-run                       Preview without starting

Examples:
  setup-go.sh "Fix all TypeScript errors" --max-iterations 20

  setup-go.sh "Build REST API for todos. Output DONE when complete." \
    --completion-promise "DONE" --tests --max-iterations 50

  setup-go.sh "Implement auth with JWT" --build --tests --types
EOF
            exit 0
            ;;
        -*)
            echo "Error: Unknown option: $1" >&2
            echo "Run with --help for usage" >&2
            exit 1
            ;;
        *)
            # First non-option argument is the prompt
            if [ -z "$PROMPT" ]; then
                PROMPT="$1"
            else
                # Additional arguments are appended to prompt
                PROMPT="$PROMPT $1"
            fi
            shift
            ;;
    esac
done

# Validate prompt
if [ -z "$PROMPT" ]; then
    echo "Error: PROMPT is required" >&2
    echo "Usage: setup-go.sh \"PROMPT\" [OPTIONS]" >&2
    echo "Run with --help for more information" >&2
    exit 1
fi

# Validate max-iterations
if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
    echo "Error: --max-iterations must be a number" >&2
    exit 1
fi

if [ "$MAX_ITERATIONS" -lt 1 ]; then
    echo "Error: --max-iterations must be >= 1" >&2
    exit 1
fi

# ============================================================================
# Project Detection
# ============================================================================

PROJECT_ROOT="$(pwd)"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"

# Check if SpecWeave initialized
if [ ! -d "$PROJECT_ROOT/.specweave" ]; then
    echo "Error: No SpecWeave project found in current directory" >&2
    echo "Run 'specweave init' to initialize a project" >&2
    exit 1
fi

# Create directories
mkdir -p "$STATE_DIR"
mkdir -p "$LOGS_DIR"

# ============================================================================
# Session State Creation
# ============================================================================

SESSION_ID="go-$(date +%Y-%m-%d-%H%M%S)-$(openssl rand -hex 3 2>/dev/null || echo "$$")"
SESSION_FILE="$STATE_DIR/go-session.json"
LOG_FILE="$LOGS_DIR/go-iterations.log"

# Check for existing session
if [ -f "$SESSION_FILE" ]; then
    EXISTING_ID=$(jq -r '.sessionId' "$SESSION_FILE" 2>/dev/null)
    if [ -n "$EXISTING_ID" ] && [ "$EXISTING_ID" != "null" ]; then
        echo "⚠️  Existing go session found: $EXISTING_ID" >&2
        echo "   Run /sw:cancel-go to clean up, or continue this session" >&2

        if [ "$DRY_RUN" = false ]; then
            echo "" >&2
            echo "Continuing existing session..." >&2
            SESSION_ID="$EXISTING_ID"
        fi
    fi
fi

# Create session state
cat > "$SESSION_FILE" << EOF
{
  "sessionId": "$SESSION_ID",
  "prompt": $(echo "$PROMPT" | jq -R -s .),
  "maxIterations": $MAX_ITERATIONS,
  "completionPromise": $(echo "$COMPLETION_PROMISE" | jq -R -s .),
  "iteration": 0,
  "conditions": {
    "build": $BUILD_REQUIRED,
    "tests": $TESTS_REQUIRED,
    "e2e": $E2E_REQUIRED,
    "lint": $LINT_REQUIRED,
    "types": $TYPES_REQUIRED
  },
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "running"
}
EOF

# ============================================================================
# Dry Run Preview
# ============================================================================

if [ "$DRY_RUN" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  DRY RUN - Go Session Preview"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Session ID: $SESSION_ID"
    echo "Max Iterations: $MAX_ITERATIONS"
    echo ""
    echo "Prompt:"
    echo "  $PROMPT"
    echo ""

    if [ -n "$COMPLETION_PROMISE" ]; then
        echo "Completion Promise: \"$COMPLETION_PROMISE\""
    else
        echo "Completion Promise: (none - will iterate until max)"
    fi
    echo ""

    echo "Quality Gates:"
    [ "$BUILD_REQUIRED" = true ] && echo "  ✓ Build must pass"
    [ "$TESTS_REQUIRED" = true ] && echo "  ✓ Tests must pass"
    [ "$E2E_REQUIRED" = true ] && echo "  ✓ E2E tests must pass"
    [ "$LINT_REQUIRED" = true ] && echo "  ✓ Linting must pass"
    [ "$TYPES_REQUIRED" = true ] && echo "  ✓ Type-checking must pass"

    if [ "$BUILD_REQUIRED" = false ] && [ "$TESTS_REQUIRED" = false ] && \
       [ "$E2E_REQUIRED" = false ] && [ "$LINT_REQUIRED" = false ] && \
       [ "$TYPES_REQUIRED" = false ]; then
        echo "  (none)"
    fi
    echo ""

    echo "Session will stop when:"
    if [ -n "$COMPLETION_PROMISE" ]; then
        echo "  • Output contains <promise>$COMPLETION_PROMISE</promise>"
    fi
    [ "$BUILD_REQUIRED" = true ] || [ "$TESTS_REQUIRED" = true ] || \
    [ "$E2E_REQUIRED" = true ] || [ "$LINT_REQUIRED" = true ] || \
    [ "$TYPES_REQUIRED" = true ] && echo "  • All quality gates pass"
    echo "  • Max iterations ($MAX_ITERATIONS) reached"
    echo "  • User runs /sw:cancel-go"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Remove --dry-run to start the session"
    exit 0
fi

# ============================================================================
# Session Start Output
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Go Session Started (Ralph Wiggum Pattern)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Session ID: $SESSION_ID"
echo "Max Iterations: $MAX_ITERATIONS"
echo ""

# Show completion criteria
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚙️  COMPLETION CRITERIA"
echo "     Loop will continue until ONE of these conditions:"
echo ""

if [ -n "$COMPLETION_PROMISE" ]; then
    echo "   • 🎯 Completion promise found: <promise>$COMPLETION_PROMISE</promise>"
fi

if [ "$BUILD_REQUIRED" = true ] || [ "$TESTS_REQUIRED" = true ] || \
   [ "$E2E_REQUIRED" = true ] || [ "$LINT_REQUIRED" = true ] || \
   [ "$TYPES_REQUIRED" = true ]; then
    echo "   • ✅ All quality gates pass:"
    [ "$BUILD_REQUIRED" = true ] && echo "      - Build (auto-heal enabled, max 3 retries)"
    [ "$TESTS_REQUIRED" = true ] && echo "      - Tests (unit + integration)"
    [ "$E2E_REQUIRED" = true ] && echo "      - E2E tests"
    [ "$LINT_REQUIRED" = true ] && echo "      - Linting (auto-heal enabled, max 3 retries)"
    [ "$TYPES_REQUIRED" = true ] && echo "      - Type-checking (auto-heal enabled, max 3 retries)"
fi

echo "   • 🛑 Max iterations ($MAX_ITERATIONS) reached"
echo "   • ⏹️  User runs /sw:cancel-go"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Your Task:"
echo "  $PROMPT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The stop hook will keep you working until completion."
echo "Run /sw:go-status to check progress"
echo "Run /sw:cancel-go to stop"
echo ""

# Log session start
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"event\":\"session_start\",\"sessionId\":\"$SESSION_ID\",\"maxIterations\":$MAX_ITERATIONS}" >> "$LOG_FILE"

# Success - session created
exit 0
