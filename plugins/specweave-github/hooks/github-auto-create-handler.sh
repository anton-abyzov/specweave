#!/bin/bash
# github-auto-create-handler.sh — Auto-creates GitHub issues from spec.md user stories
#
# Triggered by post-tool-use.sh when spec.md is created/updated.
# Pure bash using gh CLI — no TypeScript compilation required.
#
# Features:
# - Idempotent: checks existing issues before creating
# - Updates metadata.json with external links
# - Debounce (30s window to batch rapid spec edits)
# - Circuit breaker (3 consecutive failures → auto-disable)
# - Non-blocking (all errors → exit 0)
#
# Usage: github-auto-create-handler.sh <INCREMENT_ID>
# Called by: safe_run_background in post-tool-use.sh

set +e  # Never crash Claude Code

[[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]] && exit 0

# ============================================================================
# ARGS & PROJECT ROOT
# ============================================================================

INC_ID="$1"
[[ -z "$INC_ID" ]] && exit 0

PROJECT_ROOT="$PWD"
while [[ "$PROJECT_ROOT" != "/" ]] && [[ ! -d "$PROJECT_ROOT/.specweave" ]]; do
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done
[[ ! -d "$PROJECT_ROOT/.specweave" ]] && exit 0

SPEC_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/spec.md"
META_PATH="$PROJECT_ROOT/.specweave/increments/$INC_ID/metadata.json"
CONFIG_PATH="$PROJECT_ROOT/.specweave/config.json"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOGS_DIR/github-auto-create.log"

mkdir -p "$STATE_DIR" "$LOGS_DIR" 2>/dev/null || true

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [github-auto-create] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# ============================================================================
# PRECONDITIONS
# ============================================================================

[[ ! -f "$SPEC_PATH" ]] && exit 0
[[ ! -f "$CONFIG_PATH" ]] && exit 0

# Template guard: skip if spec.md still contains placeholder markers
grep -q '\[Story Title\]' "$SPEC_PATH" && { log "Skipping: spec.md still contains [Story Title] template markers"; exit 0; }

command -v gh &>/dev/null || { log "gh CLI not found"; exit 0; }
command -v jq &>/dev/null || { log "jq not found"; exit 0; }

# Check GitHub sync enabled (shared 3-method detection)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_LIB_PATHS=(
  "$SCRIPT_DIR/../../specweave/hooks/v2/lib/check-provider-enabled.sh"
  "$SCRIPT_DIR/../../../specweave/hooks/v2/lib/check-provider-enabled.sh"
)
for _lib in "${SHARED_LIB_PATHS[@]}"; do
  [[ -f "$_lib" ]] && { source "$_lib"; break; }
done

if type check_provider_enabled &>/dev/null; then
  check_provider_enabled "$CONFIG_PATH" "github" || { log "GitHub sync not enabled"; exit 0; }
else
  GH_ENABLED=$(jq -r '.sync.github.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  [[ "$GH_ENABLED" != "true" ]] && { log "GitHub sync not enabled"; exit 0; }
fi

# Check auto-create enabled
# Two flags control auto-creation behavior:
#   - sync.autoSync (boolean): Global auto-sync toggle. When true, enables ALL auto-sync
#     operations including issue creation, progress sync, and status updates.
#   - hooks.post_increment_planning.auto_create_github_issue (boolean): Fine-grained toggle
#     for ONLY the auto-create-issue behavior in post-increment-planning hooks.
#
# Precedence: auto_create_github_issue (specific) > autoSync (global)
# If BOTH are set, auto_create_github_issue takes precedence for issue creation.
# If ONLY autoSync is true, issue creation is enabled (as part of the global auto-sync).
AUTO_SYNC=$(jq -r '.sync.autoSync // false' "$CONFIG_PATH" 2>/dev/null)
AUTO_CREATE=$(jq -r '.hooks.post_increment_planning.auto_create_github_issue // false' "$CONFIG_PATH" 2>/dev/null)

# Warn if only one flag is set (likely misconfiguration)
if [[ "$AUTO_SYNC" == "true" ]] && [[ "$AUTO_CREATE" == "false" ]]; then
  log "Warning: sync.autoSync=true but auto_create_github_issue=false. Issue creation enabled via autoSync. Set auto_create_github_issue=true to be explicit."
elif [[ "$AUTO_SYNC" == "false" ]] && [[ "$AUTO_CREATE" == "true" ]]; then
  log "Warning: auto_create_github_issue=true but sync.autoSync=false. Only issue creation is enabled; other sync operations are disabled."
fi

if [[ "$AUTO_SYNC" != "true" ]] && [[ "$AUTO_CREATE" != "true" ]]; then
  log "Auto-sync disabled (autoSync=$AUTO_SYNC, auto_create=$AUTO_CREATE)"
  exit 0
fi

# Log which flag triggered activation
if [[ "$AUTO_CREATE" == "true" ]]; then
  log "Auto-create enabled via hooks.post_increment_planning.auto_create_github_issue"
else
  log "Auto-create enabled via sync.autoSync (global toggle)"
fi

# Get owner/repo
OWNER=$(jq -r '.sync.github.owner // ""' "$CONFIG_PATH" 2>/dev/null)
REPO=$(jq -r '.sync.github.repo // ""' "$CONFIG_PATH" 2>/dev/null)
if [[ -z "$OWNER" ]] || [[ -z "$REPO" ]]; then
  log "GitHub owner/repo not configured"
  exit 0
fi
REPO_SLUG="$OWNER/$REPO"

# Get project name from config for labels
PROJECT_NAME=$(jq -r '.project.name // "specweave"' "$CONFIG_PATH" 2>/dev/null)
PROJECT_LABEL="project:${PROJECT_NAME}"

# ============================================================================
# CIRCUIT BREAKER
# ============================================================================

CB_FILE="$STATE_DIR/.hook-circuit-breaker-github-auto-create"
if [[ -f "$CB_FILE" ]]; then
  CB_COUNT=$(cat "$CB_FILE" 2>/dev/null || echo 0)
  if (( CB_COUNT >= 3 )); then
    log "Circuit breaker OPEN ($CB_COUNT failures). Skipping. Delete $CB_FILE to reset."
    exit 0
  fi
fi

# ============================================================================
# DEBOUNCE (30s window — spec.md may be written multiple times during planning)
# ============================================================================

if [[ "${SPECWEAVE_SKIP_DEBOUNCE:-0}" != "1" ]]; then
  DEBOUNCE_FILE="$STATE_DIR/.github-auto-create-pending-$INC_ID"
  if [[ -f "$DEBOUNCE_FILE" ]]; then
    # POSIX-portable: use perl for mtime (works on macOS and Linux)
    FILE_MTIME=$(perl -e 'print((stat($ARGV[0]))[9])' "$DEBOUNCE_FILE" 2>/dev/null || echo 0)
    SIGNAL_AGE=$(($(date +%s) - FILE_MTIME))
    if (( SIGNAL_AGE < 30 )); then
      log "Debounce: signal age ${SIGNAL_AGE}s < 30s. Deferring."
      exit 0
    fi
  fi
  echo "$(date +%s)" > "$DEBOUNCE_FILE" 2>/dev/null || true
  sleep 30
  # Check if a newer invocation took over
  if [[ -f "$DEBOUNCE_FILE" ]]; then
    CURRENT_SIGNAL=$(cat "$DEBOUNCE_FILE" 2>/dev/null || echo 0)
    NOW=$(date +%s)
    SIGNAL_AGE=$((NOW - CURRENT_SIGNAL))
    if (( SIGNAL_AGE > 32 )); then
      log "Debounce: newer invocation detected. Exiting."
      exit 0
    fi
  fi
  rm -f "$DEBOUNCE_FILE" 2>/dev/null || true
fi

# ============================================================================
# CHECK IF ISSUES ALREADY EXIST
# ============================================================================

if [[ -f "$META_PATH" ]]; then
  # Check BOTH new (externalLinks) and old (github.issues[]) formats for existing issues
  ISSUE_COUNT=$(jq '
    [
      (.externalLinks.github.issues // {} | to_entries[] | select(.value.issueNumber != null)),
      (.github.issues // [] | .[] | select(.number != null))
    ] | length
  ' "$META_PATH" 2>/dev/null || echo 0)
  if (( ISSUE_COUNT > 0 )); then
    log "Issues already exist for $INC_ID ($ISSUE_COUNT). Skipping."
    exit 0
  fi
fi

# ============================================================================
# PARSE USER STORIES FROM SPEC.MD
# ============================================================================

# Get default priority from metadata.json
DEFAULT_PRIORITY="P2"
if [[ -f "$META_PATH" ]]; then
  META_PRIORITY=$(jq -r '.priority // "P2"' "$META_PATH" 2>/dev/null)
  [[ -n "$META_PRIORITY" ]] && DEFAULT_PRIORITY="$META_PRIORITY"
fi

log "Parsing user stories from $SPEC_PATH..."

# Arrays to hold parsed user stories
declare -a US_IDS US_TITLES US_PRIORITIES
US_COUNT=0

while IFS= read -r line; do
  # Match: ### US-001: Title Here (P1)  — with priority
  if [[ "$line" =~ ^###[[:space:]]+(US-[0-9]+):[[:space:]]+(.+)[[:space:]]+\((P[0-9])\)[[:space:]]*$ ]]; then
    US_IDS+=("${BASH_REMATCH[1]}")
    US_TITLES+=("${BASH_REMATCH[2]}")
    US_PRIORITIES+=("${BASH_REMATCH[3]}")
    ((US_COUNT++))
  # Match: ### US-001: Title Here  — without priority
  elif [[ "$line" =~ ^###[[:space:]]+(US-[0-9]+):[[:space:]]+(.+)[[:space:]]*$ ]]; then
    US_IDS+=("${BASH_REMATCH[1]}")
    US_TITLES+=("${BASH_REMATCH[2]}")
    # Try to extract priority from metadata.json or default to P2
    US_PRIORITIES+=("${DEFAULT_PRIORITY:-P2}")
    ((US_COUNT++))
  fi
done < "$SPEC_PATH"

if (( US_COUNT == 0 )); then
  log "No user stories found in spec.md. Skipping."
  exit 0
fi

log "Found $US_COUNT user stories. Creating GitHub issues..."

# Get increment title from frontmatter
INC_TITLE=$(grep -m1 '^title:' "$SPEC_PATH" | sed 's/^title:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//')

# ============================================================================
# DERIVE FEATURE ID (ADR-0187: FS-{number} from increment number)
# ============================================================================
# Extract numeric prefix from increment ID: "0192-github-sync-v2-multi-repo" → "0192"
INC_NUM=$(echo "$INC_ID" | grep -oE '^[0-9]+')
# Strip leading zeros: "0192" → "192", "0001" → "1"
FEATURE_NUM=$(echo "$INC_NUM" | sed 's/^0*//')
[[ -z "$FEATURE_NUM" ]] && FEATURE_NUM="0"
FEATURE_ID="FS-${FEATURE_NUM}"
log "Derived Feature ID: $FEATURE_ID (from increment $INC_ID)"

# ============================================================================
# CREATE MILESTONE (one per increment, idempotent)
# ============================================================================

# Milestone uses Feature ID format: "FS-192: Short Title"
MILESTONE_TITLE="${FEATURE_ID}"
MILESTONE_NUM=""

# Check existing milestones (list all, including closed)
EXISTING_MS=$(gh api "repos/$REPO_SLUG/milestones?state=all&per_page=100" --jq ".[] | select(.title == \"$MILESTONE_TITLE\") | .number" 2>/dev/null || echo "")
if [[ -n "$EXISTING_MS" ]]; then
  MILESTONE_NUM="$EXISTING_MS"
  log "Using existing milestone #$MILESTONE_NUM"
else
  MS_RESULT=$(gh api "repos/$REPO_SLUG/milestones" \
    -f "title=$MILESTONE_TITLE" \
    -f "description=$INC_TITLE" \
    --method POST --jq '.number' 2>/dev/null || echo "")
  if [[ -n "$MS_RESULT" ]] && [[ "$MS_RESULT" =~ ^[0-9]+$ ]]; then
    MILESTONE_NUM="$MS_RESULT"
    log "Created milestone #$MILESTONE_NUM: $MILESTONE_TITLE"
  else
    log "Warning: Failed to create milestone (continuing without it)"
  fi
fi

# ============================================================================
# ENSURE REQUIRED LABELS EXIST (idempotent)
# ============================================================================

ensure_label() {
  local label_name="$1"
  local label_color="${2:-ededed}"
  local label_desc="${3:-}"
  gh label create "$label_name" --repo "$REPO_SLUG" --color "$label_color" \
    --description "$label_desc" --force 2>/dev/null || true
}

# Core labels
ensure_label "user-story" "0075ca" "User story from SpecWeave spec"
ensure_label "specweave" "6f42c1" "Managed by SpecWeave"
ensure_label "$PROJECT_LABEL" "c5def5" "$PROJECT_NAME project"
ensure_label "status:active" "0e8a16" "Active work item"
ensure_label "status:completed" "6f42c1" "Completed work item"
ensure_label "status:not_started" "fbca04" "User story not started"

# Priority labels (collect unique priorities from parsed user stories)
for i in $(seq 0 $((US_COUNT - 1))); do
  PRIO_LABEL="priority:$(echo "${US_PRIORITIES[$i]}" | tr '[:upper:]' '[:lower:]')"
  case "${US_PRIORITIES[$i]}" in
    P1) ensure_label "$PRIO_LABEL" "b60205" "Critical priority" ;;
    P2) ensure_label "$PRIO_LABEL" "fbca04" "Medium priority" ;;
    P3) ensure_label "$PRIO_LABEL" "0e8a16" "Low priority" ;;
    *)  ensure_label "$PRIO_LABEL" "ededed" "Priority label" ;;
  esac
done

log "Labels ensured"

# ============================================================================
# EXTRACT ACCEPTANCE CRITERIA FOR EACH USER STORY
# ============================================================================

# Function to extract ACs for a given US from spec.md
# Handles both formats:
#   - [ ] **AC-US1-01**: Description   (bold AC ID)
#   - [ ] AC-US1-01: Description       (plain AC ID)
extract_acs_for_us() {
  local us_id="$1"
  local in_section=false
  local in_ac=false
  local acs=""

  while IFS= read -r line; do
    # Start of our US section
    if [[ "$line" =~ ^###[[:space:]]+"$us_id": ]] || [[ "$line" =~ ^###[[:space:]]+"$us_id"[[:space:]] ]]; then
      in_section=true
      continue
    fi
    # Start of next US section or next ## section — stop
    if $in_section && [[ "$line" =~ ^##[[:space:]] ]]; then
      break
    fi
    # Inside our section, look for AC lines
    if $in_section; then
      if [[ "$line" =~ ^\*\*Acceptance[[:space:]]Criteria ]]; then
        in_ac=true
        continue
      fi
      # Format 1: Bold AC ID — - [ ] **AC-US1-01**: Description
      if $in_ac && [[ "$line" =~ ^-[[:space:]]+\[(.)\][[:space:]]+\*\*([^*]+)\*\*:[[:space:]]*(.*) ]]; then
        local checked="${BASH_REMATCH[1]}"
        local ac_id="${BASH_REMATCH[2]}"
        local ac_desc="${BASH_REMATCH[3]}"
        if [[ "$checked" == "x" ]]; then
          acs+="- [x] **${ac_id}**: ${ac_desc}"$'\n'
        else
          acs+="- [ ] **${ac_id}**: ${ac_desc}"$'\n'
        fi
        continue
      fi
      # Format 2: Plain AC ID — - [ ] AC-US1-01: Description
      if $in_ac && [[ "$line" =~ ^-[[:space:]]+\[(.)\][[:space:]]+(AC-[^:]+):[[:space:]]*(.*) ]]; then
        local checked="${BASH_REMATCH[1]}"
        local ac_id="${BASH_REMATCH[2]}"
        local ac_desc="${BASH_REMATCH[3]}"
        if [[ "$checked" == "x" ]]; then
          acs+="- [x] **${ac_id}**: ${ac_desc}"$'\n'
        else
          acs+="- [ ] **${ac_id}**: ${ac_desc}"$'\n'
        fi
        continue
      fi
      # Stop ACs at section divider or next heading
      if $in_ac && [[ "$line" =~ ^---$ ]]; then
        break
      fi
    fi
  done < "$SPEC_PATH"

  echo "$acs"
}

# Function to extract description for a given US
# Collects ALL text between the US heading and the Acceptance Criteria / next section
extract_desc_for_us() {
  local us_id="$1"
  local in_section=false
  local desc=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^###[[:space:]]+"$us_id": ]]; then
      in_section=true
      continue
    fi
    if $in_section; then
      # Stop at next US heading, next ## section, or Acceptance Criteria
      if [[ "$line" =~ ^###[[:space:]]+US- ]] || [[ "$line" =~ ^##[[:space:]] ]]; then
        break
      fi
      if [[ "$line" =~ ^\*\*Acceptance[[:space:]]Criteria ]]; then
        break
      fi
      # Collect non-empty lines as description
      if [[ -n "$line" ]]; then
        desc+="$line"$'\n'
      fi
    fi
  done < "$SPEC_PATH"

  echo "$desc"
}

# ============================================================================
# CREATE ISSUES
# ============================================================================

CREATED_JSON="{}"
ERRORS=0

for i in $(seq 0 $((US_COUNT - 1))); do
  US_ID="${US_IDS[$i]}"
  US_TITLE="${US_TITLES[$i]}"
  US_PRIORITY="${US_PRIORITIES[$i]}"

  ISSUE_TITLE="[${FEATURE_ID}][${US_ID}] ${US_TITLE}"

  # Check if issue already exists (by title prefix search — match both old and new format)
  EXISTING=$(gh issue list --repo "$REPO_SLUG" --search "[${FEATURE_ID}][${US_ID}] in:title" --json number,url --limit 1 2>/dev/null || echo "[]")
  EXISTING_NUM=$(echo "$EXISTING" | jq -r '.[0].number // empty' 2>/dev/null)

  if [[ -n "$EXISTING_NUM" ]]; then
    EXISTING_URL=$(echo "$EXISTING" | jq -r '.[0].url // empty' 2>/dev/null)
    log "Issue already exists for $US_ID: #$EXISTING_NUM"
    CREATED_JSON=$(echo "$CREATED_JSON" | jq --arg us "$US_ID" --arg num "$EXISTING_NUM" --arg url "$EXISTING_URL" \
      '. + {($us): {"issueNumber": ($num | tonumber), "issueUrl": $url, "status": "existing"}}' 2>/dev/null)
    continue
  fi

  # Build issue body
  US_DESC=$(extract_desc_for_us "$US_ID")
  # Ensure blank line after description for proper markdown paragraph separation
  [[ -n "$US_DESC" ]] && US_DESC="${US_DESC}"$'\n'
  US_ACS=$(extract_acs_for_us "$US_ID")

  ISSUE_BODY="## Description

${US_DESC}
**Priority**: ${US_PRIORITY}

## Acceptance Criteria

<!-- specweave:ac-start -->
${US_ACS}<!-- specweave:ac-end -->

---
**Feature**: ${FEATURE_ID} | **Increment**: \`${INC_ID}\`
<!-- specweave:sync feature=${FEATURE_ID} increment=${INC_ID} us=${US_ID} -->"

  # Create the issue
  CREATE_ARGS=(
    "issue" "create"
    "--repo" "$REPO_SLUG"
    "--title" "$ISSUE_TITLE"
    "--body" "$ISSUE_BODY"
    "--label" "user-story"
    "--label" "specweave"
    "--label" "$PROJECT_LABEL"
    "--label" "status:active"
    "--label" "priority:$(echo "$US_PRIORITY" | tr '[:upper:]' '[:lower:]')"
  )

  # Add milestone if available
  if [[ -n "$MILESTONE_NUM" ]]; then
    CREATE_ARGS+=("--milestone" "$MILESTONE_TITLE")
  fi

  RESULT=$(gh "${CREATE_ARGS[@]}" 2>&1)
  CREATE_EXIT=$?

  if [[ $CREATE_EXIT -ne 0 ]]; then
    log "ERROR creating issue for $US_ID: $RESULT"
    ((ERRORS++))

    # Update circuit breaker
    CB_VAL=$(cat "$CB_FILE" 2>/dev/null || echo 0)
    echo "$((CB_VAL + 1))" > "$CB_FILE" 2>/dev/null || true
    continue
  fi

  # Parse issue URL from result (gh outputs the URL on success)
  ISSUE_URL=$(echo "$RESULT" | grep -oE 'https://github.com/[^ ]+' | head -1)
  ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')

  if [[ -n "$ISSUE_NUM" ]]; then
    log "Created issue #$ISSUE_NUM for $US_ID: $ISSUE_URL"
    CREATED_JSON=$(echo "$CREATED_JSON" | jq --arg us "$US_ID" --arg num "$ISSUE_NUM" --arg url "$ISSUE_URL" \
      '. + {($us): {"issueNumber": ($num | tonumber), "issueUrl": $url, "status": "created"}}' 2>/dev/null)
  fi
done

# ============================================================================
# UPDATE METADATA.JSON WITH EXTERNAL LINKS
# ============================================================================

if [[ -f "$META_PATH" ]]; then
  UPDATED_META=$(jq --argjson issues "$CREATED_JSON" --arg ms "${MILESTONE_NUM:-}" \
    '.externalLinks.github = {
      "issues": $issues,
      "milestone": (if $ms != "" then ($ms | tonumber) else null end),
      "syncedAt": (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }' "$META_PATH" 2>/dev/null)

  if [[ -n "$UPDATED_META" ]]; then
    echo "$UPDATED_META" > "$META_PATH" 2>/dev/null
    log "Updated metadata.json with GitHub issue links (externalLinks format)"

    # v1.0.240 FIX: Also write OLD format (metadata.github.issues[]) for reconciler compatibility
    # The reconciler and closure flows read metadata.github.issues[], not externalLinks
    OLD_FORMAT_JSON=$(echo "$CREATED_JSON" | jq '[to_entries[] | select(.value.issueNumber != null) | {
      userStory: .key,
      number: .value.issueNumber,
      url: .value.issueUrl,
      createdAt: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }]' 2>/dev/null)

    if [[ -n "$OLD_FORMAT_JSON" ]] && [[ "$OLD_FORMAT_JSON" != "[]" ]]; then
      UPDATED_META_V2=$(jq --argjson old_issues "$OLD_FORMAT_JSON" '
        if .github == null then .github = {} else . end |
        .github.issues = ((.github.issues // []) + $old_issues | unique_by(.userStory)) |
        .github.lastSync = (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
      ' "$META_PATH" 2>/dev/null)

      if [[ -n "$UPDATED_META_V2" ]]; then
        echo "$UPDATED_META_V2" > "$META_PATH" 2>/dev/null
        log "Also backfilled old-format github.issues[] for reconciler"
      fi
    fi
  fi
fi

# ============================================================================
# UPDATE SYNC METADATA
# ============================================================================

SYNC_META="$PROJECT_ROOT/.specweave/sync-metadata.json"
if [[ -f "$SYNC_META" ]]; then
  jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '.github.lastSync = $ts | .github.lastSyncResult = "success"' \
    "$SYNC_META" > "${SYNC_META}.tmp" 2>/dev/null && \
    mv "${SYNC_META}.tmp" "$SYNC_META" 2>/dev/null
fi

# Reset circuit breaker on success
if (( ERRORS == 0 )); then
  echo "0" > "$CB_FILE" 2>/dev/null || true
fi

CREATED_COUNT=$(echo "$CREATED_JSON" | jq 'to_entries | map(select(.value.status == "created")) | length' 2>/dev/null || echo 0)
EXISTING_COUNT=$(echo "$CREATED_JSON" | jq 'to_entries | map(select(.value.status == "existing")) | length' 2>/dev/null || echo 0)

log "Done: $CREATED_COUNT created, $EXISTING_COUNT existing, $ERRORS errors"

# Output summary for user visibility (will appear as hook output)
if (( CREATED_COUNT > 0 )); then
  echo ""
  echo "  [GitHub Sync] Auto-created $CREATED_COUNT issue(s) for increment $INC_ID"
  echo "  Milestone: $MILESTONE_TITLE"
  echo ""
fi

exit 0
