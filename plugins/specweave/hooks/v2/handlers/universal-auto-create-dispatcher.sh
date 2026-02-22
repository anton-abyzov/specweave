#!/bin/bash
# Universal Auto-Create Dispatcher (v1.0.256+)
#
# Creates per-user-story items in ALL enabled providers when spec.md is written.
# - GitHub: delegates to existing github-auto-create-handler.sh (backward compatible)
# - JIRA/ADO: calls src/core/universal-auto-create.ts via Node.js
#
# Usage: universal-auto-create-dispatcher.sh <INCREMENT_ID>
# Called by: safe_run_background in post-tool-use.sh

set +e  # Never crash Claude Code

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# ============================================================================
# PROJECT ROOT
# ============================================================================

find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    [ -d "$dir/.specweave" ] && echo "$dir" && return 0
    dir="$(dirname "$dir")"
  done
  return 1
}

PROJECT_ROOT="$(find_project_root "$(pwd)")"
[[ -z "$PROJECT_ROOT" ]] && exit 0
cd "$PROJECT_ROOT" 2>/dev/null || exit 0

# ============================================================================
# ARGUMENTS
# ============================================================================

INC_ID="$1"
[[ -z "$INC_ID" ]] && exit 0
[[ ! "$INC_ID" =~ ^[0-9]{4}[A-Za-z0-9_-]*$ ]] && exit 0

SPEC_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
METADATA_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
CONFIG_PATH="$PROJECT_ROOT/.specweave/config.json"

[[ ! -f "$SPEC_PATH" ]] && exit 0
[[ ! -f "$CONFIG_PATH" ]] && exit 0

# ============================================================================
# LOGGING
# ============================================================================

LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/universal-auto-create.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [auto-create] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Template guard: skip if spec.md still contains placeholder markers
grep -q '\[Story Title\]' "$SPEC_PATH" && { log "Skipping: spec.md still contains [Story Title] template markers"; exit 0; }

# ============================================================================
# DEBOUNCE (30s window — spec.md gets edited rapidly during planning)
# ============================================================================

STATE_DIR="$PROJECT_ROOT/.specweave/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true
DEBOUNCE_FILE="$STATE_DIR/.auto-create-pending-$INC_ID"

if [[ -f "$DEBOUNCE_FILE" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    AGE=$(($(date +%s) - $(stat -f%m "$DEBOUNCE_FILE" 2>/dev/null || echo 0)))
  else
    AGE=$(($(date +%s) - $(stat -c%Y "$DEBOUNCE_FILE" 2>/dev/null || echo 0)))
  fi
  [[ $AGE -lt 30 ]] && exit 0
fi

echo "$(date +%s)" > "$DEBOUNCE_FILE" 2>/dev/null || true
sleep 30

# After sleeping, check if a newer invocation took over
if [[ -f "$DEBOUNCE_FILE" ]]; then
  CURRENT_SIGNAL=$(cat "$DEBOUNCE_FILE" 2>/dev/null || echo 0)
  SIGNAL_AGE=$(( $(date +%s) - CURRENT_SIGNAL ))
  (( SIGNAL_AGE > 31 )) && exit 0
fi
rm -f "$DEBOUNCE_FILE" 2>/dev/null || true

# ============================================================================
# CHECK PROVIDERS
# ============================================================================

command -v jq >/dev/null 2>&1 || exit 0

# Use shared provider detection (supports PROFILES, LEGACY DIRECT, LEGACY PROVIDER formats)
HANDLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_LIB="$HANDLER_DIR/../lib/check-provider-enabled.sh"
if [[ -f "$SHARED_LIB" ]]; then
  source "$SHARED_LIB"
fi

GH_ENABLED="false"
JIRA_ENABLED="false"
ADO_ENABLED="false"

if type check_provider_enabled &>/dev/null; then
  check_provider_enabled "$CONFIG_PATH" "github" && GH_ENABLED="true"
  check_provider_enabled "$CONFIG_PATH" "jira" && JIRA_ENABLED="true"
  check_provider_enabled "$CONFIG_PATH" "ado" && ADO_ENABLED="true"
else
  # Fallback to legacy jq check if shared lib not available
  GH_ENABLED=$(jq -r '.sync.github.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  JIRA_ENABLED=$(jq -r '.sync.jira.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  ADO_ENABLED=$(jq -r '.sync.ado.enabled // false' "$CONFIG_PATH" 2>/dev/null)
fi

if [[ "$GH_ENABLED" != "true" && "$JIRA_ENABLED" != "true" && "$ADO_ENABLED" != "true" ]]; then
  log "No providers enabled. Skipping."
  exit 0
fi

# Check auto-create is enabled
AUTO_CREATE=$(jq -r '.sync.autoCreateOnIncrement // .sync.autoSync // .hooks.post_increment_planning.auto_create_github_issue // false' "$CONFIG_PATH" 2>/dev/null)
if [[ "$AUTO_CREATE" != "true" ]]; then
  log "Auto-create disabled in config. Skipping."
  exit 0
fi

log "Creating external items for $INC_ID (github=$GH_ENABLED jira=$JIRA_ENABLED ado=$ADO_ENABLED)"

# ============================================================================
# GITHUB: Delegate to existing handler (backward compatible)
# ============================================================================

if [[ "$GH_ENABLED" == "true" ]]; then
  GITHUB_HANDLER="${PROJECT_ROOT}/plugins/specweave-github/hooks/github-auto-create-handler.sh"
  # Fallback: handler may be in a sibling plugin directory (umbrella repo layout)
  if [[ ! -f "$GITHUB_HANDLER" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    FALLBACK_DIR="$(cd "$SCRIPT_DIR/../../../specweave-github/hooks" 2>/dev/null && pwd)"
    [[ -n "$FALLBACK_DIR" ]] && GITHUB_HANDLER="$FALLBACK_DIR/github-auto-create-handler.sh"
  fi
  if [[ -f "$GITHUB_HANDLER" ]]; then
    log "Delegating GitHub auto-create to existing handler"
    bash "$GITHUB_HANDLER" "$INC_ID" &
    GH_PID=$!
  else
    log "GitHub handler not found at any known path"
  fi
fi

# ============================================================================
# JIRA/ADO: Call TypeScript module for per-user-story creation
# ============================================================================

if [[ "$JIRA_ENABLED" == "true" || "$ADO_ENABLED" == "true" ]]; then
  command -v node &>/dev/null || { log "Node.js not found. Skipping JIRA/ADO."; exit 0; }

  CREATE_MODULE="$PROJECT_ROOT/dist/src/core/universal-auto-create.js"
  if [[ ! -f "$CREATE_MODULE" ]]; then
    log "Module not found at $CREATE_MODULE. Skipping JIRA/ADO."
  else
    # Build config JSON for the TypeScript module
    JIRA_DOMAIN=$(jq -r '.sync.jira.domain // .issueTracker.domain // ""' "$CONFIG_PATH" 2>/dev/null)
    JIRA_PROJECT_KEY=$(jq -r '.sync.jira.projectKey // .issueTracker.projects[0].key // ""' "$CONFIG_PATH" 2>/dev/null)
    ADO_ORG=$(jq -r '.sync.ado.organization // .issueTracker.organization_ado // ""' "$CONFIG_PATH" 2>/dev/null)
    ADO_PROJECT=$(jq -r '.sync.ado.project // .issueTracker.project // ""' "$CONFIG_PATH" 2>/dev/null)

    OUTPUT=$(SW_CREATE_MODULE="$CREATE_MODULE" \
      SW_INC_ID="$INC_ID" \
      SW_SPEC_PATH="$SPEC_PATH" \
      SW_METADATA_PATH="$METADATA_PATH" \
      SW_JIRA_ENABLED="$JIRA_ENABLED" \
      SW_ADO_ENABLED="$ADO_ENABLED" \
      SW_JIRA_DOMAIN="$JIRA_DOMAIN" \
      SW_JIRA_PROJECT_KEY="$JIRA_PROJECT_KEY" \
      SW_ADO_ORG="$ADO_ORG" \
      SW_ADO_PROJECT="$ADO_PROJECT" \
      node --input-type=module -e "
const { SW_CREATE_MODULE, SW_INC_ID, SW_SPEC_PATH, SW_METADATA_PATH,
        SW_JIRA_ENABLED, SW_ADO_ENABLED, SW_JIRA_DOMAIN,
        SW_JIRA_PROJECT_KEY, SW_ADO_ORG, SW_ADO_PROJECT } = process.env;

const mod = await import(SW_CREATE_MODULE);

const config = {
  sync: {
    jira: { enabled: SW_JIRA_ENABLED === 'true' },
    ado: { enabled: SW_ADO_ENABLED === 'true' },
  },
  jira: { domain: SW_JIRA_DOMAIN, projectKey: SW_JIRA_PROJECT_KEY },
  ado: { organization: SW_ADO_ORG, project: SW_ADO_PROJECT },
};

try {
  const result = await mod.createExternalIssuesForIncrement(
    SW_INC_ID, SW_SPEC_PATH, SW_METADATA_PATH, config,
  );
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Universal auto-create error:', err.message || err);
  process.exit(1);
}
" 2>&1)
    EXIT_CODE=$?

    if [[ $EXIT_CODE -ne 0 ]]; then
      log "JIRA/ADO creation failed (exit $EXIT_CODE): $OUTPUT"
    else
      log "JIRA/ADO creation completed: $OUTPUT"
    fi
  fi
fi

# Wait for GitHub handler if started
if [[ -n "${GH_PID:-}" ]]; then
  wait "$GH_PID" 2>/dev/null || true
fi

log "Universal auto-create finished for $INC_ID"
exit 0
