#!/bin/bash
# github-sync-handler.sh - Sync increment to GitHub (create/update issues for User Stories)
# Called async by processor, non-blocking, error-tolerant
#
# Argument formats supported:
# 1. (event_type, increment_id) - from lifecycle/spec.updated events
# 2. (event_type, INC_ID:US_ID) - from user-story.completed/reopened events (v1.0.45+)
# 3. (increment_id) - from metadata.changed events (legacy)
#
# CRITICAL FIX (v1.0.45): Added user-story.completed/reopened support
# Root cause: GitHub issues were created but NEVER UPDATED when User Stories completed!
#
# IMPORTANT: Never crash Claude, always exit 0
set +e

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# Parse arguments - support multiple formats
EVENT_TYPE="${1:-}"
EVENT_DATA="${2:-}"
INC_ID=""
US_ID=""

if [[ "$EVENT_TYPE" == user-story.* ]]; then
  # user-story.completed/reopened: $2 = INC_ID:US_ID
  INC_ID="${EVENT_DATA%%:*}"
  US_ID="${EVENT_DATA##*:}"
elif [[ "$EVENT_TYPE" == increment.* ]] || [[ "$EVENT_TYPE" == spec.* ]] || [[ "$EVENT_TYPE" == metadata.* ]]; then
  # Lifecycle events: $2 = increment_id
  INC_ID="$EVENT_DATA"
else
  # Legacy format: $1 = increment_id directly
  INC_ID="$EVENT_TYPE"
fi

[[ -z "$INC_ID" ]] && exit 0

# Find project root
PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
[[ ! -f "$CONFIG_FILE" ]] && exit 0

# Initialize throttle log early (used throughout the script for diagnostics)
THROTTLE_LOG="$PROJECT_ROOT/.specweave/logs/throttle.log"
mkdir -p "$(dirname "$THROTTLE_LOG")" 2>/dev/null

# Check if GitHub sync is enabled
# FIXED (v1.0.46): Support BOTH config formats:
#
# FORMAT 1 - PROFILES (current, multi-project):
#   sync.profiles["sw-content-repurposer-api"]: { provider: "github", config: {...} }
#   + sync.settings.canUpdateExternalItems: true
#
# FORMAT 2 - LEGACY (direct github section):
#   sync.github: { enabled: true, owner, repo }
#
# FORMAT 3 - LEGACY (provider field):
#   sync: { enabled: true, provider: "github" }
#
# NOTE: The actual permission gates (canUpdateExternalItems, etc.) are checked
# downstream by GitHubFeatureSync, which respects the full permission model.
GITHUB_ENABLED=""

# Method 1: Check for PROFILES format (sync.profiles with provider: "github")
# This is the current recommended format for multi-project setups
if grep -q '"profiles"[[:space:]]*:' "$CONFIG_FILE" 2>/dev/null; then
  # Check if ANY profile has provider: "github"
  if grep -q '"provider"[[:space:]]*:[[:space:]]*"github"' "$CONFIG_FILE" 2>/dev/null; then
    # Also check if canUpdateExternalItems is true (required for GitHub sync)
    if grep -q '"canUpdateExternalItems"[[:space:]]*:[[:space:]]*true' "$CONFIG_FILE" 2>/dev/null; then
      GITHUB_ENABLED="true"
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] WARNING: GitHub profile found but canUpdateExternalItems=false" >> "$THROTTLE_LOG" 2>/dev/null
    fi
  fi
fi

# Method 2: Check for explicit sync.github.enabled (legacy direct style)
if [[ -z "$GITHUB_ENABLED" ]]; then
  if grep -q '"github"[[:space:]]*:' "$CONFIG_FILE" 2>/dev/null; then
    if grep -A5 '"github"[[:space:]]*:' "$CONFIG_FILE" 2>/dev/null | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
      GITHUB_ENABLED="true"
    fi
  fi
fi

# Method 3: Check for provider: github with sync.enabled (legacy style)
if [[ -z "$GITHUB_ENABLED" ]]; then
  # Only check this if there are NO profiles (pure legacy config)
  if ! grep -q '"profiles"[[:space:]]*:' "$CONFIG_FILE" 2>/dev/null; then
    if grep -q '"provider"[[:space:]]*:[[:space:]]*"github"' "$CONFIG_FILE" 2>/dev/null; then
      if grep -q '"sync"' "$CONFIG_FILE" && grep -A2 '"sync"' "$CONFIG_FILE" | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
        GITHUB_ENABLED="true"
      fi
    fi
  fi
fi

if [[ -z "$GITHUB_ENABLED" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] SKIPPED: No GitHub config found or canUpdateExternalItems=false" >> "$THROTTLE_LOG" 2>/dev/null
  exit 0
fi

# Throttle configuration:
# - Full sync (increment lifecycle): 5 minutes (creates all issues)
# - US completion sync: 60 seconds (more targeted, less aggressive)
# Note: THROTTLE_LOG already initialized above (line 49)

if [[ -n "$US_ID" ]]; then
  # Per-US throttle (60 seconds) - more frequent for targeted updates
  THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.github-sync-$INC_ID-$US_ID"
  THROTTLE_WINDOW=60
  SYNC_TYPE="US:$US_ID"
else
  # Per-increment throttle (5 minutes) - less frequent for full sync
  THROTTLE_FILE="$PROJECT_ROOT/.specweave/state/.github-sync-$INC_ID"
  THROTTLE_WINDOW=300
  SYNC_TYPE="increment"
fi

if [[ -f "$THROTTLE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f %m "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c %Y "$THROTTLE_FILE" 2>/dev/null || echo 0)))
  fi
  if [[ $AGE -lt $THROTTLE_WINDOW ]]; then
    REMAINING=$((THROTTLE_WINDOW - AGE))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] THROTTLED $INC_ID ($SYNC_TYPE, wait ${REMAINING}s)" >> "$THROTTLE_LOG" 2>/dev/null
    exit 0
  fi
fi
touch "$THROTTLE_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] EXECUTING $INC_ID ($SYNC_TYPE) event=$EVENT_TYPE" >> "$THROTTLE_LOG" 2>/dev/null

# Cross-platform timeout wrapper
run_with_timeout() {
  local timeout_secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_secs" "$@" 2>/dev/null || true
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$timeout_secs" "$@" 2>/dev/null || true
  else
    "$@" 2>/dev/null || true
  fi
}

# Load GitHub token - fallback chain mirrors auth-helpers.ts:
# 1. .env GITHUB_TOKEN (explicit config)
# 2. .env GH_TOKEN (alternative name)
# 3. gh auth token (gh CLI - most common for local dev!)
# FIXED (v1.0.57): Added GH_TOKEN and gh auth fallback - critical for local development!
GITHUB_TOKEN=""

# Try .env GITHUB_TOKEN first
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  GITHUB_TOKEN=$(grep -E "^GITHUB_TOKEN=" "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"'"'")
  # Try GH_TOKEN as alternative
  [[ -z "$GITHUB_TOKEN" ]] && GITHUB_TOKEN=$(grep -E "^GH_TOKEN=" "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"'"'")
fi

# Fallback to gh CLI (most common for local development!)
if [[ -z "$GITHUB_TOKEN" ]] && command -v gh >/dev/null 2>&1; then
  GITHUB_TOKEN=$(gh auth token 2>/dev/null || true)
  if [[ -n "$GITHUB_TOKEN" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Using token from gh auth (not .env)" >> "$THROTTLE_LOG" 2>/dev/null
  fi
fi

if [[ -z "$GITHUB_TOKEN" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] ERROR: No GitHub token found" >> "$THROTTLE_LOG" 2>/dev/null
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync]   Checked: $PROJECT_ROOT/.env (GITHUB_TOKEN, GH_TOKEN)" >> "$THROTTLE_LOG" 2>/dev/null
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync]   Checked: gh auth token (gh CLI not authenticated?)" >> "$THROTTLE_LOG" 2>/dev/null
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync]   Fix: Run 'gh auth login' OR add GITHUB_TOKEN to .env" >> "$THROTTLE_LOG" 2>/dev/null
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Token found (length: ${#GITHUB_TOKEN})" >> "$THROTTLE_LOG" 2>/dev/null

# Find sync script
# FIXED (v1.0.46): Support compiled JS AND TypeScript with tsx
# Priority order:
# 1. Local development dist/ (compiled JS)
# 2. Local plugins/ source (TypeScript via tsx)
# 3. Marketplace cache (compiled JS)
# 4. Marketplace source (TypeScript via tsx)
# 5. Legacy CLAUDE_PLUGIN_ROOT
#
# Note: Marketplace installations often have .ts source only, not compiled .js
# We detect this and use tsx (fast TypeScript runner) when available

SYNC_SCRIPT=""
NEEDS_TSX=false

# Paths to check - JS files first, then TS files
JS_PATHS=(
  "$PROJECT_ROOT/dist/plugins/specweave-github/lib/github-feature-sync-cli.js"
  "$HOME/.claude/plugins/cache/specweave/sw-github/*/lib/github-feature-sync-cli.js"
  "${CLAUDE_PLUGIN_ROOT:-}/lib/github-feature-sync-cli.js"
)

TS_PATHS=(
  "$PROJECT_ROOT/plugins/specweave-github/lib/github-feature-sync-cli.ts"
  "$HOME/.claude/plugins/marketplaces/specweave/plugins/specweave-github/lib/github-feature-sync-cli.ts"
  "$HOME/.claude/plugins/cache/specweave/sw-github/*/lib/github-feature-sync-cli.ts"
)

# Try JS files first (no tsx needed)
for pattern in "${JS_PATHS[@]}"; do
  # Handle glob patterns
  for path in $pattern; do
    if [[ -f "$path" ]]; then
      SYNC_SCRIPT="$path"
      break 2
    fi
  done
done

# If no JS found, try TS files (need tsx)
if [[ -z "$SYNC_SCRIPT" ]]; then
  for pattern in "${TS_PATHS[@]}"; do
    for path in $pattern; do
      if [[ -f "$path" ]]; then
        SYNC_SCRIPT="$path"
        NEEDS_TSX=true
        break 2
      fi
    done
  done
fi

if [[ -z "$SYNC_SCRIPT" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] ERROR: github-feature-sync-cli not found" >> "$THROTTLE_LOG" 2>/dev/null
  echo "   Searched JS paths:" >> "$THROTTLE_LOG" 2>/dev/null
  for p in "${JS_PATHS[@]}"; do echo "   - $p" >> "$THROTTLE_LOG" 2>/dev/null; done
  echo "   Searched TS paths:" >> "$THROTTLE_LOG" 2>/dev/null
  for p in "${TS_PATHS[@]}"; do echo "   - $p" >> "$THROTTLE_LOG" 2>/dev/null; done
  exit 0
fi

# Verify tsx is available if needed
if [[ "$NEEDS_TSX" == "true" ]]; then
  if ! command -v tsx >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] ERROR: Found TS file but tsx/npx not available" >> "$THROTTLE_LOG" 2>/dev/null
    echo "   Install tsx: npm install -g tsx" >> "$THROTTLE_LOG" 2>/dev/null
    exit 0
  fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Found sync script: $SYNC_SCRIPT (tsx=$NEEDS_TSX)" >> "$THROTTLE_LOG" 2>/dev/null

# Extract feature ID - check multiple locations in priority order
# FIXED (v1.0.58): Per ADR-0140, feature_id was REMOVED from metadata.json in v0.29.0
# Feature ID is now DERIVED from increment ID: 0149-... → FS-149
#
# Priority order (v1.0.58):
# 1. DERIVE from increment ID (PRIMARY - per ADR-0140)
# 2. metadata.json: epic_id field (for external/brownfield increments)
# 3. spec.md YAML frontmatter: feature_id: or epic: (explicit override)
#
META_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
SPEC_FILE="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
FEATURE_ID=""

# Method 0 (v1.0.58): DERIVE from increment ID (PRIMARY method per ADR-0140)
# Extract leading digits and optional E suffix, format as FS-XXX
# Examples: 0149-usage-analytics → FS-149, 0111E-external → FS-111E
INC_NUMBER=$(echo "$INC_ID" | grep -oE '^[0-9]+')
INC_EXTERNAL=$(echo "$INC_ID" | grep -oE '^[0-9]+E' | grep -o 'E$' || echo "")
if [[ -n "$INC_NUMBER" ]]; then
  # Remove leading zeros for numeric value, then pad to 3 digits
  INC_NUM_CLEAN=$((10#$INC_NUMBER))  # Force decimal interpretation
  FEATURE_ID=$(printf "FS-%03d%s" "$INC_NUM_CLEAN" "$INC_EXTERNAL")
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Derived feature_id=$FEATURE_ID from increment $INC_ID" >> "$THROTTLE_LOG" 2>/dev/null
fi

# Method 1: Check metadata.json for epic_id (external/brownfield increments only)
if [[ -z "$FEATURE_ID" ]] && [[ -f "$META_FILE" ]]; then
  FEATURE_ID=$(grep -o '"epic_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$META_FILE" | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/')
  [[ "$FEATURE_ID" == "null" ]] && FEATURE_ID=""
fi

# Method 2: Check spec.md YAML frontmatter (explicit override)
if [[ -z "$FEATURE_ID" ]] && [[ -f "$SPEC_FILE" ]]; then
  # Try start-of-line format: feature_id: FS-001 or epic: FS-001
  FEATURE_ID=$(grep -E "^(epic|feature_id|feature):" "$SPEC_FILE" | head -1 | sed 's/.*:[[:space:]]*//' | tr -d '"'"'" | tr -d ' ')
  # Also try indented YAML frontmatter style
  if [[ -z "$FEATURE_ID" ]]; then
    FEATURE_ID=$(grep -E "^[[:space:]]*(epic|feature_id|feature):" "$SPEC_FILE" | head -1 | sed 's/.*:[[:space:]]*//' | tr -d '"'"'" | tr -d ' ')
  fi
fi

if [[ -z "$FEATURE_ID" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] WARNING: No feature ID found" >> "$THROTTLE_LOG" 2>/dev/null
  echo "   Increment ID: $INC_ID" >> "$THROTTLE_LOG" 2>/dev/null
  echo "   This should not happen - derivation from increment ID should always work" >> "$THROTTLE_LOG" 2>/dev/null
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Found feature_id=$FEATURE_ID" >> "$THROTTLE_LOG" 2>/dev/null

# Run sync (timeout 60s)
# The github-feature-sync-cli script will:
# 1. Find all User Stories in the feature
# 2. For each US, call updateUserStoryIssue() which:
#    - Updates issue body with latest content
#    - Calculates completion via CompletionCalculator (verifies [x] checkboxes)
#    - CLOSES the issue if ALL ACs and tasks are verified complete
#    - Updates status labels (status:complete, status:active, status:not_started)
cd "$PROJECT_ROOT" || exit 0

# Build the run command based on file type
if [[ "$NEEDS_TSX" == "true" ]]; then
  # TypeScript file - use tsx or npx tsx
  if command -v tsx >/dev/null 2>&1; then
    RUN_CMD="tsx"
  else
    RUN_CMD="npx tsx"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Running: $RUN_CMD $SYNC_SCRIPT $FEATURE_ID" >> "$THROTTLE_LOG" 2>/dev/null
  GITHUB_TOKEN="$GITHUB_TOKEN" run_with_timeout 60 $RUN_CMD "$SYNC_SCRIPT" "$FEATURE_ID" >> "$THROTTLE_LOG" 2>&1
else
  # JavaScript file - use node directly
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] Running: node $SYNC_SCRIPT $FEATURE_ID" >> "$THROTTLE_LOG" 2>/dev/null
  GITHUB_TOKEN="$GITHUB_TOKEN" run_with_timeout 60 node "$SYNC_SCRIPT" "$FEATURE_ID" >> "$THROTTLE_LOG" 2>&1
fi

SYNC_EXIT=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-sync] COMPLETED $INC_ID ($SYNC_TYPE) exit=$SYNC_EXIT" >> "$THROTTLE_LOG" 2>/dev/null
exit 0
