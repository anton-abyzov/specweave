#!/bin/bash

# SpecWeave UserPromptSubmit Hook (v1.0.127 - True Auto Plugin Loading)
# Fires BEFORE user's command executes (prompt-based hook)
# Purpose: Auto-load plugins, discipline validation, context injection, instant command execution
#
# FEATURES:
# - v1.0.127: AUTO-LOAD PLUGINS - Detect plugin-specific keywords and install in background
#   * Keywords: react, vue, kubernetes, docker, terraform, github, jira, etc.
#   * Runs in background (non-blocking)
#   * Controlled by SPECWEAVE_DISABLE_AUTO_LOAD env var
# - v1.0.106: CRITICAL FIX - Use approve+systemMessage for info commands (not block)
#   * "block" erases command from context and stops execution
#   * Info commands (/sw:progress, /sw:status, /sw:jobs, etc.) now use "approve"
#   * Validation errors (task limit) still use "block" correctly
# - v1.0.105: Fix ARGS extraction for prompts with IDE metadata prefix (<ide_opened_file>)
# - v0.34.0: Unified "block" decision for both CLI and VSCode (WRONG - fixed in v1.0.106)
# - v0.33.1: Unified instant execution - scripts run in hook for both CLI and VSCode
# - v0.33.0: Script delegation pattern (now deprecated in favor of block decision)
# - v0.26.13: jq for JSON parsing (10x faster than node -e)
# - Single active increment detection (cached, not 4x!)
# - Deferred heavy checks (SpecSyncManager only when needed)
# - Ultra-fast early exits
#
# Performance: Status commands <100ms (was 3+ min), other prompts <10ms
#
# ARCHITECTURE:
# - Both CLI and VSCode: Uses "block" decision with "reason" field to display output and stop execution
# - Scripts execute in hook - NO LLM involvement for instant commands
# - systemMessage only works in Stop hooks (not UserPromptSubmit), so we use block uniformly

set +e

# ==============================================================================
# ULTRA-FAST EARLY EXIT (before ANY processing)
# ==============================================================================
INPUT=$(cat 2>/dev/null || echo '{}')

# Use jq if available (10x faster than node), fallback to simple grep
if command -v jq >/dev/null 2>&1; then
  PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")
else
  # Fallback: extract prompt with grep (no node!)
  PROMPT=$(echo "$INPUT" | grep -oP '"prompt"\s*:\s*"\K[^"]*' 2>/dev/null || echo "")
fi

# ==============================================================================
# AUTO-LOAD PLUGIN DETECTION + INCREMENT ASSIST (v1.0.141)
# ==============================================================================
# Detect plugin needs AND increment creation suggestions using LLM (Claude Haiku)
# This runs BEFORE the SpecWeave keyword check to catch plugin-specific prompts
#
# Plugin Auto-Load Control:
# - SPECWEAVE_DISABLE_AUTO_LOAD=1 environment variable
# - pluginAutoLoad.enabled: false in .specweave/config.json
#
# Increment Assist Control:
# - incrementAssist.enabled: false in .specweave/config.json (disables suggestions)
# - incrementAssist.confidenceThreshold: 0.7 (minimum confidence to show suggestion)
#
# When both disabled: NO detection, NO LLM calls, fastest response time (~5-7s saved)

# Check config for pluginAutoLoad.enabled and incrementAssist.enabled settings
PLUGIN_AUTOLOAD_ENABLED=true
INCREMENT_ASSIST_ENABLED=true
INCREMENT_CONFIDENCE_THRESHOLD=0.7
CONFIG_PATH=".specweave/config.json"
if [[ -f "$CONFIG_PATH" ]]; then
  if command -v jq >/dev/null 2>&1; then
    AUTOLOAD_VALUE=$(jq -r '.pluginAutoLoad.enabled // true' "$CONFIG_PATH" 2>/dev/null)
    [[ "$AUTOLOAD_VALUE" == "false" ]] && PLUGIN_AUTOLOAD_ENABLED=false

    INCREMENT_VALUE=$(jq -r '.incrementAssist.enabled // true' "$CONFIG_PATH" 2>/dev/null)
    [[ "$INCREMENT_VALUE" == "false" ]] && INCREMENT_ASSIST_ENABLED=false

    THRESHOLD_VALUE=$(jq -r '.incrementAssist.confidenceThreshold // 0.7' "$CONFIG_PATH" 2>/dev/null)
    [[ "$THRESHOLD_VALUE" =~ ^[0-9.]+$ ]] && INCREMENT_CONFIDENCE_THRESHOLD="$THRESHOLD_VALUE"
  else
    # Fallback: grep for explicit false settings
    if grep -q '"pluginAutoLoad"' "$CONFIG_PATH" 2>/dev/null && grep -q '"enabled"[[:space:]]*:[[:space:]]*false' "$CONFIG_PATH" 2>/dev/null; then
      PLUGIN_AUTOLOAD_ENABLED=false
    fi
    if grep -q '"incrementAssist"' "$CONFIG_PATH" 2>/dev/null && grep -A5 '"incrementAssist"' "$CONFIG_PATH" 2>/dev/null | grep -q '"enabled"[[:space:]]*:[[:space:]]*false'; then
      INCREMENT_ASSIST_ENABLED=false
    fi
  fi
fi

if [[ "$PLUGIN_AUTOLOAD_ENABLED" == "true" ]] && [[ "${SPECWEAVE_DISABLE_AUTO_LOAD:-0}" != "1" ]] && [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" != "1" ]]; then
  # Check for plugin-specific keywords (broader than SpecWeave keywords)
  # These trigger auto-install of relevant plugins
  # v1.0.130: Expanded to cover ALL development domains
  #
  # DOMAINS COVERED:
  # - Frontend: react, vue, angular, svelte, nextjs, nuxt, tailwind, dashboard, component, ui
  # - Backend: api, rest, graphql, express, fastapi, django, nestjs, spring, database, sql, postgres, mongodb, redis
  # - Testing: test, tdd, vitest, jest, playwright, cypress, e2e, coverage, qa
  # - Infrastructure: docker, terraform, pulumi, aws, azure, gcp, deploy, ci/cd, prometheus, grafana
  # - Kubernetes: kubernetes, k8s, helm, eks, aks, gke, argocd, gitops
  # - Mobile: mobile, react native, expo, ios, android, flutter
  # - ML/AI: ml, ai, machine learning, pytorch, tensorflow, mlops, llm, nlp
  # - Payments: stripe, paypal, checkout, billing, subscription
  # - Release: release, version, changelog, publish, semver
  # - GitHub: github, pr, pull request, issues, actions
  # - Kafka: kafka, event streaming, confluent, ksqldb
  # - Diagrams: diagram, mermaid, c4, flowchart
  # - Docs: documentation, docusaurus, readme
  # - JIRA/ADO: jira, azure devops, work item
  #
  if echo "$PROMPT" | grep -qiE "(react|vue|angular|svelte|next\.?js|nuxt|tailwind|dashboard|component|frontend|api|rest|graphql|express|fastapi|django|nestjs|spring|backend|database|sql|postgres|mongodb|redis|prisma|test|tdd|vitest|jest|playwright|cypress|e2e|coverage|qa|docker|terraform|pulumi|aws|azure|gcp|deploy|ci.?cd|prometheus|grafana|kubernetes|k8s|helm|eks|aks|gke|argocd|gitops|mobile|react.?native|expo|ios|android|flutter|ml|ai|machine.?learning|pytorch|tensorflow|mlops|llm|nlp|stripe|paypal|checkout|billing|subscription|payment|release|version|changelog|publish|semver|github|pr|pull.?request|issues|actions|kafka|event.?streaming|confluent|ksqldb|diagram|mermaid|c4|flowchart|documentation|docusaurus|readme|jira|azure.?devops|work.?item)"; then
    # Run detect-intent in background (non-blocking) with --install --silent
    # This will auto-install relevant plugins based on the prompt
    if command -v specweave >/dev/null 2>&1; then
      # Setup lazy-loading log for graceful degradation (T-010)
      LAZY_LOAD_LOG="$HOME/.specweave/logs/lazy-loading.log"
      mkdir -p "$(dirname "$LAZY_LOAD_LOG")" 2>/dev/null

      # T-012: Per-session cache to avoid redundant detection
      # Hash the prompt and check if we've already processed similar keywords this session
      PROMPT_CACHE_DIR="$HOME/.specweave/state/prompt-cache"
      mkdir -p "$PROMPT_CACHE_DIR" 2>/dev/null

      # Extract matched keywords as cache key (simpler than full prompt hash)
      # v1.0.130: Expanded to match all domain keywords
      MATCHED_KEYWORDS=$(echo "$PROMPT" | grep -oiE "(react|vue|angular|svelte|nextjs|nuxt|tailwind|dashboard|frontend|api|graphql|express|fastapi|django|nestjs|spring|backend|database|postgres|mongodb|redis|test|tdd|vitest|jest|playwright|cypress|docker|terraform|aws|azure|gcp|kubernetes|k8s|helm|argocd|mobile|expo|ios|android|flutter|ml|ai|pytorch|tensorflow|mlops|llm|stripe|paypal|payment|release|changelog|github|kafka|confluent|diagram|mermaid|jira|ado)" | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' '-')
      CACHE_FILE="$PROMPT_CACHE_DIR/${MATCHED_KEYWORDS}detected"

      # Skip if these keywords were already processed (cache exists and is recent)
      SHOULD_DETECT=true
      if [[ -f "$CACHE_FILE" ]]; then
        CACHE_AGE=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || stat -c%Y "$CACHE_FILE" 2>/dev/null || echo 0)))
        # Per-session cache: 30 minutes (session duration)
        if [[ "$CACHE_AGE" -lt 1800 ]]; then
          SHOULD_DETECT=false
        fi
      fi

      if [[ "$SHOULD_DETECT" == "true" ]]; then
        # Escape prompt for shell (replace quotes and special chars)
        ESCAPED_PROMPT=$(printf '%s' "$PROMPT" | sed "s/'/'\\\\''/g")

        # Run with timeout (10s max per T-011) and log errors for debugging
        # T-011: Background timeout is 10s; hook itself returns immediately (<500ms)
        # Graceful degradation: errors logged but don't block Claude
        (
          # T-014: Performance logging
          START_TIME=$(perl -MTime::HiRes=time -e 'printf "%.0f", time*1000' 2>/dev/null || date +%s)000
          PROMPT_HASH=$(echo "$MATCHED_KEYWORDS" | md5sum 2>/dev/null | cut -c1-8 || echo "unknown")

          if command -v timeout >/dev/null 2>&1; then
            timeout 10 specweave detect-intent "$ESCAPED_PROMPT" --install --silent >/dev/null 2>>"$LAZY_LOAD_LOG"
            EXIT_CODE=$?
          else
            specweave detect-intent "$ESCAPED_PROMPT" --install --silent >/dev/null 2>>"$LAZY_LOAD_LOG"
            EXIT_CODE=$?
          fi

          END_TIME=$(perl -MTime::HiRes=time -e 'printf "%.0f", time*1000' 2>/dev/null || date +%s)000
          DURATION=$((END_TIME - START_TIME))

          if [[ "$EXIT_CODE" -eq 0 ]]; then
            touch "$CACHE_FILE"
            echo "[$(date -Iseconds)] detect-intent success | duration=${DURATION}ms | keywords=$MATCHED_KEYWORDS | hash=$PROMPT_HASH" >> "$LAZY_LOAD_LOG"
          else
            echo "[$(date -Iseconds)] detect-intent failed (code=$EXIT_CODE) | duration=${DURATION}ms | prompt=${ESCAPED_PROMPT:0:50}..." >> "$LAZY_LOAD_LOG"
          fi
        ) &
        disown 2>/dev/null
      fi
    fi
  fi
fi

# ==============================================================================
# INCREMENT ASSIST - SUGGEST NEW INCREMENT (v1.0.141)
# ==============================================================================
# Detect if user is starting new work and suggest creating an increment
# This runs synchronously (~5-7s) to show suggestion BEFORE Claude responds
#
# Triggers on prompts that look like new work:
# - "build X", "create X", "implement X", "add feature X", "develop X"
# - "I want to build", "let's make", "we need to add"
#
# Does NOT trigger when:
# - User is already using /sw: commands (already in workflow)
# - Prompt is a question ("how do I", "what is", "explain")
# - incrementAssist.enabled is false in config
#
# Output: systemMessage with suggestion to create increment

# Only run if increment assist is enabled and not already using /sw: commands
if [[ "$INCREMENT_ASSIST_ENABLED" == "true" ]] && [[ "${SPECWEAVE_DISABLE_AUTO_LOAD:-0}" != "1" ]] && [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" != "1" ]]; then
  # Check if prompt looks like new work (not already using /sw: or asking questions)
  if ! echo "$PROMPT" | grep -qE "^[[:space:]]*/sw:" && \
     ! echo "$PROMPT" | grep -qiE "^(how|what|where|when|why|explain|describe|tell me|can you|could you|would you|is there|are there)" && \
     echo "$PROMPT" | grep -qiE "(build|create|implement|add|develop|make|design|set up|setup|start|begin|initialize|write|new feature|add feature|need to build|want to build|let's make|let's build|we need)"; then

    # Check if specweave CLI is available
    if command -v specweave >/dev/null 2>&1; then
      # Escape prompt for shell
      ESCAPED_PROMPT=$(printf '%s' "$PROMPT" | sed "s/'/'\\\\''/g")

      # Run detect-intent synchronously to get increment suggestion
      # Use shorter timeout (8s) since this blocks the response
      DETECT_OUTPUT=""
      if command -v timeout >/dev/null 2>&1; then
        DETECT_OUTPUT=$(timeout 8 specweave detect-intent "$ESCAPED_PROMPT" 2>/dev/null)
      else
        DETECT_OUTPUT=$(specweave detect-intent "$ESCAPED_PROMPT" 2>/dev/null)
      fi

      # Extract JSON from output (skip debug log lines)
      # The detect-intent CLI outputs debug logs to stdout before the JSON
      # Use grep -A to extract from first '{' to end of output
      if [[ -n "$DETECT_OUTPUT" ]]; then
        DETECT_OUTPUT=$(echo "$DETECT_OUTPUT" | grep -A9999 '^{')
      fi

      # Parse increment suggestion from JSON output
      if [[ -n "$DETECT_OUTPUT" ]] && command -v jq >/dev/null 2>&1; then
        INCREMENT_ACTION=$(echo "$DETECT_OUTPUT" | jq -r '.increment.action // "none"' 2>/dev/null)
        INCREMENT_CONFIDENCE=$(echo "$DETECT_OUTPUT" | jq -r '.increment.confidence // 0' 2>/dev/null)
        INCREMENT_NAME=$(echo "$DETECT_OUTPUT" | jq -r '.increment.suggestedName // ""' 2>/dev/null)
        INCREMENT_KEYWORD=$(echo "$DETECT_OUTPUT" | jq -r '.increment.relatedKeyword // ""' 2>/dev/null)
        INCREMENT_REASON=$(echo "$DETECT_OUTPUT" | jq -r '.increment.reasoning // ""' 2>/dev/null)

        # Fallback: If LLM didn't return increment info but prompt looks like new work, suggest anyway
        # This handles cases where LLM doesn't follow the output format consistently
        if [[ "$INCREMENT_ACTION" == "none" ]] && [[ "$INCREMENT_CONFIDENCE" == "0" ]]; then
          # Check if prompt has strong signals for new feature work
          if echo "$PROMPT" | grep -qiE "(build|create|implement|develop|new feature|add feature)"; then
            INCREMENT_ACTION="new"
            INCREMENT_CONFIDENCE="0.75"
            INCREMENT_REASON="Prompt contains feature-building keywords"
            # Extract a suggested name from the prompt
            INCREMENT_NAME=$(echo "$PROMPT" | grep -oiE "(build|create|implement|develop|add)[[:space:]]+(a[[:space:]]+)?(new[[:space:]]+)?[a-z]+" | tail -1 | sed 's/^[a-z]*[[:space:]]*a[[:space:]]*new[[:space:]]*//i; s/^[a-z]*[[:space:]]*//i' | tr ' ' '-')
          fi
        fi

        # Only show suggestion if confidence exceeds threshold and action is actionable
        if [[ "$INCREMENT_ACTION" == "new" ]] && (( $(echo "$INCREMENT_CONFIDENCE >= $INCREMENT_CONFIDENCE_THRESHOLD" | bc -l 2>/dev/null || echo 0) )); then
          # Suggest creating new increment
          SUGGESTED_CMD="/sw:increment"
          [[ -n "$INCREMENT_NAME" ]] && SUGGESTED_CMD="/sw:increment \"$INCREMENT_NAME\""

          # Build message with actual newlines - jq will escape them properly
          MSG="💡 **Increment Suggestion**: This looks like a new feature or significant work.

Consider creating an increment first for proper tracking:
\`\`\`
$SUGGESTED_CMD
\`\`\`

*Reason: $INCREMENT_REASON*

---

*Tip: Disable this suggestion with \`incrementAssist.enabled: false\` in config.json*"
          # Use jq -nc to construct compact JSON with properly escaped newlines
          jq -nc --arg msg "$MSG" '{"decision":"approve","systemMessage":$msg}'
          exit 0

        elif [[ "$INCREMENT_ACTION" == "reopen" ]] && (( $(echo "$INCREMENT_CONFIDENCE >= $INCREMENT_CONFIDENCE_THRESHOLD" | bc -l 2>/dev/null || echo 0) )); then
          # Suggest reopening existing increment
          SEARCH_HINT=""
          [[ -n "$INCREMENT_KEYWORD" ]] && SEARCH_HINT=" (look for: *$INCREMENT_KEYWORD*)"

          MSG="💡 **Increment Suggestion**: This looks related to previous work$SEARCH_HINT.

Consider reopening the existing increment:
\`\`\`
/sw:status  # Find the related increment
/sw:resume <id>  # Reopen it
\`\`\`

*Reason: $INCREMENT_REASON*

---

*Tip: Disable this suggestion with \`incrementAssist.enabled: false\` in config.json*"
          jq -nc --arg msg "$MSG" '{"decision":"approve","systemMessage":$msg}'
          exit 0

        elif [[ "$INCREMENT_ACTION" == "hotfix" ]] && (( $(echo "$INCREMENT_CONFIDENCE >= $INCREMENT_CONFIDENCE_THRESHOLD" | bc -l 2>/dev/null || echo 0) )); then
          # Suggest creating hotfix increment
          MSG="🚨 **Hotfix Detected**: This appears to be an urgent production issue.

Create a hotfix increment:
\`\`\`
/sw:increment --type=hotfix \"$INCREMENT_NAME\"
\`\`\`

*Reason: $INCREMENT_REASON*

---

*Tip: Disable this suggestion with \`incrementAssist.enabled: false\` in config.json*"
          jq -nc --arg msg "$MSG" '{"decision":"approve","systemMessage":$msg}'
          exit 0
        fi
        # For "small_fix" or "none" - no suggestion, let prompt through
      fi
    fi
  fi
fi

# CRITICAL: Exit immediately for non-SpecWeave prompts
# This covers 90%+ of prompts with <5ms overhead
if ! echo "$PROMPT" | grep -qE "(specweave|/sw:|increment|add|create|implement|build|develop)"; then
  echo '{"decision":"approve"}'
  exit 0
fi

# ==============================================================================
# EARLY EXIT FOR NON-SPECWEAVE PROJECTS (T-006 - v0.26.15)
# ==============================================================================
# Even if prompt contains SpecWeave keywords, exit if no .specweave directory
SPECWEAVE_DIR=".specweave"
if [[ ! -d "$SPECWEAVE_DIR" ]]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# ==============================================================================
# INSTANT SCRIPT EXECUTION: Status commands bypass LLM entirely (v0.33.0)
# ==============================================================================
# These commands need NO LLM reasoning - execute scripts directly for <1s response
# Pattern: Detect command → Execute script → Return output via "block" → Exit

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PLUGIN_ROOT/scripts"

# Helper: Escape output for JSON (handles newlines, quotes, backslashes)
# Uses jq for proper JSON string escaping (required dependency for instant commands)
escape_json() {
  local input="$1"
  # jq -Rs properly escapes all special characters including newlines
  # We strip the surrounding quotes since we add them in the printf
  printf '%s' "$input" | jq -Rs '.' | sed 's/^"//; s/"$//'
}

# Helper: Check if running in VSCode extension
# VSCode sets CLAUDE_CODE_ENTRYPOINT=claude-vscode
# Returns 0 (true) if VSCode, 1 (false) if CLI
is_vscode() {
  [[ -n "${CLAUDE_CODE_ENTRYPOINT}" ]] && [[ "${CLAUDE_CODE_ENTRYPOINT}" == "claude-vscode" ]]
}

# Helper: Extract command line and args from multi-line prompt (v1.0.105+)
# When prompts contain IDE metadata (e.g., <ide_opened_file>...</ide_opened_file>)
# the command may be on a subsequent line. This function:
# 1. Finds the line containing the command
# 2. Extracts args from that specific line
# Usage: extract_command_args "PROMPT" "command_pattern" (e.g., "/sw:progress")
# Returns args on stdout, or empty string if no args
extract_command_args() {
  local prompt="$1"
  local cmd_pattern="$2"

  # Find the line containing the command and extract args from it
  # The grep -oE gets just the matching line, sed removes the command prefix
  local cmd_line
  cmd_line=$(echo "$prompt" | grep -E "^${cmd_pattern}($| )" | head -1)

  if [[ -n "$cmd_line" ]]; then
    # Remove the command pattern from the line to get args
    echo "$cmd_line" | sed "s|^${cmd_pattern}[[:space:]]*||"
  fi
}

# /sw:jobs → Execute read-jobs.sh (pure bash, ~2ms)
if echo "$PROMPT" | grep -qE "^/sw:jobs($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:jobs")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-jobs.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-jobs.sh" "$ARGS" 2>&1)
  elif [[ -f "$SCRIPTS_DIR/jobs.js" ]] && command -v node >/dev/null 2>&1; then
    OUTPUT=$(cd "$(pwd)" && node "$SCRIPTS_DIR/jobs.js" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No jobs script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# /sw:progress → Execute read-progress.sh (pure bash, ~30ms)
if echo "$PROMPT" | grep -qE "^/sw:progress($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:progress")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-progress.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-progress.sh" "$ARGS" 2>&1)
  elif [[ -f "$SCRIPTS_DIR/progress.js" ]] && command -v node >/dev/null 2>&1; then
    OUTPUT=$(cd "$(pwd)" && node "$SCRIPTS_DIR/progress.js" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No progress script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# /sw:status → Execute read-status.sh (pure bash, ~150ms)
if echo "$PROMPT" | grep -qE "^/sw:status($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:status")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-status.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-status.sh" "$ARGS" 2>&1)
  elif [[ -f "$SCRIPTS_DIR/status.js" ]] && command -v node >/dev/null 2>&1; then
    OUTPUT=$(cd "$(pwd)" && node "$SCRIPTS_DIR/status.js" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No status script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# /sw:workflow → Execute read-workflow.sh (pure bash, ~100ms)
if echo "$PROMPT" | grep -qE "^/sw:workflow($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:workflow")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-workflow.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-workflow.sh" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No workflow script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# /sw:costs → Execute read-costs.sh (pure bash, ~50ms)
if echo "$PROMPT" | grep -qE "^/sw:costs($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:costs")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-costs.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-costs.sh" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No costs script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# /sw:analytics → Execute read-analytics.sh (pure bash, ~50ms)
if echo "$PROMPT" | grep -qE "^/sw:analytics($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:analytics")

  # Execute command and get output
  if [[ -f "$SCRIPTS_DIR/read-analytics.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-analytics.sh" "$ARGS" 2>&1)
  else
    OUTPUT="❌ No analytics script available"
  fi

  # Unified response for both CLI and VSCode (v1.0.106)
  # FIXED: Use approve + systemMessage to display output WITHOUT blocking execution
  # "block" erases the command from context; we want to show info and continue
  OUTPUT_ESCAPED=$(escape_json "$OUTPUT")
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$OUTPUT_ESCAPED"
  exit 0
fi

# ==============================================================================
# TASK COUNT GUARD: Block /sw:do for oversized increments (v0.32.2+)
# ==============================================================================
# >8 tasks = context explosion = CRASH (per CLAUDE.md)
MAX_TASKS=8

if echo "$PROMPT" | grep -qE "^/sw:do($| )"; then
  # Extract increment ID from prompt
  DO_INCREMENT_ID=$(echo "$PROMPT" | grep -oE "[0-9]{4}[a-zA-Z0-9-]*" | head -1)

  # If no ID provided, find active increment
  if [[ -z "$DO_INCREMENT_ID" ]]; then
    for meta in "$SPECWEAVE_DIR/increments"/*/metadata.json; do
      [[ -f "$meta" ]] || continue
      if command -v jq >/dev/null 2>&1; then
        status=$(jq -r '.status // "unknown"' "$meta" 2>/dev/null)
      else
        status=$(grep -oP '"status"\s*:\s*"\K[^"]*' "$meta" 2>/dev/null || echo "unknown")
      fi
      if [[ "$status" == "active" || "$status" == "planning" || "$status" == "backlog" || "$status" == "ready_for_review" ]]; then
        DO_INCREMENT_ID=$(basename "$(dirname "$meta")")
        break
      fi
    done
  fi

  if [[ -n "$DO_INCREMENT_ID" ]]; then
    TASKS_FILE="$SPECWEAVE_DIR/increments/$DO_INCREMENT_ID/tasks.md"
    if [[ -f "$TASKS_FILE" ]]; then
      TASK_COUNT=$(grep -c "^### T-" "$TASKS_FILE" 2>/dev/null || echo "0")
      if [[ "$TASK_COUNT" -gt "$MAX_TASKS" ]]; then
        printf '{"decision":"block","reason":"❌ TASK COUNT EXCEEDS LIMIT\\n\\nIncrement %s has %s tasks (maximum: %s)\\n\\n>8 tasks = context explosion = CRASH\\n\\n💡 REQUIRED: Split into smaller increments:\\n\\n  Pattern: %s/ → Split into:\\n    • %s-part1/ (T-001 to T-004)\\n    • Next increment (T-005 to T-008)\\n    • Next increment (T-009+)\\n\\n⚠️ DO NOT PROCEED until tasks.md has ≤8 tasks!"}\n' "$DO_INCREMENT_ID" "$TASK_COUNT" "$MAX_TASKS" "$DO_INCREMENT_ID" "$DO_INCREMENT_ID"
        exit 0
      fi
    fi
  fi
fi

# ==============================================================================
# CACHED ACTIVE INCREMENT DETECTION (ONCE - reused throughout!)
# ==============================================================================
ACTIVE_INCREMENT=""
ACTIVE_COUNT=0
ACTIVE_LIST=""

if [[ -d "$SPECWEAVE_DIR/increments" ]]; then
  # Single find + jq pass to get ALL active increment info
  while IFS= read -r metadata_file; do
    [[ -z "$metadata_file" ]] && continue

    # Use jq (fast) to extract status and id
    if command -v jq >/dev/null 2>&1; then
      read -r status inc_type < <(jq -r '"\(.status // "unknown") \(.type // "feature")"' "$metadata_file" 2>/dev/null || echo "unknown feature")
    else
      # Fallback: grep (no node!)
      status=$(grep -oP '"status"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "unknown")
      inc_type=$(grep -oP '"type"\s*:\s*"\K[^"]*' "$metadata_file" 2>/dev/null || echo "feature")
    fi

    if [[ "$status" == "active" || "$status" == "planning" || "$status" == "backlog" || "$status" == "ready_for_review" ]]; then
      inc_id=$(basename "$(dirname "$metadata_file")")
      ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
      ACTIVE_LIST="${ACTIVE_LIST}  - $inc_id [$inc_type]\n"
      [[ -z "$ACTIVE_INCREMENT" ]] && ACTIVE_INCREMENT="$inc_id"
    fi
  done < <(find "$SPECWEAVE_DIR/increments" -maxdepth 2 -name "metadata.json" -not -path "*/_archive/*" 2>/dev/null)
fi

# ==============================================================================
# DISCIPLINE VALIDATION: Warn about WIP limits (configurable, not hard block!)
# ==============================================================================

# ==============================================================================
# PROJECT CONTEXT + WIP LIMITS FOR /sw:increment (v0.34.0)
# ==============================================================================
# CRITICAL: Inject project/board context BEFORE Claude generates spec.md
# This ensures Claude knows available projects and uses correct IDs
# ALSO: Check WIP limits in same block to avoid duplicate command detection

if echo "$PROMPT" | grep -qE "^/sw:increment"; then
  # Get project context (uses specweave CLI if available)
  PROJECT_CONTEXT=""

  if command -v specweave >/dev/null 2>&1; then
    # Use CLI for accurate project/board detection
    CONTEXT_JSON=$(specweave context projects 2>/dev/null || echo '{}')

    # Validate JSON before parsing (defensive coding)
    if [[ -n "$CONTEXT_JSON" ]] && [[ "$CONTEXT_JSON" != "{}" ]]; then
      if command -v jq >/dev/null 2>&1; then
        # Verify JSON is parseable before extracting fields
        if ! echo "$CONTEXT_JSON" | jq empty 2>/dev/null; then
          CONTEXT_JSON='{}'  # Invalid JSON - reset to empty
        fi
      fi
    fi

    if [[ -n "$CONTEXT_JSON" ]] && [[ "$CONTEXT_JSON" != "{}" ]]; then
      # Parse JSON with jq
      if command -v jq >/dev/null 2>&1; then
        LEVEL=$(echo "$CONTEXT_JSON" | jq -r '.level // 1')
        PROJECTS=$(echo "$CONTEXT_JSON" | jq -r '.projects | map(.id) | join(", ")' 2>/dev/null || echo "")

        if [[ "$LEVEL" == "2" ]]; then
          # 2-level structure: include boards
          BOARDS_JSON=$(echo "$CONTEXT_JSON" | jq -r '.boardsByProject // {}' 2>/dev/null)
          if [[ -n "$BOARDS_JSON" ]] && [[ "$BOARDS_JSON" != "{}" ]]; then
            PROJECT_CONTEXT="\\n\\n📦 PROJECT CONTEXT (2-LEVEL STRUCTURE)\\n\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}⚠️ MANDATORY: Each User Story MUST have both:\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}  - **Project**: <project_id>\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}  - **Board**: <board_id>\\n\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}Available projects: ${PROJECTS}\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}Boards by project:\\n"

            # Format boards
            for proj in $(echo "$CONTEXT_JSON" | jq -r '.projects[].id' 2>/dev/null); do
              PROJ_BOARDS=$(echo "$CONTEXT_JSON" | jq -r ".boardsByProject[\"$proj\"] | map(.id) | join(\", \")" 2>/dev/null || echo "")
              [[ -n "$PROJ_BOARDS" ]] && PROJECT_CONTEXT="${PROJECT_CONTEXT}  - ${proj}: ${PROJ_BOARDS}\\n"
            done

            PROJECT_CONTEXT="${PROJECT_CONTEXT}\\n❌ FORBIDDEN: Comma-separated values (e.g., **Project**: fe, be)\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}✅ REQUIRED: One project + one board per User Story"
          fi
        elif [[ -n "$PROJECTS" ]]; then
          # 1-level structure: projects only
          PROJECT_COUNT=$(echo "$CONTEXT_JSON" | jq '.projects | length' 2>/dev/null || echo "0")

          if [[ "$PROJECT_COUNT" -gt 1 ]]; then
            PROJECT_CONTEXT="\\n\\n📦 PROJECT CONTEXT (MULTI-PROJECT)\\n\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}⚠️ MANDATORY: Each User Story MUST have:\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}  - **Project**: <project_id>\\n\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}Available projects: ${PROJECTS}\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}\\n❌ FORBIDDEN: Comma-separated values\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}✅ REQUIRED: One project per User Story"
          elif [[ "$PROJECT_COUNT" -eq 1 ]]; then
            # Single project: auto-select
            SINGLE_PROJECT=$(echo "$CONTEXT_JSON" | jq -r '.projects[0].id' 2>/dev/null)
            PROJECT_CONTEXT="\\n\\n📦 PROJECT CONTEXT\\n"
            PROJECT_CONTEXT="${PROJECT_CONTEXT}Single project detected: ${SINGLE_PROJECT} (auto-selected)"
          fi
        fi
      fi
    fi
  else
    # Fallback: Check for multi-project folders
    if [[ -d "$SPECWEAVE_DIR/docs/internal/specs" ]]; then
      PROJ_COUNT=$(find "$SPECWEAVE_DIR/docs/internal/specs" -maxdepth 1 -type d | wc -l)
      if [[ "$PROJ_COUNT" -gt 2 ]]; then
        PROJ_LIST=$(ls -1 "$SPECWEAVE_DIR/docs/internal/specs" 2>/dev/null | grep -v "_" | tr '\n' ', ' | sed 's/,$//')
        PROJECT_CONTEXT="\\n\\n📦 PROJECT CONTEXT (MULTI-PROJECT)\\n"
        PROJECT_CONTEXT="${PROJECT_CONTEXT}⚠️ MANDATORY: Each User Story MUST have **Project**: field\\n"
        PROJECT_CONTEXT="${PROJECT_CONTEXT}Available folders: ${PROJ_LIST}"
      fi
    fi
  fi

  # WIP LIMITS CHECK (inside same block - no duplicate command detection)
  # Read limits from config.json (respect user's settings!)
  CONFIG_FILE="$SPECWEAVE_DIR/config.json"
  SOFT_LIMIT=1
  HARD_CAP=3

  if [[ -f "$CONFIG_FILE" ]]; then
    if command -v jq >/dev/null 2>&1; then
      SOFT_LIMIT=$(jq -r '.limits.maxActiveIncrements // 1' "$CONFIG_FILE" 2>/dev/null || echo "1")
      HARD_CAP=$(jq -r '.limits.hardCap // 3' "$CONFIG_FILE" 2>/dev/null || echo "3")
    else
      SOFT_LIMIT=$(grep -oP '"maxActiveIncrements"\s*:\s*\K[0-9]+' "$CONFIG_FILE" 2>/dev/null || echo "1")
      HARD_CAP=$(grep -oP '"hardCap"\s*:\s*\K[0-9]+' "$CONFIG_FILE" 2>/dev/null || echo "3")
    fi
  fi

  # Ensure valid numbers
  [[ ! "$SOFT_LIMIT" =~ ^[0-9]+$ ]] && SOFT_LIMIT=1
  [[ ! "$HARD_CAP" =~ ^[0-9]+$ ]] && HARD_CAP=3

  # Above hard cap: strong warning but NOT a block (user decides!)
  if [[ "$ACTIVE_COUNT" -ge "$HARD_CAP" ]]; then
    WIP_MSG="⚠️  WIP LIMIT EXCEEDED (${ACTIVE_COUNT}/${HARD_CAP})\\n\\nYou have ${ACTIVE_COUNT} active increments (configured maximum: ${HARD_CAP})\\n\\nActive increments:\\n${ACTIVE_LIST}\\n\\n🧠 Research shows 3+ concurrent tasks = 40%% slower + more bugs\\n\\n💡 Options:\\n  1️⃣  Complete an increment: /sw:done <id>\\n  2️⃣  Pause an increment: /sw:pause <id>\\n  3️⃣  Increase limit: Edit .specweave/config.json limits.hardCap\\n  4️⃣  Continue anyway (not recommended)\\n\\n📝 To proceed anyway, just confirm your intent."
    # Prepend project context if available
    if [[ -n "$PROJECT_CONTEXT" ]]; then
      printf '{"decision":"approve","systemMessage":"%s%s"}\n' "$PROJECT_CONTEXT" "$WIP_MSG"
    else
      printf '{"decision":"approve","systemMessage":"%s"}\n' "$WIP_MSG"
    fi
    exit 0
  fi

  # At soft limit: mild warning, approve
  if [[ "$ACTIVE_COUNT" -ge "$SOFT_LIMIT" ]]; then
    WIP_MSG="⚠️  WIP LIMIT REACHED (${ACTIVE_COUNT}/${SOFT_LIMIT})\\n\\nYou have ${ACTIVE_COUNT} active increment(s) (recommended limit: ${SOFT_LIMIT})\\n\\nActive increments:\\n${ACTIVE_LIST}\\n\\n🧠 Focus Principle: Fewer active increments = maximum productivity\\n\\n💡 Consider:\\n  1️⃣  Complete current work (recommended)\\n  2️⃣  Pause current work (/sw:pause)\\n  3️⃣  Continue anyway\\n\\n⚠️  Emergency hotfix/bug? Use --type=hotfix or --type=bug"
    # Prepend project context if available
    if [[ -n "$PROJECT_CONTEXT" ]]; then
      printf '{"decision":"approve","systemMessage":"%s%s"}\n' "$PROJECT_CONTEXT" "$WIP_MSG"
    else
      printf '{"decision":"approve","systemMessage":"%s"}\n' "$WIP_MSG"
    fi
    exit 0
  fi

  # No WIP limit warning, but we may have project context to inject
  if [[ -n "$PROJECT_CONTEXT" ]]; then
    printf '{"decision":"approve","systemMessage":"%s"}\n' "$PROJECT_CONTEXT"
    exit 0
  fi
fi

# ==============================================================================
# PRE-FLIGHT SYNC CHECK (LIGHTWEIGHT - uses cached ACTIVE_INCREMENT)
# ==============================================================================

# Detect increment operations that need fresh data
if echo "$PROMPT" | grep -qE "/(specweave:)?(done|validate|progress|do)"; then
  # Extract increment ID from prompt OR use cached active
  INCREMENT_ID=$(echo "$PROMPT" | grep -oE "[0-9]{4}[a-z0-9-]*" | head -1)
  [[ -z "$INCREMENT_ID" ]] && INCREMENT_ID="$ACTIVE_INCREMENT"

  # If we have an increment ID, check freshness (pure bash - no node!)
  if [[ -n "$INCREMENT_ID" ]]; then
    INCREMENT_SPEC="$SPECWEAVE_DIR/increments/$INCREMENT_ID/spec.md"
    LIVING_DOCS_SPEC="$SPECWEAVE_DIR/docs/internal/specs/spec-$INCREMENT_ID.md"

    if [[ -f "$INCREMENT_SPEC" ]]; then
      # Use find -newer for mtime comparison (single syscall!)
      if [[ ! -f "$LIVING_DOCS_SPEC" ]] || [[ -n $(find "$INCREMENT_SPEC" -newer "$LIVING_DOCS_SPEC" 2>/dev/null) ]]; then
        # Sync needed - run async (non-blocking!)
        PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
        SYNC_SCRIPT="$PLUGIN_ROOT/lib/hooks/sync-living-docs.js"
        [[ -f "$SYNC_SCRIPT" ]] && node "$SYNC_SCRIPT" "$INCREMENT_ID" >/dev/null 2>&1 &
      fi
    fi
  fi
fi

# ==============================================================================
# SPEC SYNC CHECK (LIGHTWEIGHT - only when really needed)
# ==============================================================================
# Skip SpecSyncManager for most prompts - it's HEAVY!
# Only check on explicit sync-related commands

if [[ -n "$ACTIVE_INCREMENT" ]] && echo "$PROMPT" | grep -qE "/(specweave:)?(sync|done)"; then
  # Simple mtime check: spec.md vs plan.md (pure bash!)
  SPEC_FILE="$SPECWEAVE_DIR/increments/$ACTIVE_INCREMENT/spec.md"
  PLAN_FILE="$SPECWEAVE_DIR/increments/$ACTIVE_INCREMENT/plan.md"

  if [[ -f "$SPEC_FILE" ]] && [[ -f "$PLAN_FILE" ]]; then
    # Check if spec is newer than plan (indicates spec changes need sync)
    if [[ -n $(find "$SPEC_FILE" -newer "$PLAN_FILE" 2>/dev/null) ]]; then
      printf '{"decision":"approve","systemMessage":"⚠️ Spec changes detected in %s\\n\\nspec.md has been modified after plan.md.\\nConsider running /sw:sync-docs to update living documentation."}\n' "$ACTIVE_INCREMENT"
      exit 0
    fi
  fi
fi

# ==============================================================================
# CONTEXT INJECTION (uses cached ACTIVE_INCREMENT - no more find loops!)
# ==============================================================================

CONTEXT=""

if [[ -n "$ACTIVE_INCREMENT" ]]; then
  # Read from status-line.json cache (single source of truth)
  CACHE_FILE="$SPECWEAVE_DIR/state/status-line.json"

  if [[ -f "$CACHE_FILE" ]]; then
    # Single jq call for all values (or pure bash fallback)
    if command -v jq >/dev/null 2>&1; then
      read -r TOTAL_TASKS COMPLETED_TASKS TOTAL_ACS COMPLETED_ACS < <(
        jq -r '[.current.total // 0, .current.completed // 0, .current.acsTotal // 0, .current.acsCompleted // 0] | @tsv' "$CACHE_FILE" 2>/dev/null || echo "0 0 0 0"
      )
    else
      # Pure grep fallback (no node!)
      TOTAL_TASKS=$(grep -oP '"total"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null | head -1 || echo "0")
      COMPLETED_TASKS=$(grep -oP '"completed"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null | head -1 || echo "0")
      TOTAL_ACS=$(grep -oP '"acsTotal"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null || echo "0")
      COMPLETED_ACS=$(grep -oP '"acsCompleted"\s*:\s*\K[0-9]+' "$CACHE_FILE" 2>/dev/null || echo "0")
    fi

    # Ensure valid numbers
    TOTAL_TASKS=${TOTAL_TASKS:-0}
    COMPLETED_TASKS=${COMPLETED_TASKS:-0}
    TOTAL_ACS=${TOTAL_ACS:-0}
    COMPLETED_ACS=${COMPLETED_ACS:-0}

    if [[ "$TOTAL_TASKS" -gt 0 ]] 2>/dev/null; then
      PERCENTAGE=$(( COMPLETED_TASKS * 100 / TOTAL_TASKS ))

      if [[ "$TOTAL_ACS" -gt 0 ]] 2>/dev/null; then
        AC_PERCENTAGE=$(( COMPLETED_ACS * 100 / TOTAL_ACS ))
        CONTEXT="✓ Active: $ACTIVE_INCREMENT ($COMPLETED_TASKS/$TOTAL_TASKS tasks, $PERCENTAGE% | $COMPLETED_ACS/$TOTAL_ACS ACs, $AC_PERCENTAGE%)"
      else
        CONTEXT="✓ Active: $ACTIVE_INCREMENT ($COMPLETED_TASKS/$TOTAL_TASKS tasks, $PERCENTAGE%)"
      fi
    else
      CONTEXT="✓ Active: $ACTIVE_INCREMENT"
    fi
  else
    CONTEXT="✓ Active: $ACTIVE_INCREMENT"
  fi
fi

# ==============================================================================
# COMMAND SUGGESTIONS: Guide users to structured workflow
# ==============================================================================

if echo "$PROMPT" | grep -qiE "(add|create|implement|build|develop)" && ! echo "$PROMPT" | grep -q "/sw:"; then
  if [[ -n "$CONTEXT" ]]; then
    CONTEXT="$CONTEXT

💡 TIP: Consider using SpecWeave commands for structured development:
  - /sw:increment \"feature name\"  # Plan new increment
  - /sw:do                         # Execute current tasks
  - /sw:progress                   # Check progress"
  fi
fi

# ==============================================================================
# STATUS LINE REFRESH (v0.26.13 - CONDITIONAL + ASYNC)
# ==============================================================================
# Only refresh when we have an active increment (skip for most prompts)
# Runs in background to avoid blocking user prompt

if [[ -n "$ACTIVE_INCREMENT" ]] && [[ -d "$SPECWEAVE_DIR" ]]; then
  HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # Run async (non-blocking!) - update-status-line.sh has its own TTL/mtime guards
  bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null &
fi

# ==============================================================================
# ANALYTICS TRACKING: Track /sw:* command invocations (v0.35.0+)
# ==============================================================================
# Non-blocking, runs in background. Tracks command usage for /sw:analytics.

if echo "$PROMPT" | grep -qE "^/sw:[a-z]"; then
  COMMAND_NAME=$(echo "$PROMPT" | grep -oE "^/sw:[a-z0-9:-]+" | head -1)
  if [[ -n "$COMMAND_NAME" ]] && [[ -f "$SCRIPTS_DIR/track-analytics.sh" ]]; then
    bash "$SCRIPTS_DIR/track-analytics.sh" command "$COMMAND_NAME" --plugin specweave --increment "$ACTIVE_INCREMENT" 2>/dev/null &
  fi
fi

# ==============================================================================
# OUTPUT: Approve with context or no context
# ==============================================================================

if [[ -n "$CONTEXT" ]]; then
  # Escape context for JSON (newlines, quotes)
  CONTEXT_ESCAPED=$(echo "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
  printf '{"decision":"approve","systemMessage":"%s"}\n' "$CONTEXT_ESCAPED"
else
  echo '{"decision":"approve"}'
fi

exit 0
