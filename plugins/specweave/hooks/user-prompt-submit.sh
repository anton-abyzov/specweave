#!/bin/bash

# SpecWeave UserPromptSubmit Hook (v1.0.235 - Project-Scope Initialization Guard)
# Fires BEFORE user's command executes (prompt-based hook)
# Purpose: Auto-load plugins, discipline validation, context injection, instant command execution
#
# FEATURES:
# - v1.0.201: LSP CLI FALLBACK INSTRUCTIONS - When LSP requested, instruct Claude to use
#   `specweave lsp` commands instead of Grep. These use TsServerClient for REAL semantic
#   analysis. Key fix: "find references" now gets semantic refs, not text matches!
# - v1.0.198: UNIFIED LLM LSP DETECTION - LLM decides if LSP is needed (replaces grep patterns)
#   * Single detect-intent call now returns: plugins + increment + skills + LSP recommendation
#   * LLM-based detection understands context ("find references to X" vs general coding)
#   * Returns: lsp.needed, lsp.operation (references/definition/hover/symbols), lsp.language
#   * Grep-based detection kept as fallback if LLM detection not available
#   * Key insight: LLM can distinguish "find references" request from "build feature" request
# - v1.0.192: LSP AUTO-INSTALL ON PROJECT DETECTION - Critical fix for LSP plugin installation
#   * Previously: LSP plugins only installed when user explicitly asked for "find references"
#   * Now: LSP plugins auto-installed when working on TS/Py/Rust projects
#   * Project detection: tsconfig.json, package.json, requirements.txt, Cargo.toml, etc.
#   * Prompt detection: mentions of typescript, react, python, django, rust, etc.
#   * Supported: vtsls (TS), pyright (Python), rust-analyzer (Rust)
#   * Key insight: Users shouldn't need to know about LSP to benefit from it
# - v1.0.177: SKILL CHAINING REMINDER - Add explicit guidance in SKILL FIRST message
#   * "SKILL FIRST" does NOT mean "only one skill"
#   * Shows domain skills to use after sw:increment
#   * Points to CLAUDE.md "MANDATORY: Skill Chaining" section
# - v1.0.175: CRITICAL FIX - Use installed_plugins.json as SOURCE OF TRUTH
#   * Reads ~/.claude/plugins/installed_plugins.json directly (eliminates false restart warnings)
#   * `claude plugin list` can have timing/buffering issues → unreliable for detection
#   * Primary: check_plugin_installed_from_json() using jq (fast, accurate)
#   * Fallback: `claude plugin list` only if jq unavailable
#   * Post-install verification: re-checks registry after install to confirm success
#   * Increased timeouts: 5s → 10s for CLI operations (reduces timing issues)
#   * Guard against false positives: if install says "success" but not in registry → treat as already installed
# - v1.0.169: DIRECT SKILL INVOCATION - Call sw:increment skill directly
#   * Originally skipped wrapper indirection; increment-planner merged into increment in v1.0.261
#   * Passes FULL user prompt as args (not just extracted name)
#   * Uses <system><rules> tags (Claude-trained) instead of custom <mandatory_instruction>
#   * More concise, imperative instruction text
# - v1.0.167: FIX PLUGIN RESTART WARNING - Use `claude plugin list` BEFORE install (DEPRECATED - had timing issues)
#   * Claude CLI always outputs "Successfully installed" even when already installed
#   * Called `claude plugin list` once to get current plugins, then checked against that
#   * Skipped install for already-installed plugins (faster + no false restart warnings)
#   * ISSUE: `claude plugin list` output unreliable → false positives → fixed in v1.0.175
# - v1.0.147: SYNC PLUGIN INSTALL - Plugins available for CURRENT prompt!
#   * Replaced 20s async LLM detection with ~200ms sync `claude plugin install`
#   * Claude Code hot-reload picks up plugins immediately
#   * Keywords: react, vue, kubernetes, docker, terraform, github, jira, etc.
#   * Controlled by SPECWEAVE_DISABLE_AUTO_LOAD env var
# - v1.0.127: (DEPRECATED) Background async plugin detection - too slow, plugins only for next prompt
# - v1.0.166: CRITICAL FIX - Use hookSpecificOutput.additionalContext (NOT systemMessage!)
#   * Claude Code ignores systemMessage field in UserPromptSubmit hooks
#   * Use {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}
#   * See: https://docs.claude.com/en/docs/claude-code/hooks
# - v1.0.106: Use approve decision for info commands (not block)
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
# - Use hookSpecificOutput.additionalContext for UserPromptSubmit (systemMessage is ignored!)
# - See output_approve_with_context() helper function

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
# PROJECT-SCOPE INITIALIZATION GUARD (v1.0.235)
# ==============================================================================
# Prevents SpecWeave skills from running in non-initialized projects.
# Provides user-friendly prompt to initialize or disable plugins.
#
# Control:
# - SPECWEAVE_DISABLE_GUARD=1 environment variable
# - guard.enabled: false in .specweave/config.json
#
# Why: Skills are globally visible due to Claude Code's plugin system,
# but they require project-specific initialization to work correctly.

# Helper function: Find .specweave/config.json by walking up directory tree
find_specweave_config() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.specweave/config.json" ]]; then
      # Validate it's valid JSON
      if command -v jq >/dev/null 2>&1; then
        if jq empty "$dir/.specweave/config.json" 2>/dev/null; then
          echo "$dir/.specweave/config.json"
          return 0
        fi
      else
        # No jq available - assume valid if file exists
        echo "$dir/.specweave/config.json"
        return 0
      fi
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

# Check if this is a SpecWeave skill invocation
if [[ "$PROMPT" =~ ^[[:space:]]*/[Ss][Ww](-[a-zA-Z0-9-]+)?:[a-zA-Z-]+ ]]; then
  # Check if guard is disabled via environment variable
  if [[ "${SPECWEAVE_DISABLE_GUARD:-0}" != "1" ]]; then
    # Check if project is initialized (walk up tree to find .specweave/config.json)
    FOUND_CONFIG=$(find_specweave_config)
    if [[ -z "$FOUND_CONFIG" ]]; then
      # Check if guard is disabled in config (would fail since no config exists yet)
      # Extract skill name for error message
      SKILL_NAME=$(echo "$PROMPT" | grep -oP '^[[:space:]]*/[Ss][Ww](-[a-zA-Z0-9-]+)?:[a-zA-Z-]+' | tr '[:upper:]' '[:lower:]')

      # Generate helpful error message
      cat <<EOF
{
  "decision": "block",
  "reason": "⚠️ **SpecWeave Not Initialized**

You invoked \`${SKILL_NAME}\`, but this project hasn't been initialized with SpecWeave yet.

**Options:**

1. **Initialize SpecWeave in this project:**
   \`\`\`bash
   specweave init
   # or
   npx specweave init
   \`\`\`

2. **Use SpecWeave in a different directory:**
   Navigate to a SpecWeave project first:
   \`\`\`bash
   cd /path/to/your/specweave-project
   \`\`\`

3. **Disable SpecWeave plugins globally:**
   If you don't need SpecWeave in most projects, disable it in:
   \`~/.claude/settings.json\`
   \`\`\`json
   {
     \"enabledPlugins\": {
       \"sw@specweave\": false,
       \"sw-frontend@specweave\": false
     }
   }
   \`\`\`

4. **Disable this guard (not recommended):**
   \`\`\`bash
   export SPECWEAVE_DISABLE_GUARD=1
   \`\`\`

**Note:** SpecWeave skills are globally installed but require project-specific initialization to work correctly."
}
EOF
      exit 0
    fi

    # Check if guard is disabled in config (using found config path)
    if command -v jq >/dev/null 2>&1; then
      GUARD_ENABLED=$(jq -r '.guard.enabled // true' "$FOUND_CONFIG" 2>/dev/null)
      if [[ "$GUARD_ENABLED" == "false" ]]; then
        # Guard disabled in config - allow through
        :
      fi
    fi
  fi
fi

# ==============================================================================
# PROJECT ROOT DETECTION (walk up to find .specweave/config.json)
# ==============================================================================
# MUST run BEFORE any code that uses SW_PROJECT_ROOT (scope guard, logging, etc.)
# Checks for config.json to distinguish real projects from stale folders.
SW_PROJECT_ROOT=""
_swdir="$PWD"
while [[ "$_swdir" != "/" ]]; do
  if [[ -f "$_swdir/.specweave/config.json" ]]; then
    SW_PROJECT_ROOT="$_swdir"
    break
  fi
  _swdir=$(dirname "$_swdir")
done

# ==============================================================================
# USER-LEVEL PLUGIN SCOPE GUARD (v1.0.249)
# ==============================================================================
# Prevents SpecWeave domain plugins (sw-*) and LSP plugins (*-lsp) from
# polluting ~/.claude/settings.json (user scope). These should ALWAYS be
# project-scoped (.claude/settings.json) to avoid leaking across projects.
#
# Sources of user-level pollution:
# - Claude Code's own plugin discovery (installs at user scope by default)
# - Older SpecWeave versions (pre-v1.0.210) that didn't enforce project scope
# - Manual `claude plugin install` without --scope flag
#
# What this guard does:
# 1. Reads installed plugins via `claude plugin list` (fast, <200ms)
# 2. Identifies sw-*@specweave or *-lsp@* at user scope
# 3. Uninstalls from user scope and reinstalls at project scope
# 4. Uses a daily marker file to avoid running on every prompt
#
# Rate limit: runs at most once per day per project (marker in .specweave/state/)
# GUARD: Only run if inside a valid SpecWeave project (prevents stale folder creation)
SCOPE_GUARD_RUN=false
SCOPE_GUARD_MARKER=""

if [[ -n "$SW_PROJECT_ROOT" ]]; then
  SCOPE_GUARD_MARKER="$SW_PROJECT_ROOT/.specweave/state/scope-guard.marker"

  if [[ -f "$SCOPE_GUARD_MARKER" ]]; then
    # Check if marker is from today (skip if already ran today)
    MARKER_DATE=$(cat "$SCOPE_GUARD_MARKER" 2>/dev/null)
    TODAY=$(date +%Y-%m-%d)
    [[ "$MARKER_DATE" != "$TODAY" ]] && SCOPE_GUARD_RUN=true
  else
    SCOPE_GUARD_RUN=true
  fi
fi

if [[ "$SCOPE_GUARD_RUN" == "true" ]] && command -v jq >/dev/null 2>&1 && command -v claude >/dev/null 2>&1; then
  USER_SETTINGS="$HOME/.claude/settings.json"

  if [[ -f "$USER_SETTINGS" ]]; then
    # Find SpecWeave domain plugins and LSP plugins at user level
    # Exempt: sw@specweave (core plugin, intentionally user-scoped)
    POLLUTED_PLUGINS=$(jq -r '
      .enabledPlugins // {} | to_entries[]
      | select(
          (.key | test("^sw-.*@specweave$")) or
          (.key | test("-lsp@"))
        )
      | .key
    ' "$USER_SETTINGS" 2>/dev/null)

    if [[ -n "$POLLUTED_PLUGINS" ]]; then
      MIGRATED=""
      for plugin_key in $POLLUTED_PLUGINS; do
        # Uninstall from user scope, reinstall at project scope
        if timeout 5 claude plugin uninstall "$plugin_key" >/dev/null 2>&1; then
          if timeout 10 claude plugin install "$plugin_key" --scope project >/dev/null 2>&1; then
            [[ -n "$MIGRATED" ]] && MIGRATED="$MIGRATED, "
            MIGRATED="${MIGRATED}${plugin_key}"
          fi
        fi
      done

      if [[ -n "$MIGRATED" ]]; then
        echo "[$(date -Iseconds)] scope-guard | migrated user→project: $MIGRATED" >> "$SW_PROJECT_ROOT/.specweave/state/hook.log" 2>/dev/null || true
      fi

      # CRITICAL FIX: Restore sw@specweave enabled state after uninstall operations
      # The `claude plugin uninstall` commands above may corrupt ~/.claude/settings.json
      # and disable sw@specweave as collateral damage. Re-enable it explicitly.
      if [[ -f "$USER_SETTINGS" ]]; then
        SW_ENABLED=$(jq -r '.enabledPlugins."sw@specweave" // "not_set"' "$USER_SETTINGS" 2>/dev/null)
        if [[ "$SW_ENABLED" != "true" ]]; then
          # Re-enable core plugin (preserves all other settings)
          jq '.enabledPlugins."sw@specweave" = true' "$USER_SETTINGS" > "${USER_SETTINGS}.tmp" 2>/dev/null && \
            mv "${USER_SETTINGS}.tmp" "$USER_SETTINGS" 2>/dev/null || true
          echo "[$(date -Iseconds)] scope-guard | restored sw@specweave enabled state" >> "$SW_PROJECT_ROOT/.specweave/state/hook.log" 2>/dev/null || true
        fi
      fi
    fi
  fi

  # Write today's marker
  mkdir -p "$(dirname "$SCOPE_GUARD_MARKER")" 2>/dev/null
  date +%Y-%m-%d > "$SCOPE_GUARD_MARKER" 2>/dev/null || true
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

# PROJECT ROOT DETECTION was moved earlier (before scope guard) to prevent stale folder creation

# Check config for pluginAutoLoad.enabled, suggestOnly and incrementAssist.enabled settings
PLUGIN_AUTOLOAD_ENABLED=true
PLUGIN_SUGGEST_ONLY=false
INCREMENT_ASSIST_ENABLED=true
INCREMENT_CONFIDENCE_THRESHOLD=0.7
INCREMENT_MANDATORY_CONFIG=true
DEEP_INTERVIEW_ENABLED=false
if [[ -n "$SW_PROJECT_ROOT" ]]; then
  CONFIG_PATH="$SW_PROJECT_ROOT/.specweave/config.json"
else
  CONFIG_PATH=".specweave/config.json"
fi
if [[ -f "$CONFIG_PATH" ]]; then
  if command -v jq >/dev/null 2>&1; then
    AUTOLOAD_VALUE=$(jq -r '.pluginAutoLoad.enabled // true' "$CONFIG_PATH" 2>/dev/null)
    [[ "$AUTOLOAD_VALUE" == "false" ]] && PLUGIN_AUTOLOAD_ENABLED=false

    # Check suggestOnly mode (v1.0.158)
    SUGGEST_VALUE=$(jq -r '.pluginAutoLoad.suggestOnly // false' "$CONFIG_PATH" 2>/dev/null)
    [[ "$SUGGEST_VALUE" == "true" ]] && PLUGIN_SUGGEST_ONLY=true

    INCREMENT_VALUE=$(jq -r '.incrementAssist.enabled // true' "$CONFIG_PATH" 2>/dev/null)
    [[ "$INCREMENT_VALUE" == "false" ]] && INCREMENT_ASSIST_ENABLED=false

    THRESHOLD_VALUE=$(jq -r '.incrementAssist.confidenceThreshold // 0.7' "$CONFIG_PATH" 2>/dev/null)
    [[ "$THRESHOLD_VALUE" =~ ^[0-9.]+$ ]] && INCREMENT_CONFIDENCE_THRESHOLD="$THRESHOLD_VALUE"

    # Read incrementAssist.mandatory from config (config-based override for blocking)
    MANDATORY_CONFIG_VALUE=$(jq -r '.incrementAssist.mandatory // true' "$CONFIG_PATH" 2>/dev/null)
    [[ "$MANDATORY_CONFIG_VALUE" == "false" ]] && INCREMENT_MANDATORY_CONFIG=false

    # Deep Interview Mode detection (v1.0.195)
    DEEP_INTERVIEW_VALUE=$(jq -r '.planning.deepInterview.enabled // false' "$CONFIG_PATH" 2>/dev/null)
    [[ "$DEEP_INTERVIEW_VALUE" == "true" ]] && DEEP_INTERVIEW_ENABLED=true
  else
    # Fallback: grep for explicit false settings
    if grep -q '"pluginAutoLoad"' "$CONFIG_PATH" 2>/dev/null && grep -q '"enabled"[[:space:]]*:[[:space:]]*false' "$CONFIG_PATH" 2>/dev/null; then
      PLUGIN_AUTOLOAD_ENABLED=false
    fi
    # Fallback: grep for suggestOnly
    if grep -q '"pluginAutoLoad"' "$CONFIG_PATH" 2>/dev/null && grep -A5 '"pluginAutoLoad"' "$CONFIG_PATH" 2>/dev/null | grep -q '"suggestOnly"[[:space:]]*:[[:space:]]*true'; then
      PLUGIN_SUGGEST_ONLY=true
    fi
    if grep -q '"incrementAssist"' "$CONFIG_PATH" 2>/dev/null && grep -A5 '"incrementAssist"' "$CONFIG_PATH" 2>/dev/null | grep -q '"enabled"[[:space:]]*:[[:space:]]*false'; then
      INCREMENT_ASSIST_ENABLED=false
    fi
    # Fallback: grep for deep interview mode
    if grep -q '"deepInterview"' "$CONFIG_PATH" 2>/dev/null && grep -A5 '"deepInterview"' "$CONFIG_PATH" 2>/dev/null | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
      DEEP_INTERVIEW_ENABLED=true
    fi
  fi
fi

# ==============================================================================
# HELPER FUNCTIONS (must be defined before use)
# ==============================================================================

# Helper: Escape output for JSON (handles newlines, quotes, backslashes)
escape_json_early() {
  local input="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -Rs '.' | sed 's/^"//; s/"$//'
  else
    # Fallback: basic escaping without jq
    printf '%s' "$input" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//'
  fi
}

# v1.0.254: Prompt safety limits to prevent "Prompt is too long" errors
# Must match MAX_ADDITIONAL_CONTEXT_LENGTH in src/core/lazy-loading/llm-plugin-detector.ts
MAX_ADDITIONAL_CONTEXT_LENGTH=3000

# Helper: Output approve response with context (Claude Code hook format v1.0.166)
# CRITICAL: systemMessage is NOT a valid field for UserPromptSubmit hooks!
# Use hookSpecificOutput.additionalContext instead.
# See: https://docs.claude.com/en/docs/claude-code/hooks
#
# v1.0.254: Added size guard — truncates additionalContext if it exceeds
# MAX_ADDITIONAL_CONTEXT_LENGTH to prevent "Prompt is too long" errors.
output_approve_with_context() {
  local context="$1"
  # v1.0.254: Safety truncation to prevent prompt overflow
  # v1.0.260: Added overflow logging for debugging context budget issues
  if [[ ${#context} -gt $MAX_ADDITIONAL_CONTEXT_LENGTH ]]; then
    local overflow_by=$(( ${#context} - MAX_ADDITIONAL_CONTEXT_LENGTH ))
    echo "[$(date -Iseconds)] CONTEXT OVERFLOW | size=${#context} | max=$MAX_ADDITIONAL_CONTEXT_LENGTH | overflow_by=$overflow_by | truncating" >> "${LAZY_LOAD_LOG:-/dev/null}" 2>/dev/null
    context="${context:0:$MAX_ADDITIONAL_CONTEXT_LENGTH}... [context truncated for safety]"
  fi
  local escaped
  escaped=$(escape_json_early "$context")
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$escaped"
}

# v1.0.260: truncate_and_escape_prompt() removed — prompt embedding in SKILL FIRST
# was eliminated to save ~800 chars of context budget per turn. The skill reads
# the user's prompt from conversation context (it's already there).

# Helper: Check if plugin is installed by reading installed_plugins.json (v1.0.175)
# This is the SOURCE OF TRUTH - more reliable than `claude plugin list` which can have timing issues.
# Args: $1=plugin name (e.g., "sw-frontend"), $2=marketplace (e.g., "specweave")
# Returns: 0 if installed, 1 if not installed
check_plugin_installed_from_json() {
  local plugin="$1"
  local marketplace="$2"
  local registry_path="${HOME}/.claude/plugins/installed_plugins.json"

  # File must exist
  [[ ! -f "$registry_path" ]] && return 1

  # Must have jq for reliable JSON parsing
  if ! command -v jq >/dev/null 2>&1; then
    return 1  # Fallback to CLI check if jq not available
  fi

  # Check if plugin exists in registry
  # Format: {"plugins": {"sw-frontend@specweave": [...], ...}}
  local full_name="${plugin}@${marketplace}"
  local has_plugin
  has_plugin=$(jq -r --arg key "$full_name" '.plugins[$key] // null' "$registry_path" 2>/dev/null)

  if [[ "$has_plugin" != "null" ]] && [[ -n "$has_plugin" ]]; then
    return 0  # Installed
  else
    return 1  # Not installed
  fi
}

# ==============================================================================
# KEYWORD-BASED PLUGIN DETECTION REMOVED (v1.0.159)
# ==============================================================================
# Keyword fallback was removed because it was too aggressive.
# Example: "run tests" would install sw-testing even for simple test runs.
#
# Plugin detection now happens ONLY via LLM analysis (specweave detect-intent).
# The LLM understands user INTENT - it only recommends plugins when user
# explicitly asks to BUILD/IMPLEMENT something, not for questions or discussions.

# ==============================================================================
# UNIFIED LLM DETECTION (v1.0.147) - ONE call for BOTH plugins AND increments
# ==============================================================================
# Single `specweave detect-intent` call returns:
# - plugins: which plugins to install (for CURRENT prompt via hot-reload)
# - increment: whether to suggest creating an increment
#
# DEFAULT: SUGGEST INCREMENT for ~95% of implementation work.
# LLM decides action: "new" (most cases), "small_fix" (trivial edits),
# "hotfix" (urgent), "reopen" (related to previous), "none" (skip).
#
# WHEN NOT TO CREATE INCREMENT (action: "none" ONLY):
# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ • Pure questions: "what is X?", "explain Y", "tell me about Z"            │
# │ • Exploration: "show me", "list", "search for"                            │
# │ • Commands: "run tests", "build", "deploy", "commit"                      │
# │ • Already in workflow: prompt starts with /sw:                             │
# │ • Chat/greetings: "hello", "thanks", general conversation                 │
# │ • EXPLICIT OPT-OUT: "don't create an increment", "skip workflow"          │
# │                                                                            │
# │ NOTE: These are NOT questions — they are WORK requiring increments:        │
# │   "investigate", "debug", "troubleshoot", "why does X fail",              │
# │   "optimize", "improve", "secure", "audit", "solve", "resolve",          │
# │   "analyze", "root cause", "X is broken", "X keeps failing"              │
# └─────────────────────────────────────────────────────────────────────────────┘
#
# STILL SUGGEST INCREMENT (action: "small_fix"):
# │ • Typo fixes, version bumps, single config value changes                   │
# │ • These get a non-mandatory suggestion so user can opt in                  │

# Initialize message variable
AUTOLOAD_PLUGINS_MSG=""

# ==============================================================================
# EXTERNAL FOLDER DETECTION (v1.0.166) - Quick recommendation
# ==============================================================================
# If user wants to create project in EXTERNAL folder, recommend new session
EXTERNAL_FOLDER_DETECTED=""
if echo "$PROMPT" | grep -qiE "(in|to|at|create)[[:space:]]+(external[[:space:]]+folder|separate[[:space:]]+folder|new[[:space:]]+folder|~/|/Users/|/home/|/tmp/|outside[[:space:]]+(this|current|the)[[:space:]]+project)"; then
  # Extract the target path if mentioned
  TARGET_PATH=$(echo "$PROMPT" | grep -oE "~/[a-zA-Z0-9_/-]+" | head -1)
  [[ -z "$TARGET_PATH" ]] && TARGET_PATH=$(echo "$PROMPT" | grep -oE "/Users/[a-zA-Z0-9_/-]+" | head -1)
  [[ -z "$TARGET_PATH" ]] && TARGET_PATH=$(echo "$PROMPT" | grep -oE "/home/[a-zA-Z0-9_/-]+" | head -1)

  EXTERNAL_FOLDER_DETECTED="📁 **EXTERNAL PROJECT DETECTED**

You're requesting work in a folder outside this project.
${TARGET_PATH:+Target: $TARGET_PATH}

💡 **Recommended**: Start a NEW Claude Code session in that folder:
   1. Open terminal: \`cd ${TARGET_PATH:-<target-folder>}\`
   2. Start Claude Code: \`claude\`
   3. Run \`specweave init\` to set up SpecWeave there

This ensures plugins and context are properly scoped to the new project.

---

"
fi

# ==============================================================================
# LSP LANGUAGE SERVER CHECK (v1.0.179) - One-time warning for missing servers
# ==============================================================================
# Reads results from background lsp-check.sh (spawned by session-start.sh)
# Shows warning ONCE per session if language servers are missing
LSP_WARNING_MSG=""
if [[ -n "$SW_PROJECT_ROOT" ]]; then
  LSP_STATE_FILE="$SW_PROJECT_ROOT/.specweave/state/lsp-check.json"
else
  LSP_STATE_FILE=""
fi
if [[ -f "$LSP_STATE_FILE" ]] && command -v jq >/dev/null 2>&1; then
  LSP_STATUS=$(jq -r '.status // "ok"' "$LSP_STATE_FILE" 2>/dev/null)
  LSP_WARNED=$(jq -r '.warned // false' "$LSP_STATE_FILE" 2>/dev/null)

  if [[ "$LSP_STATUS" == "missing" ]] && [[ "$LSP_WARNED" != "true" ]]; then
    # Build warning message from missing servers
    MISSING_SERVERS=$(jq -r '.missing[] | "- **\(.language)**: `\(.install)`"' "$LSP_STATE_FILE" 2>/dev/null)

    if [[ -n "$MISSING_SERVERS" ]]; then
      LSP_WARNING_MSG="LSP missing: ${MISSING_SERVERS}. Install for semantic code intelligence. Guide: https://spec-weave.com/docs/guides/lsp-integration

"
      # Mark as warned so we don't show again this session
      # Use a temp file to avoid jq in-place issues
      TMP_FILE=$(mktemp)
      jq '.warned = true' "$LSP_STATE_FILE" > "$TMP_FILE" 2>/dev/null && mv "$TMP_FILE" "$LSP_STATE_FILE" 2>/dev/null
    fi
  fi
fi

# ==============================================================================
# LSP PROJECT CONFIG (v1.0.192) - Project-level LSP configuration
# ==============================================================================
# Reads LSP settings from .specweave/config.json instead of requiring env vars
# Config schema:
#   lsp.enabled: true/false - Enable LSP features for this project
#   lsp.autoInstallPlugins: true/false - Auto-install marketplace and plugins
#   lsp.marketplace: "boostvolt/claude-code-lsps" - Which marketplace to use
#   lsp.plugins.typescript: "vtsls" - TypeScript LSP plugin
#   lsp.plugins.python: "pyright" - Python LSP plugin

LSP_CONFIG_ENABLED="false"
LSP_AUTO_INSTALL="false"
LSP_MARKETPLACE="boostvolt/claude-code-lsps"
LSP_MARKETPLACE_URL="https://github.com/boostvolt/claude-code-lsps"
LSP_ENV_WARNED="false"

if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
  LSP_CONFIG_ENABLED=$(jq -r '.lsp.enabled // false' "$CONFIG_PATH" 2>/dev/null)
  LSP_AUTO_INSTALL=$(jq -r '.lsp.autoInstallPlugins // false' "$CONFIG_PATH" 2>/dev/null)
  LSP_MARKETPLACE=$(jq -r '.lsp.marketplace // "boostvolt/claude-code-lsps"' "$CONFIG_PATH" 2>/dev/null)
fi

# Check for LSP request keywords (find references, go to definition, etc.)
# v1.0.198: This is now a FALLBACK - LLM detection (lsp.needed field) takes precedence
# The LLM-based detection in detect-intent is more accurate and understands context
LSP_REQUEST_DETECTED="false"
if echo "$PROMPT" | grep -qiE "(find|get|show)[[:space:]]+(all[[:space:]]+)?references|go[[:space:]]?to[[:space:]]?definition|goto[[:space:]]?definition|LSP|findReferences|goToDefinition|hover|documentSymbol|workspaceSymbol"; then
  LSP_REQUEST_DETECTED="true"
fi

# ==============================================================================
# LSP PROJECT LANGUAGE DETECTION (v1.0.192) - Auto-detect project languages
# ==============================================================================
# Detects project languages from file system to auto-install LSP plugins
# LAZY LOADING: Only installs when project/prompt actually needs that language
# Available plugins in boostvolt/claude-code-lsps marketplace:
#   - vtsls: TypeScript/JavaScript (most common)
#   - pyright: Python
#   - rust-analyzer: Rust
# Key insight: User working on TS project should get LSP without asking for it
LSP_PROJECT_NEEDS_TS="false"
LSP_PROJECT_NEEDS_PY="false"
LSP_PROJECT_NEEDS_RUST="false"
LSP_PROJECT_NEEDS_CSHARP="false"
LSP_PROJECT_NEEDS_GO="false"
LSP_PROJECT_NEEDS_JAVA="false"
LSP_PROMPT_NEEDS_TS="false"
LSP_PROMPT_NEEDS_PY="false"
LSP_PROMPT_NEEDS_RUST="false"
LSP_PROMPT_NEEDS_CSHARP="false"
LSP_PROMPT_NEEDS_GO="false"
LSP_PROMPT_NEEDS_JAVA="false"

# Detect TypeScript/JavaScript project from file system
# Check for: tsconfig.json, package.json with typescript, *.ts/*.tsx files
if [[ -f "tsconfig.json" ]] || [[ -f "tsconfig.base.json" ]] || [[ -f "jsconfig.json" ]]; then
  LSP_PROJECT_NEEDS_TS="true"
elif [[ -f "package.json" ]]; then
  # Check if package.json mentions typescript
  if grep -qE '"typescript"|"@types/|"tsx"|"ts-node"' package.json 2>/dev/null; then
    LSP_PROJECT_NEEDS_TS="true"
  fi
fi
# Also check for .ts/.tsx files in src/ or root (fast check, max 1 level deep)
if [[ "$LSP_PROJECT_NEEDS_TS" != "true" ]]; then
  if ls *.ts *.tsx src/*.ts src/*.tsx 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_TS="true"
  fi
fi

# Detect Python project from file system
# Check for: requirements.txt, pyproject.toml, setup.py, *.py files
if [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]] || [[ -f "Pipfile" ]]; then
  LSP_PROJECT_NEEDS_PY="true"
fi
if [[ "$LSP_PROJECT_NEEDS_PY" != "true" ]]; then
  if ls *.py src/*.py 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_PY="true"
  fi
fi

# Detect Rust project from file system
# Check for: Cargo.toml, Cargo.lock, *.rs files
if [[ -f "Cargo.toml" ]] || [[ -f "Cargo.lock" ]]; then
  LSP_PROJECT_NEEDS_RUST="true"
fi
if [[ "$LSP_PROJECT_NEEDS_RUST" != "true" ]]; then
  if ls *.rs src/*.rs 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_RUST="true"
  fi
fi

# v1.0.235: Detect C#/.NET project from file system
# Check for: *.csproj, *.sln, Directory.Build.props, *.cs files
if ls *.csproj *.sln 2>/dev/null | head -1 | grep -q . || [[ -f "Directory.Build.props" ]]; then
  LSP_PROJECT_NEEDS_CSHARP="true"
fi
if [[ "$LSP_PROJECT_NEEDS_CSHARP" != "true" ]]; then
  # Check one level of subdirectories (common C# project structure: src/MyApp/MyApp.csproj)
  if ls */*.csproj */*.sln src/*/*.csproj 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_CSHARP="true"
  elif ls *.cs src/*.cs 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_CSHARP="true"
  fi
fi

# v1.0.235: Detect Go project from file system
if [[ -f "go.mod" ]] || [[ -f "go.sum" ]]; then
  LSP_PROJECT_NEEDS_GO="true"
fi
if [[ "$LSP_PROJECT_NEEDS_GO" != "true" ]]; then
  if ls *.go cmd/*.go pkg/*.go 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_GO="true"
  fi
fi

# v1.0.235: Detect Java project from file system
if [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]] || [[ -f "build.gradle.kts" ]] || [[ -f "settings.gradle" ]]; then
  LSP_PROJECT_NEEDS_JAVA="true"
fi
if [[ "$LSP_PROJECT_NEEDS_JAVA" != "true" ]]; then
  if ls *.java src/*.java src/main/java/*.java 2>/dev/null | head -1 | grep -q .; then
    LSP_PROJECT_NEEDS_JAVA="true"
  fi
fi

# Detect from prompt keywords (TypeScript/React/Vue/Angular/Node)
if echo "$PROMPT" | grep -qiE "\.tsx?|typescript|react|vue|angular|next\.?js|node\.?js|express|nestjs"; then
  LSP_PROMPT_NEEDS_TS="true"
fi

# Detect from prompt keywords (Python/Django/Flask/FastAPI)
if echo "$PROMPT" | grep -qiE "\.py|python|django|flask|fastapi|pytorch|tensorflow|pandas|numpy"; then
  LSP_PROMPT_NEEDS_PY="true"
fi

# Detect from prompt keywords (Rust/Cargo)
if echo "$PROMPT" | grep -qiE "\.rs|rust|cargo|rustc|tokio|actix|axum"; then
  LSP_PROMPT_NEEDS_RUST="true"
fi

# v1.0.235: Detect from prompt keywords (C#/.NET)
if echo "$PROMPT" | grep -qiE "\.cs\b|c#|csharp|dotnet|\.net|asp\.net|blazor|entity.?framework|nuget|\.csproj|\.sln"; then
  LSP_PROMPT_NEEDS_CSHARP="true"
fi

# v1.0.235: Detect from prompt keywords (Go)
if echo "$PROMPT" | grep -qiE "\.go\b|golang|go\.mod|goroutine|gin|echo|fiber"; then
  LSP_PROMPT_NEEDS_GO="true"
fi

# v1.0.235: Detect from prompt keywords (Java/Spring/Kotlin)
if echo "$PROMPT" | grep -qiE "\.java\b|java\b|spring|maven|gradle|kotlin|\.kt\b|jvm"; then
  LSP_PROMPT_NEEDS_JAVA="true"
fi

# LSP setup is handled by `specweave init` and `specweave lsp status`
# No per-prompt warnings needed - avoids state file pollution
LSP_ENV_SETUP_MSG=""

# ==============================================================================
# LSP AUTO-INSTALL (v1.0.196) - Install LSP plugins with PROJECT SCOPE
# ==============================================================================
# Triggers on ANY of:
#   - Explicit LSP request (findReferences, goToDefinition, etc.)
#   - Project language detection (tsconfig.json, package.json, requirements.txt, Cargo.toml)
#   - Prompt language detection (mentions typescript, react, python, django, etc.)
# This ensures LSP plugins are installed when working on TS/Py/Rust projects
# WITHOUT requiring user to explicitly ask for "find references"
#
# v1.0.196: LSP plugins now install with PROJECT SCOPE by default
#   - Reads plugins.scope.lspScope from config (default: "project")
#   - Project scope keeps LSP plugins specific to the project
#   - Avoids polluting global plugin list with project-specific language support
LSP_INSTALL_MSG=""
LSP_NEEDS_INSTALL="false"

# Read LSP scope from config.json (v1.0.196)
# Default: "project" - LSP plugins should be project-scoped
LSP_PLUGIN_SCOPE="project"
if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
  SCOPE_VALUE=$(jq -r '.plugins.scope.lspScope // "project"' "$CONFIG_PATH" 2>/dev/null)
  if [[ "$SCOPE_VALUE" == "user" ]] || [[ "$SCOPE_VALUE" == "project" ]] || [[ "$SCOPE_VALUE" == "local" ]]; then
    LSP_PLUGIN_SCOPE="$SCOPE_VALUE"
  fi
fi

# Check if ANY language detection triggered
if [[ "$LSP_REQUEST_DETECTED" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_TS" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_TS" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_PY" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_PY" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_RUST" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_RUST" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_CSHARP" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_CSHARP" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_GO" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_GO" == "true" ]] || \
   [[ "$LSP_PROJECT_NEEDS_JAVA" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_JAVA" == "true" ]]; then
  LSP_NEEDS_INSTALL="true"
fi

# ==============================================================================
# LSP SETUP SUGGESTION (v1.0.203) - Suggest setup instead of auto-installing
# ==============================================================================
# When languages are detected but auto-install is disabled, suggest running
# specweave lsp setup which does multi-repo scanning and asks user approval
LSP_SETUP_SUGGESTION_MSG=""
if [[ -n "$SW_PROJECT_ROOT" ]]; then
  LSP_SETUP_STATE_FILE="$SW_PROJECT_ROOT/.specweave/state/lsp-setup-suggested.flag"
else
  LSP_SETUP_STATE_FILE=""
fi

if [[ "$LSP_NEEDS_INSTALL" == "true" ]] && [[ "$LSP_AUTO_INSTALL" != "true" ]]; then
  # Check if we've already suggested setup in this session
  if [[ ! -f "$LSP_SETUP_STATE_FILE" ]] && [[ -n "${ENABLE_LSP_TOOL:-}" ]]; then
    # Build list of detected languages
    DETECTED_LANGS=""
    if [[ "$LSP_PROJECT_NEEDS_TS" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_TS" == "true" ]]; then
      DETECTED_LANGS="TypeScript"
    fi
    if [[ "$LSP_PROJECT_NEEDS_PY" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_PY" == "true" ]]; then
      [[ -n "$DETECTED_LANGS" ]] && DETECTED_LANGS="$DETECTED_LANGS, "
      DETECTED_LANGS="${DETECTED_LANGS}Python"
    fi
    if [[ "$LSP_PROJECT_NEEDS_RUST" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_RUST" == "true" ]]; then
      [[ -n "$DETECTED_LANGS" ]] && DETECTED_LANGS="$DETECTED_LANGS, "
      DETECTED_LANGS="${DETECTED_LANGS}Rust"
    fi
    if [[ "$LSP_PROJECT_NEEDS_CSHARP" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_CSHARP" == "true" ]]; then
      [[ -n "$DETECTED_LANGS" ]] && DETECTED_LANGS="$DETECTED_LANGS, "
      DETECTED_LANGS="${DETECTED_LANGS}C#"
    fi
    if [[ "$LSP_PROJECT_NEEDS_GO" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_GO" == "true" ]]; then
      [[ -n "$DETECTED_LANGS" ]] && DETECTED_LANGS="$DETECTED_LANGS, "
      DETECTED_LANGS="${DETECTED_LANGS}Go"
    fi
    if [[ "$LSP_PROJECT_NEEDS_JAVA" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_JAVA" == "true" ]]; then
      [[ -n "$DETECTED_LANGS" ]] && DETECTED_LANGS="$DETECTED_LANGS, "
      DETECTED_LANGS="${DETECTED_LANGS}Java"
    fi

    # v1.0.235: Check if plugins are missing (expanded language support)
    MISSING_PLUGINS="false"
    INSTALLED_PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
    _check_plugin() {
      local plugin_name="$1"
      if [[ -f "$INSTALLED_PLUGINS_FILE" ]]; then
        if ! grep -q "\"${plugin_name}@" "$INSTALLED_PLUGINS_FILE" 2>/dev/null; then
          MISSING_PLUGINS="true"
        fi
      else
        MISSING_PLUGINS="true"
      fi
    }
    if [[ "$LSP_PROJECT_NEEDS_TS" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_TS" == "true" ]]; then
      _check_plugin "vtsls"
    fi
    if [[ "$LSP_PROJECT_NEEDS_PY" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_PY" == "true" ]]; then
      _check_plugin "pyright"
    fi
    if [[ "$LSP_PROJECT_NEEDS_RUST" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_RUST" == "true" ]]; then
      _check_plugin "rust-analyzer"
    fi
    if [[ "$LSP_PROJECT_NEEDS_CSHARP" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_CSHARP" == "true" ]]; then
      _check_plugin "csharp-lsp"
    fi
    if [[ "$LSP_PROJECT_NEEDS_GO" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_GO" == "true" ]]; then
      _check_plugin "gopls"
    fi
    if [[ "$LSP_PROJECT_NEEDS_JAVA" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_JAVA" == "true" ]]; then
      _check_plugin "jdtls"
    fi

    if [[ "$MISSING_PLUGINS" == "true" ]] && [[ -n "$DETECTED_LANGS" ]]; then
      LSP_SETUP_SUGGESTION_MSG="💡 **LSP Setup Available**

Detected languages: **${DETECTED_LANGS}**

For enhanced code intelligence (find references, go to definition, hover), run:
\`\`\`bash
specweave lsp setup
\`\`\`

This will scan your project (including nested repos) and let you choose which LSP plugins to install.

---

"
      # Mark as suggested (only in initialized SpecWeave projects)
      if [[ -n "$LSP_SETUP_STATE_FILE" ]] && [[ -n "$SW_PROJECT_ROOT" ]]; then
        mkdir -p "$(dirname "$LSP_SETUP_STATE_FILE")" 2>/dev/null
        touch "$LSP_SETUP_STATE_FILE" 2>/dev/null
      fi
    fi
  fi
fi

if [[ "$LSP_NEEDS_INSTALL" == "true" ]] && [[ "$LSP_AUTO_INSTALL" == "true" ]]; then
  # CRITICAL: Skip LSP plugin installation if ENABLE_LSP_TOOL is not set (v1.0.195)
  # Installing plugins without this env var is useless - they won't work
  if [[ -z "${ENABLE_LSP_TOOL:-}" ]]; then
    # Don't install - just show the setup message (already handled by LSP_ENV_SETUP_MSG)
    LSP_NEEDS_INSTALL="false"
  fi
fi

if [[ "$LSP_NEEDS_INSTALL" == "true" ]] && [[ "$LSP_AUTO_INSTALL" == "true" ]]; then
  # Check if marketplace is already installed
  MARKETPLACE_DIR="$HOME/.claude/plugins/marketplaces/claude-code-lsps"
  if [[ ! -d "$MARKETPLACE_DIR" ]] && command -v claude >/dev/null 2>&1; then
    # Install the marketplace
    if timeout 15 claude plugin marketplace add "$LSP_MARKETPLACE_URL" >/dev/null 2>&1; then
      LSP_INSTALL_MSG="✅ **LSP marketplace installed**: \`$LSP_MARKETPLACE\`
"
    fi
  fi

  # Auto-install TypeScript LSP plugin (vtsls) when TypeScript project/prompt detected
  # v1.0.196: Uses --scope $LSP_PLUGIN_SCOPE (default: project)
  if [[ "$LSP_PROJECT_NEEDS_TS" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_TS" == "true" ]]; then
    VTSLS_INSTALLED=$(jq -r '."vtsls@claude-code-lsps" // false' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null)
    if [[ "$VTSLS_INSTALLED" != "true" ]] && command -v claude >/dev/null 2>&1; then
      if timeout 15 claude plugin install vtsls@claude-code-lsps --scope $LSP_PLUGIN_SCOPE >/dev/null 2>&1; then
        LSP_INSTALL_MSG="${LSP_INSTALL_MSG}✅ **TypeScript LSP installed**: \`vtsls@claude-code-lsps\` (scope: $LSP_PLUGIN_SCOPE)
"
      fi
    fi
  fi

  # Auto-install Python LSP plugin (pyright) when Python project/prompt detected
  # v1.0.196: Uses --scope $LSP_PLUGIN_SCOPE (default: project)
  if [[ "$LSP_PROJECT_NEEDS_PY" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_PY" == "true" ]]; then
    PYRIGHT_INSTALLED=$(jq -r '."pyright@claude-code-lsps" // false' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null)
    if [[ "$PYRIGHT_INSTALLED" != "true" ]] && command -v claude >/dev/null 2>&1; then
      if timeout 15 claude plugin install pyright@claude-code-lsps --scope $LSP_PLUGIN_SCOPE >/dev/null 2>&1; then
        LSP_INSTALL_MSG="${LSP_INSTALL_MSG}✅ **Python LSP installed**: \`pyright@claude-code-lsps\` (scope: $LSP_PLUGIN_SCOPE)
"
      fi
    fi
  fi

  # Auto-install Rust LSP plugin (rust-analyzer) when Rust project/prompt detected
  # v1.0.196: Uses --scope $LSP_PLUGIN_SCOPE (default: project)
  if [[ "$LSP_PROJECT_NEEDS_RUST" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_RUST" == "true" ]]; then
    RUST_ANALYZER_INSTALLED=$(jq -r '."rust-analyzer@claude-code-lsps" // false' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null)
    if [[ "$RUST_ANALYZER_INSTALLED" != "true" ]] && command -v claude >/dev/null 2>&1; then
      if timeout 15 claude plugin install rust-analyzer@claude-code-lsps --scope $LSP_PLUGIN_SCOPE >/dev/null 2>&1; then
        LSP_INSTALL_MSG="${LSP_INSTALL_MSG}✅ **Rust LSP installed**: \`rust-analyzer@claude-code-lsps\` (scope: $LSP_PLUGIN_SCOPE)
"
      fi
    fi
  fi

  if [[ -n "$LSP_INSTALL_MSG" ]]; then
    LSP_INSTALL_MSG="${LSP_INSTALL_MSG}
---

"
  fi
fi

# ==============================================================================
# EXPLICIT LSP REQUEST DETECTION (v1.0.181)
# ==============================================================================
# Detects when users explicitly ask to "use LSP" for tasks like "find references"
# and explains that LSP in Claude Code provides background enhancement, not explicit tools.
# v1.0.201: SEMANTIC LSP VIA CLI FALLBACK
# When user asks for LSP features (find references, go to definition, etc.),
# instruct Claude to use `specweave lsp` commands which provide REAL semantic analysis
# via TsServerClient - NOT grep text matching!
# ==============================================================================
# v1.0.235: LSP AUTO-INSTALL + CLI INSTRUCTIONS
# ==============================================================================
# When user requests LSP operations (find references, go to definition, etc.):
# 1. Detect which language from prompt/project context
# 2. Check if that language's LSP binary + plugin are installed
# 3. If missing, return AUTO-INSTALL commands for Claude to run silently
# 4. Then provide CLI instructions for the actual LSP operation
LSP_EXPLICIT_REQUEST_MSG=""
if echo "$PROMPT" | grep -qiE "(use|with|via)[[:space:]]+(the[[:space:]]+)?LSP|LSP[[:space:]]+(find|get|show|goto|hover|definition|references|implementations)|(find|get|show)[[:space:]]+(all[[:space:]]+)?references|go[[:space:]]?to[[:space:]]?definition|where[[:space:]]+(is|are).*defined|what[[:space:]]+(uses|calls)|who[[:space:]]+(uses|calls)"; then

  # Build auto-install commands for missing LSP servers
  LSP_AUTO_INSTALL_CMDS=""
  _lsp_check_and_install() {
    local lang="$1" binary="$2" binary_install="$3" plugin="$4" marketplace="${LSP_MARKETPLACE:-claude-code-lsps}"
    # Check if binary is installed
    if ! command -v "$binary" >/dev/null 2>&1; then
      LSP_AUTO_INSTALL_CMDS="${LSP_AUTO_INSTALL_CMDS}
- **${lang}** binary missing: \`${binary_install}\`"
    fi
    # Check if plugin is installed
    local plugins_file="$HOME/.claude/plugins/installed_plugins.json"
    if [[ -f "$plugins_file" ]]; then
      if ! grep -q "\"${plugin}@" "$plugins_file" 2>/dev/null; then
        LSP_AUTO_INSTALL_CMDS="${LSP_AUTO_INSTALL_CMDS}
- **${lang}** plugin missing: \`claude plugin install ${plugin}@${marketplace} --scope ${LSP_PLUGIN_SCOPE:-project}\`"
      fi
    else
      LSP_AUTO_INSTALL_CMDS="${LSP_AUTO_INSTALL_CMDS}
- **${lang}** plugin missing: \`claude plugin install ${plugin}@${marketplace} --scope ${LSP_PLUGIN_SCOPE:-project}\`"
    fi
  }

  # Check each detected language
  if [[ "$LSP_PROJECT_NEEDS_TS" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_TS" == "true" ]]; then
    _lsp_check_and_install "TypeScript" "typescript-language-server" "npm install -g typescript-language-server typescript" "vtsls"
  fi
  if [[ "$LSP_PROJECT_NEEDS_PY" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_PY" == "true" ]]; then
    _lsp_check_and_install "Python" "pyright-langserver" "pip install pyright" "pyright"
  fi
  if [[ "$LSP_PROJECT_NEEDS_RUST" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_RUST" == "true" ]]; then
    _lsp_check_and_install "Rust" "rust-analyzer" "rustup component add rust-analyzer" "rust-analyzer"
  fi
  if [[ "$LSP_PROJECT_NEEDS_CSHARP" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_CSHARP" == "true" ]]; then
    _lsp_check_and_install "C#" "csharp-ls" "dotnet tool install -g csharp-ls" "csharp-lsp"
  fi
  if [[ "$LSP_PROJECT_NEEDS_GO" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_GO" == "true" ]]; then
    _lsp_check_and_install "Go" "gopls" "go install golang.org/x/tools/gopls@latest" "gopls"
  fi
  if [[ "$LSP_PROJECT_NEEDS_JAVA" == "true" ]] || [[ "$LSP_PROMPT_NEEDS_JAVA" == "true" ]]; then
    _lsp_check_and_install "Java" "jdtls" "brew install jdtls" "jdtls"
  fi

  # Build the message
  if [[ -n "$LSP_AUTO_INSTALL_CMDS" ]]; then
    LSP_EXPLICIT_REQUEST_MSG="⚡ **LSP AUTO-INSTALL REQUIRED**

The following LSP components are missing for this request. **Install them NOW before proceeding:**
${LSP_AUTO_INSTALL_CMDS}

**MANDATORY**: Run ALL missing install commands above using Bash tool, then use \`specweave lsp\` CLI:

\`\`\`bash
specweave lsp refs <file> <symbol>     # Find semantic references
specweave lsp def <file> <symbol>      # Go to definition
specweave lsp hover <file> <symbol>    # Type information
specweave lsp symbols <file>           # List symbols
\`\`\`

⚠️ Do NOT use Grep for \"find references\" - use LSP for semantic accuracy.

---

"
  else
    LSP_EXPLICIT_REQUEST_MSG="🎯 **LSP Semantic Analysis Available**

Use SpecWeave LSP CLI for **semantic code intelligence** (not grep text matching):

\`\`\`bash
specweave lsp refs <file> <symbol>     # Find semantic references
specweave lsp def <file> <symbol>      # Go to definition
specweave lsp hover <file> <symbol>    # Type information
specweave lsp symbols <file>           # List symbols
specweave lsp search <query>           # Workspace symbol search
\`\`\`

⚠️ Do NOT use Grep for \"find references\" - use LSP for semantic accuracy.

---

"
  fi
fi

# Only run if features are enabled and not disabled via env
if [[ "${SPECWEAVE_DISABLE_AUTO_LOAD:-0}" != "1" ]] && [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" != "1" ]]; then
  if [[ "$PLUGIN_AUTOLOAD_ENABLED" == "true" ]] || [[ "$INCREMENT_ASSIST_ENABLED" == "true" ]]; then

    # Quick skip: already using /sw: commands (user is in workflow)
    if ! echo "$PROMPT" | grep -qE "^[[:space:]]*/sw:"; then

      # Check if specweave CLI is available
      if command -v specweave >/dev/null 2>&1; then
        # Setup logging (use project root, never create dirs at $HOME)
        if [[ -n "$SW_PROJECT_ROOT" ]]; then
          LAZY_LOAD_LOG="$SW_PROJECT_ROOT/.specweave/logs/lazy-loading.log"
        else
          LAZY_LOAD_LOG="/dev/null"
        fi

        # Per-session cache to avoid redundant LLM calls (30 min TTL)
        if [[ -n "$SW_PROJECT_ROOT" ]]; then
          PROMPT_CACHE_DIR="$SW_PROJECT_ROOT/.specweave/state/prompt-cache"
          mkdir -p "$PROMPT_CACHE_DIR" 2>/dev/null
        else
          PROMPT_CACHE_DIR="${TMPDIR:-/tmp}/specweave-prompt-cache"
          mkdir -p "$PROMPT_CACHE_DIR" 2>/dev/null
        fi
        PROMPT_HASH=$(echo "$PROMPT" | md5sum 2>/dev/null | cut -c1-16 || md5 -qs "$PROMPT" 2>/dev/null | cut -c1-16 || echo "nohash")
        CACHE_FILE="$PROMPT_CACHE_DIR/${PROMPT_HASH}.json"

        DETECT_OUTPUT=""
        SHOULD_CALL_LLM=true

        # Check cache
        if [[ -f "$CACHE_FILE" ]]; then
          CACHE_AGE=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || stat -c%Y "$CACHE_FILE" 2>/dev/null || echo 0)))
          if [[ "$CACHE_AGE" -lt 1800 ]]; then
            DETECT_OUTPUT=$(cat "$CACHE_FILE" 2>/dev/null)
            SHOULD_CALL_LLM=false
            echo "[$(date -Iseconds)] detect-intent | cached=true | age=${CACHE_AGE}s" >> "$LAZY_LOAD_LOG"
          fi
        fi

        # Call LLM if not cached
        if [[ "$SHOULD_CALL_LLM" == "true" ]]; then
          START_TIME=$(perl -MTime::HiRes=time -e 'printf "%.0f", time*1000' 2>/dev/null || echo $(($(date +%s) * 1000)))

          # Write prompt to temp file to avoid all escaping issues (v1.0.153)
          PROMPT_TMP_FILE=$(mktemp 2>/dev/null || echo "/tmp/specweave-prompt-$$")
          printf '%s' "$PROMPT" > "$PROMPT_TMP_FILE"

          # ONE LLM call for BOTH plugins and increment (using --file flag)
          if command -v timeout >/dev/null 2>&1; then
            # v1.0.159: Reduced timeout to 15s with --setting-sources "" optimization
            DETECT_OUTPUT=$(timeout 15 specweave detect-intent --file "$PROMPT_TMP_FILE" 2>/dev/null)
          else
            DETECT_OUTPUT=$(specweave detect-intent --file "$PROMPT_TMP_FILE" 2>/dev/null)
          fi

          # Clean up temp file
          rm -f "$PROMPT_TMP_FILE" 2>/dev/null

          END_TIME=$(perl -MTime::HiRes=time -e 'printf "%.0f", time*1000' 2>/dev/null || echo $(($(date +%s) * 1000)))
          DURATION=$((END_TIME - START_TIME))

          # Cache result
          [[ -n "$DETECT_OUTPUT" ]] && echo "$DETECT_OUTPUT" > "$CACHE_FILE" 2>/dev/null
          echo "[$(date -Iseconds)] detect-intent | duration=${DURATION}ms | cached=false" >> "$LAZY_LOAD_LOG"
        fi

        # Parse JSON response (extract complete JSON object from multi-line output)
        LLM_DETECTION_FAILED=false
        if [[ -n "$DETECT_OUTPUT" ]] && command -v jq >/dev/null 2>&1; then
          # Extract JSON using awk: from first { to last } (handles multi-line JSON)
          JSON_OUTPUT=$(echo "$DETECT_OUTPUT" | awk '/^\{/{found=1} found{print} /^\}/{if(found) exit}')

          if [[ -n "$JSON_OUTPUT" ]]; then
            # ==================================================================
            # PLUGIN INSTALLATION/SUGGESTION (from LLM response)
            # ==================================================================
            if [[ "$PLUGIN_AUTOLOAD_ENABLED" == "true" ]]; then
              DETECTED_PLUGINS=$(echo "$JSON_OUTPUT" | jq -r '.plugins[]?' 2>/dev/null | tr '\n' ' ')

              if [[ -n "$DETECTED_PLUGINS" ]]; then
                # v1.0.158: SUGGEST-ONLY MODE - Don't install, just inform user
                if [[ "$PLUGIN_SUGGEST_ONLY" == "true" ]]; then
                  PLUGIN_LIST=$(echo "$DETECTED_PLUGINS" | tr ' ' ', ' | sed 's/,$//')
                  AUTOLOAD_PLUGINS_MSG="💡 **Suggested plugins**: ${PLUGIN_LIST}\\n"
                  AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}To install: \`claude plugin install <plugin>@specweave\`\\n"
                  AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}After installing, restart Claude Code session to use new plugins.\\n"
                  LLM_REASON=$(echo "$JSON_OUTPUT" | jq -r '.reasoning // empty' 2>/dev/null)
                  [[ -n "$LLM_REASON" ]] && AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}*${LLM_REASON}*\\n\\n---\\n"
                  echo "[$(date -Iseconds)] plugins | suggested=${PLUGIN_LIST} | mode=suggestOnly" >> "$LAZY_LOAD_LOG"
                elif command -v claude >/dev/null 2>&1; then
                  # NORMAL MODE - Actually install plugins
                  PLUGINS_INSTALLED=""
                  PLUGINS_ALREADY=""

                  # v1.0.210: All plugins install with PROJECT scope by default
                  # This prevents global pollution - plugins stay scoped to current project
                  SPECWEAVE_PLUGIN_SCOPE="project"
                  DEFAULT_PLUGIN_SCOPE="project"
                  if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
                    SCOPE_VAL=$(jq -r '.plugins.scope.specweaveScope // "project"' "$CONFIG_PATH" 2>/dev/null)
                    [[ "$SCOPE_VAL" == "user" || "$SCOPE_VAL" == "project" || "$SCOPE_VAL" == "local" ]] && SPECWEAVE_PLUGIN_SCOPE="$SCOPE_VAL"
                    SCOPE_VAL=$(jq -r '.plugins.scope.defaultScope // "project"' "$CONFIG_PATH" 2>/dev/null)
                    [[ "$SCOPE_VAL" == "user" || "$SCOPE_VAL" == "project" || "$SCOPE_VAL" == "local" ]] && DEFAULT_PLUGIN_SCOPE="$SCOPE_VAL"
                  fi

                  for plugin in $DETECTED_PLUGINS; do
                    [[ -z "$plugin" ]] && continue

                    # v1.0.159: Determine marketplace based on plugin name
                    # sw-* plugins → @specweave, others → @claude-plugins-official
                    # v1.0.240 (0198): context7/playwright removed from auto-install
                    if [[ "$plugin" == sw-* ]] || [[ "$plugin" == "sw" ]]; then
                      MARKETPLACE="specweave"
                      PLUGIN_SCOPE="$SPECWEAVE_PLUGIN_SCOPE"
                    else
                      MARKETPLACE="claude-plugins-official"
                      PLUGIN_SCOPE="$DEFAULT_PLUGIN_SCOPE"
                    fi

                    # v1.0.175: Check if plugin is ALREADY installed (SOURCE OF TRUTH)
                    # Primary: Check installed_plugins.json (reliable, fast, no timing issues)
                    # Fallback: Check `claude plugin list` if jq not available
                    FULL_PLUGIN_NAME="${plugin}@${MARKETPLACE}"
                    ALREADY_INSTALLED=false

                    # Try JSON registry first (most reliable)
                    if check_plugin_installed_from_json "$plugin" "$MARKETPLACE"; then
                      ALREADY_INSTALLED=true
                    else
                      # Fallback to CLI check (if jq not available or registry file missing)
                      # Give it a longer timeout (10s) to reduce timing issues
                      CURRENT_PLUGINS=""
                      if command -v timeout >/dev/null 2>&1; then
                        CURRENT_PLUGINS=$(timeout 10 claude plugin list 2>/dev/null | grep -E "^  ❯ " | sed 's/^  ❯ //' || true)
                      else
                        CURRENT_PLUGINS=$(claude plugin list 2>/dev/null | grep -E "^  ❯ " | sed 's/^  ❯ //' || true)
                      fi

                      if echo "$CURRENT_PLUGINS" | grep -q "^${FULL_PLUGIN_NAME}$"; then
                        ALREADY_INSTALLED=true
                      fi
                    fi

                    if [[ "$ALREADY_INSTALLED" == "true" ]]; then
                      # Plugin already installed - no need to call install, just track it
                      [[ -n "$PLUGINS_ALREADY" ]] && PLUGINS_ALREADY="$PLUGINS_ALREADY, "
                      PLUGINS_ALREADY="${PLUGINS_ALREADY}${plugin}"
                    else
                      # Plugin not installed - install it with appropriate scope
                      # v1.0.198: Apply scope based on plugin type
                      # Use longer timeout (10s) to ensure installation completes
                      if command -v timeout >/dev/null 2>&1; then
                        OUT=$(timeout 10 claude plugin install "${FULL_PLUGIN_NAME}" --scope "$PLUGIN_SCOPE" 2>&1) || true
                      else
                        OUT=$(claude plugin install "${FULL_PLUGIN_NAME}" --scope "$PLUGIN_SCOPE" 2>&1) || true
                      fi

                      # Only mark as installed if we see "success" or "installed" in output
                      if echo "$OUT" | grep -qiE "(success|installed)"; then
                        # Double-check: verify it actually got installed
                        # Re-check the registry to confirm (guard against false positives)
                        sleep 0.5  # Brief delay for registry to update
                        if check_plugin_installed_from_json "$plugin" "$MARKETPLACE"; then
                          [[ -n "$PLUGINS_INSTALLED" ]] && PLUGINS_INSTALLED="$PLUGINS_INSTALLED, "
                          PLUGINS_INSTALLED="${PLUGINS_INSTALLED}${plugin}"
                        else
                          # Install claimed success but plugin not in registry - treat as already installed
                          [[ -n "$PLUGINS_ALREADY" ]] && PLUGINS_ALREADY="$PLUGINS_ALREADY, "
                          PLUGINS_ALREADY="${PLUGINS_ALREADY}${plugin}"
                        fi
                      fi
                    fi
                  done

                  # Build feedback message
                  if [[ -n "$PLUGINS_INSTALLED" ]]; then
                    # v1.0.260: Compacted RESTART message (~400 chars vs ~2000 chars)
                    # ASCII art boxes were wasting ~1600 chars of the 3000-char context budget.
                    AUTOLOAD_PLUGINS_MSG="RESTART REQUIRED: Plugins installed (${PLUGINS_INSTALLED}) but NOT loaded in current session.\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}ALL tools BLOCKED (Write, Edit, Bash, Task). DO NOT proceed.\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}Restart: VSCode \\\`Cmd+Shift+P\\\` > 'Claude: New Session' | CLI: exit + \\\`claude\\\`\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}STOP COMPLETELY. Do NOT help, do NOT implement, do NOT ignore this.\\n"
                  elif [[ -n "$PLUGINS_ALREADY" ]]; then
                    # v1.0.260: Daily caching — "Using plugins" shown once per day
                    # Uses date-based marker (like archive-suggestion) to auto-reset daily
                    _PLUGINS_SHOWN_FLAG="${SPECWEAVE_DIR}/state/plugins-shown.marker"
                    _TODAY=$(date +%Y-%m-%d)
                    _LAST_SHOWN=""
                    [[ -f "$_PLUGINS_SHOWN_FLAG" ]] && _LAST_SHOWN=$(cat "$_PLUGINS_SHOWN_FLAG" 2>/dev/null)
                    if [[ "$_LAST_SHOWN" != "$_TODAY" ]]; then
                      AUTOLOAD_PLUGINS_MSG="🔌 **Using plugins**: ${PLUGINS_ALREADY}\\n"
                      mkdir -p "$(dirname "$_PLUGINS_SHOWN_FLAG")" 2>/dev/null
                      echo "$_TODAY" > "$_PLUGINS_SHOWN_FLAG" 2>/dev/null
                    fi
                  fi
                  if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
                    # v1.0.260: Skip LLM reasoning to save context budget — it's informational only
                    :
                  fi

                  echo "[$(date -Iseconds)] plugins | installed=${PLUGINS_INSTALLED:-none} | already=${PLUGINS_ALREADY:-none}" >> "$LAZY_LOAD_LOG"

                  # v1.0.240 (0198): Playwright MCP suggestion removed
                  # Browser automation handled by @playwright/cli (CLI-only mode)
                fi
              fi
            fi

            # ==================================================================
            # EXTRACT ROUTING INFO EARLY (v1.0.155 - needed for agent directives)
            # ==================================================================
            ROUTING_SKILLS_COUNT=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills | length // 0' 2>/dev/null)

            # ==================================================================
            # INCREMENT SUGGESTION (from LLM response)
            # ==================================================================
            if [[ "$INCREMENT_ASSIST_ENABLED" == "true" ]]; then
              INC_ACTION=$(echo "$JSON_OUTPUT" | jq -r '.increment.action // "none"' 2>/dev/null)
              INC_CONF=$(echo "$JSON_OUTPUT" | jq -r '.increment.confidence // 0' 2>/dev/null)
              INC_NAME=$(echo "$JSON_OUTPUT" | jq -r '.increment.suggestedName // empty' 2>/dev/null)
              INC_REASON=$(echo "$JSON_OUTPUT" | jq -r '.increment.reasoning // empty' 2>/dev/null)
              INC_KEYWORD=$(echo "$JSON_OUTPUT" | jq -r '.increment.relatedKeyword // empty' 2>/dev/null)
              # v1.0.168: LLM decides if mandatory (not config-based)
              INC_MANDATORY=$(echo "$JSON_OUTPUT" | jq -r '.increment.mandatory // false' 2>/dev/null)

              # Config-based override: if incrementAssist.mandatory=true in config,
              # force mandatory for ALL detected implementation work (action != "none")
              if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" && "$INC_ACTION" != "none" ]]; then
                INC_MANDATORY="true"
              fi

              # v1.0.168: Parse skill invocation recommendation
              SKILL_INVOCATION=$(echo "$JSON_OUTPUT" | jq -r '.skillInvocation.skill // empty' 2>/dev/null)
              SKILL_REASON=$(echo "$JSON_OUTPUT" | jq -r '.skillInvocation.reason // empty' 2>/dev/null)
              SKILL_MANDATORY=$(echo "$JSON_OUTPUT" | jq -r '.skillInvocation.mandatory // false' 2>/dev/null)

              # v1.0.198: Parse LSP recommendation from unified LLM detection
              LSP_LLM_NEEDED=$(echo "$JSON_OUTPUT" | jq -r '.lsp.needed // false' 2>/dev/null)
              LSP_LLM_OPERATION=$(echo "$JSON_OUTPUT" | jq -r '.lsp.operation // empty' 2>/dev/null)
              LSP_LLM_LANGUAGE=$(echo "$JSON_OUTPUT" | jq -r '.lsp.language // empty' 2>/dev/null)
              LSP_LLM_WARMUP=$(echo "$JSON_OUTPUT" | jq -r '.lsp.warmupRequired // false' 2>/dev/null)

              # Override grep-based detection with LLM decision
              if [[ "$LSP_LLM_NEEDED" == "true" ]]; then
                LSP_REQUEST_DETECTED="true"
                # v1.0.235: Use LLM language detection for all supported languages
                case "$LSP_LLM_LANGUAGE" in
                  typescript|javascript) LSP_PROMPT_NEEDS_TS="true" ;;
                  python) LSP_PROMPT_NEEDS_PY="true" ;;
                  rust) LSP_PROMPT_NEEDS_RUST="true" ;;
                  csharp|c#) LSP_PROMPT_NEEDS_CSHARP="true" ;;
                  go|golang) LSP_PROMPT_NEEDS_GO="true" ;;
                  java|kotlin) LSP_PROMPT_NEEDS_JAVA="true" ;;
                esac
              fi

              # Check confidence threshold
              ABOVE=$(echo "$INC_CONF >= $INCREMENT_CONFIDENCE_THRESHOLD" | bc -l 2>/dev/null || echo 0)

              if [[ "$ABOVE" == "1" ]]; then
                AUTOLOAD_PREFIX=""
                # v1.0.166: Prepend external folder warning if detected
                [[ -n "$EXTERNAL_FOLDER_DETECTED" ]] && AUTOLOAD_PREFIX="${EXTERNAL_FOLDER_DETECTED}"
                # v1.0.179: Prepend LSP warning if language servers missing
                [[ -n "$LSP_WARNING_MSG" ]] && AUTOLOAD_PREFIX="${AUTOLOAD_PREFIX}${LSP_WARNING_MSG}"
                # v1.0.180: Prepend explicit LSP request explanation
                [[ -n "$LSP_EXPLICIT_REQUEST_MSG" ]] && AUTOLOAD_PREFIX="${AUTOLOAD_PREFIX}${LSP_EXPLICIT_REQUEST_MSG}"
                [[ -n "$AUTOLOAD_PLUGINS_MSG" ]] && AUTOLOAD_PREFIX="${AUTOLOAD_PREFIX}${AUTOLOAD_PLUGINS_MSG}

"
                # Build agent spawn directive if routing skills available (v1.0.155)
                AGENT_DIRECTIVE=""
                # v1.0.168: Skill invocation directive (takes precedence over routing)
                # Skill memories now loaded via DCI in SKILL.md (no hook injection)
                # v1.0.260: Compacted AGENT_DIRECTIVE to save context budget
                if [[ -n "$SKILL_INVOCATION" ]]; then
                  if [[ "$SKILL_MANDATORY" == "true" ]]; then
                    AGENT_DIRECTIVE="
MANDATORY: Also call \`Skill({ skill: \"${SKILL_INVOCATION}\" })\` — ${SKILL_REASON:-specialized support needed}."
                  else
                    AGENT_DIRECTIVE="
Recommended: \`Skill({ skill: \"${SKILL_INVOCATION}\" })\` — ${SKILL_REASON:-specialized support for this task}."
                  fi
                elif [[ "$ROUTING_SKILLS_COUNT" -gt 0 ]]; then
                  PRIMARY_PLUGIN=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .plugin // empty' 2>/dev/null | head -1)
                  PRIMARY_SKILL_NAME=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .name // empty' 2>/dev/null | head -1)
                  PRIMARY_REASON=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .reason // empty' 2>/dev/null | head -1)
                  if [[ -n "$PRIMARY_PLUGIN" && -n "$PRIMARY_SKILL_NAME" ]]; then
                    # v1.0.260: Compacted routing directive to save context budget
                    AGENT_DIRECTIVE="
Then spawn agent: \`Task({ subagent_type: \"${PRIMARY_PLUGIN}:${PRIMARY_SKILL_NAME}\", description: \"${PRIMARY_REASON:-Implementation}\" })\`"
                  fi
                fi

                case "$INC_ACTION" in
                  new)
                    CMD="/sw:increment"
                    [[ -n "$INC_NAME" ]] && CMD="/sw:increment \"$INC_NAME\""

                    # v1.0.169+: Call sw:increment skill directly
                    # Pass user prompt so skill can extract context
                    # INC_MANDATORY comes from detect-intent LLM response
                    if [[ "$INC_MANDATORY" == "true" ]]; then
                      # v1.0.260: Removed prompt embedding from SKILL FIRST args to save ~800 chars.
                      # The skill reads the user's prompt from conversation context (it's already there).

                      # v1.0.243: Smart interview gate — LLM assesses prompt completeness
                      DEEP_INTERVIEW_MSG=""
                      if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]]; then
                        DEEP_INTERVIEW_MSG=" Assess prompt completeness first — if gaps exist, ask 2-5 targeted questions before calling."
                      fi

                      MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}SKILL FIRST: \`Skill({ skill: \"sw:increment\" })\` — call BEFORE implementation.
Detection: ${INC_REASON} (confidence: ${INC_CONF}).${AGENT_DIRECTIVE}${DEEP_INTERVIEW_MSG}
After increment, chain domain skills per tech stack (see CLAUDE.md Skill Chaining)."
                      output_approve_with_context "$MSG"
                      exit 0
                    else
                      # v1.0.260: Removed prompt embedding to save context budget
                      MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}Increment suggested: \`Skill({ skill: \"sw:increment\" })\` or \`$CMD\`. Reason: $INC_REASON${AGENT_DIRECTIVE}"
                      output_approve_with_context "$MSG"
                      exit 0
                    fi
                    ;;

                  hotfix)
                    # v1.0.260: Removed prompt embedding to save context budget
                    MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}Hotfix detected: \`Skill({ skill: \"sw:increment\", args: \"--type=hotfix\" })\`. Reason: $INC_REASON"
                    output_approve_with_context "$MSG"
                    exit 0
                    ;;

                  reopen)
                    HINT=""
                    [[ -n "$INC_KEYWORD" ]] && HINT=" (look for: *$INC_KEYWORD*)"
                    MSG="${AUTOLOAD_PREFIX}Related to previous work$HINT. Consider: \`/sw:status\` then \`specweave resume <id>\`. Reason: $INC_REASON"
                    output_approve_with_context "$MSG"
                    exit 0
                    ;;

                  small_fix)
                    # v1.0.260: Removed prompt embedding to save context budget
                    CMD_SMALLFIX="/sw:increment"
                    [[ -n "$INC_NAME" ]] && CMD_SMALLFIX="/sw:increment \"$INC_NAME\""

                    MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}Small change — consider tracking: \`Skill({ skill: \"sw:increment\" })\` or \`$CMD_SMALLFIX\`. Reason: $INC_REASON${AGENT_DIRECTIVE}"
                    output_approve_with_context "$MSG"
                    exit 0
                    ;;
                esac
              fi

              # ==================================================================
              # SKILL-ONLY INVOCATION (v1.0.196)
              # Handle skill invocation when NO increment is suggested but LLM
              # recommends a skill (e.g., LSP skill for "find references" prompts)
              # ==================================================================
              if [[ "$ABOVE" != "1" && -n "$SKILL_INVOCATION" ]]; then
                # Build prefix messages
                SKILL_ONLY_PREFIX=""
                [[ -n "$LSP_WARNING_MSG" ]] && SKILL_ONLY_PREFIX="${LSP_WARNING_MSG}"
                [[ -n "$LSP_EXPLICIT_REQUEST_MSG" ]] && SKILL_ONLY_PREFIX="${SKILL_ONLY_PREFIX}${LSP_EXPLICIT_REQUEST_MSG}"

                if [[ "$SKILL_MANDATORY" == "true" ]]; then
                  MSG="${SKILL_ONLY_PREFIX}SKILL REQUIRED: \`Skill({ skill: \"${SKILL_INVOCATION}\" })\` — call before proceeding. ${SKILL_REASON:-Specialized support needed.}"
                  output_approve_with_context "$MSG"
                  exit 0
                else
                  MSG="${SKILL_ONLY_PREFIX}Skill recommended: \`Skill({ skill: \"${SKILL_INVOCATION}\" })\`. ${SKILL_REASON:-Specialized support for this task.}"
                  output_approve_with_context "$MSG"
                  exit 0
                fi
              fi
            fi

            # ==================================================================
            # SKILL ROUTING (from LLM response) - v1.0.150+
            # ==================================================================
            # Extract skill routing for brain message
            ROUTING_SKILLS_COUNT=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills | length // 0' 2>/dev/null)
            ROUTING_MSG=""

            if [[ "$ROUTING_SKILLS_COUNT" -gt 0 ]]; then
              # Extract primary skill
              PRIMARY_SKILL=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .fullName // empty' 2>/dev/null | head -1)
              PRIMARY_INVOKE=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .invokeWhen // "after_increment"' 2>/dev/null | head -1)
              PRIMARY_REASON=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .reason // empty' 2>/dev/null | head -1)

              # Extract secondary skills
              SECONDARY_SKILLS=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "secondary") | .fullName' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

              # Extract workflow info
              SUGGEST_PLAN=$(echo "$JSON_OUTPUT" | jq -r '.routing.workflow.suggestPlanMode // false' 2>/dev/null)
              WORKFLOW_PHASES=$(echo "$JSON_OUTPUT" | jq -r '.routing.workflow.phases[]?' 2>/dev/null | tr '\n' ' ')
              ROUTING_REASON=$(echo "$JSON_OUTPUT" | jq -r '.routing.reasoning // empty' 2>/dev/null)

              echo "[$(date -Iseconds)] routing | primary=${PRIMARY_SKILL:-none} | secondary=${SECONDARY_SKILLS:-none} | invokeWhen=${PRIMARY_INVOKE}" >> "$LAZY_LOAD_LOG"
            fi

            # ==================================================================
            # BUILD BRAIN MESSAGE (combining all analysis)
            # ==================================================================
            # Only show brain message if we have meaningful routing info
            if [[ "$ROUTING_SKILLS_COUNT" -gt 0 || -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
              BRAIN_MSG=""

              # Compact router output — one line per decision
              [[ -n "$PLUGINS_INSTALLED" ]] && BRAIN_MSG+="Plugins loaded: ${PLUGINS_INSTALLED}. "
              [[ -n "$PLUGINS_ALREADY" ]] && BRAIN_MSG+="Plugins active: ${PLUGINS_ALREADY}. "

              if [[ "$INC_ACTION" == "new" || "$INC_ACTION" == "hotfix" ]]; then
                BRAIN_MSG+="Increment: create \\\"${INC_NAME:-new-feature}\\\" (${INC_ACTION}). "
              elif [[ "$INC_ACTION" == "reopen" ]]; then
                BRAIN_MSG+="Increment: reopen existing"
                [[ -n "$INC_KEYWORD" ]] && BRAIN_MSG+=" (${INC_KEYWORD})"
                BRAIN_MSG+=". "
              fi

              if [[ -n "$PRIMARY_SKILL" ]]; then
                # Extract agent type for Task tool
                PRIMARY_PLUGIN=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .plugin // empty' 2>/dev/null | head -1)
                PRIMARY_SKILL_NAME=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .name // empty' 2>/dev/null | head -1)
                BRAIN_MSG+="Primary skill: ${PRIMARY_SKILL}"
                [[ -n "$PRIMARY_PLUGIN" && -n "$PRIMARY_SKILL_NAME" ]] && BRAIN_MSG+=" (agent: ${PRIMARY_PLUGIN}:${PRIMARY_SKILL_NAME}:${PRIMARY_SKILL_NAME})"
                BRAIN_MSG+=", invoke: ${PRIMARY_INVOKE:-after_increment}. "
                [[ -n "$SECONDARY_SKILLS" ]] && BRAIN_MSG+="Also: ${SECONDARY_SKILLS}. "
              fi

              [[ "$SUGGEST_PLAN" == "true" ]] && BRAIN_MSG+="Suggest plan mode. "

              output_approve_with_context "$BRAIN_MSG"
              exit 0
            fi

            # If plugins loaded but no routing, show just plugins (fallback)
            if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
              output_approve_with_context "$AUTOLOAD_PLUGINS_MSG"
              exit 0
            fi
          else
            # JSON_OUTPUT was empty - LLM detection failed
            LLM_DETECTION_FAILED=true
            echo "[$(date -Iseconds)] LLM detection failed | reason=empty_json_output" >> "$LAZY_LOAD_LOG"
          fi
        else
          # DETECT_OUTPUT was empty or jq not available
          LLM_DETECTION_FAILED=true
          echo "[$(date -Iseconds)] LLM detection failed | reason=empty_detect_output_or_no_jq" >> "$LAZY_LOAD_LOG"
        fi

        # ==================================================================
        # KEYWORD FALLBACK FOR INCREMENT DISCIPLINE (v1.0.257)
        # ==================================================================
        # Plugin keyword fallback was removed in v1.0.159 (too aggressive for
        # auto-installing plugins). But INCREMENT DISCIPLINE still needs a
        # fallback when LLM detection fails/times out. Without this, prompts
        # like "big test react component" silently bypass spec-first discipline.
        #
        # This fallback ONLY handles increment suggestions (not plugin installs).
        if [[ "$LLM_DETECTION_FAILED" == "true" && "$INCREMENT_ASSIST_ENABLED" == "true" ]]; then
          # Check for implementation-intent keywords
          # v1.0.261: Expanded from 20 to 65+ keywords across 9 categories:
          # Original, Investigation, Analysis, Problem-solving, Optimization,
          # Security, Documentation, DevOps/Data, Structural
          if echo "$PROMPT" | grep -qiE "(test|component|feature|fix|refactor|setup|configure|integrate|migrate|upgrade|write|style|design|add|create|implement|build|develop|deploy|scaffold|generate|investigate|debug|troubleshoot|diagnose|trace|profile|examine|inspect|reproduce|replicate|analyze|assess|audit|evaluate|benchmark|measure|validate|solve|resolve|address|tackle|determine|optimize|improve|reduce|minimize|eliminate|simplify|streamline|secure|harden|patch|sanitize|encrypt|document|provision|containerize|dockerize|seed|populate|import|export|transform|sync|batch|remove|delete|replace|convert|extract|merge|split|wrap|unwrap|decouple|modularize)"; then
            # Exclude PURE questions but NOT investigation/work prompts
            # v1.0.261: "why" and "how" removed — they almost always imply work intent
            # ("why does X fail" = investigation, "how do I fix X" = work)
            # Patterns made more specific to avoid false negatives
            if ! echo "$PROMPT" | grep -qiE "^[[:space:]]*(what is|what are|explain|tell me about|can you explain|does .* support|should I use|is there a|where is|when did|which one)" && \
               ! echo "$PROMPT" | grep -qE "\?[[:space:]]*$"; then
              # v1.0.260: Removed prompt embedding to save context budget
              if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" ]]; then
                FALLBACK_MSG="SKILL FIRST: \`Skill({ skill: \"sw:increment\" })\` — call BEFORE implementation.
Detection: Implementation keywords detected (LLM unavailable, keyword fallback).
After increment, chain domain skills per tech stack (see CLAUDE.md Skill Chaining)."
              else
                FALLBACK_MSG="Increment suggested: \`Skill({ skill: \"sw:increment\" })\`. Reason: Implementation keywords detected (LLM unavailable, keyword fallback)."
              fi
              echo "[$(date -Iseconds)] keyword-fallback | prompt_keywords_matched=true | mandatory=$INCREMENT_MANDATORY_CONFIG" >> "$LAZY_LOAD_LOG"
              output_approve_with_context "$FALLBACK_MSG"
              exit 0
            fi
          fi

          # ==================================================================
          # ERROR-STATE DETECTION: symptom-based prompts (v1.0.261)
          # ==================================================================
          # Catches prompts describing failure states without action verbs:
          # "the dashboard is broken", "login keeps failing", "app crashes on mobile"
          # Only runs when LLM failed AND primary keyword regex didn't match.
          if echo "$PROMPT" | grep -qiE "(is broken|keeps? failing|crash(es|ing)|hang(s|ing)|times? out|is slow|memory leak|performance issue|not working|throwing error|exception|stack trace|segfault|deadlock|race condition)"; then
            # Require 3+ words for context (not just bare "is broken")
            WORD_COUNT=$(echo "$PROMPT" | wc -w | tr -d ' ')
            if [[ "$WORD_COUNT" -ge 3 ]]; then
              if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" ]]; then
                FALLBACK_MSG="SKILL FIRST: \`Skill({ skill: \"sw:increment\" })\` — call BEFORE implementation.
Detection: Error/failure state detected (LLM unavailable, symptom fallback).
After increment, chain domain skills per tech stack (see CLAUDE.md Skill Chaining)."
              else
                FALLBACK_MSG="Increment suggested: \`Skill({ skill: \"sw:increment\" })\`. Reason: Error/failure state detected (LLM unavailable, symptom fallback)."
              fi
              echo "[$(date -Iseconds)] symptom-fallback | prompt_symptom_matched=true | mandatory=$INCREMENT_MANDATORY_CONFIG" >> "$LAZY_LOAD_LOG"
              output_approve_with_context "$FALLBACK_MSG"
              exit 0
            fi
          fi
        fi
      fi
    fi
  fi
fi

# ==============================================================================
# TDD MODE CONTEXT INJECTION (v1.0.148) - Ensure Claude ALWAYS knows TDD status
# ==============================================================================
# Priority (highest to lowest):
#   1. Command flag: --tdd or --strict in prompt
#   2. Increment metadata: .specweave/increments/<active>/metadata.json
#   3. Global config: .specweave/config.json
#
# When TDD is enabled, injects context into systemMessage so Claude:
#   - Always knows to follow RED→GREEN→REFACTOR discipline
#   - Uses /sw:tdd-cycle for guided workflow
#   - Blocks or warns on out-of-order task completion (based on enforcement)

TDD_MODE="off"
TDD_ENFORCEMENT="warn"
TDD_SOURCE=""
TDD_MSG=""

# Only check TDD if we're in a SpecWeave project (use resolved project root)
if [[ -n "$SW_PROJECT_ROOT" ]] && [[ -d "$SW_PROJECT_ROOT/.specweave" ]]; then

  # Step 1: Check global config (LOWEST priority)
  if [[ -f "$SW_PROJECT_ROOT/.specweave/config.json" ]] && command -v jq >/dev/null 2>&1; then
    GLOBAL_TDD=$(jq -r '.testing.defaultTestMode // "test-after"' "$SW_PROJECT_ROOT/.specweave/config.json" 2>/dev/null)
    GLOBAL_ENFORCEMENT=$(jq -r '.testing.tddEnforcement // "warn"' "$SW_PROJECT_ROOT/.specweave/config.json" 2>/dev/null)
    if [[ "$GLOBAL_TDD" == "TDD" || "$GLOBAL_TDD" == "tdd" ]]; then
      TDD_MODE="TDD"
      TDD_ENFORCEMENT="$GLOBAL_ENFORCEMENT"
      TDD_SOURCE="global config"
    fi
  fi

  # Step 2: Check active increment metadata (MEDIUM priority - overrides global)
  ACTIVE_INCREMENT=""
  for meta in "$SW_PROJECT_ROOT/.specweave/increments/"/*/metadata.json; do
    [[ -f "$meta" ]] || continue
    if jq -e '.status == "in-progress" or .status == "active"' "$meta" >/dev/null 2>&1; then
      ACTIVE_INCREMENT="$meta"
      break
    fi
  done

  if [[ -n "$ACTIVE_INCREMENT" ]] && command -v jq >/dev/null 2>&1; then
    INC_TDD=$(jq -r '.testMode // .tddMode // ""' "$ACTIVE_INCREMENT" 2>/dev/null)
    INC_ENFORCEMENT=$(jq -r '.tddEnforcement // ""' "$ACTIVE_INCREMENT" 2>/dev/null)
    if [[ "$INC_TDD" == "TDD" || "$INC_TDD" == "tdd" || "$INC_TDD" == "true" ]]; then
      TDD_MODE="TDD"
      [[ -n "$INC_ENFORCEMENT" ]] && TDD_ENFORCEMENT="$INC_ENFORCEMENT"
      TDD_SOURCE="increment metadata"
    elif [[ "$INC_TDD" == "test-after" || "$INC_TDD" == "false" ]]; then
      # Increment explicitly disables TDD (overrides global)
      TDD_MODE="off"
      TDD_SOURCE="increment metadata (disabled)"
    fi
  fi

  # Step 3: Check command flags in prompt (HIGHEST priority)
  if echo "$PROMPT" | grep -qE '\-\-tdd|\-\-strict'; then
    TDD_MODE="TDD"
    TDD_ENFORCEMENT="strict"
    TDD_SOURCE="command flag"
  elif echo "$PROMPT" | grep -qE '\-\-no-tdd'; then
    TDD_MODE="off"
    TDD_SOURCE="command flag (disabled)"
  fi

  # Inject TDD context if enabled
  if [[ "$TDD_MODE" == "TDD" ]]; then
    ENFORCEMENT_DESC="warns but allows"
    [[ "$TDD_ENFORCEMENT" == "strict" ]] && ENFORCEMENT_DESC="BLOCKS violations"

    # v1.0.160: STRICT TDD adds mandatory blocking directive
    if [[ "$TDD_ENFORCEMENT" == "strict" ]]; then
      TDD_MSG="STRICT TDD ACTIVE (source: ${TDD_SOURCE}). RED->GREEN->REFACTOR enforced. No implementation before failing test. Use /sw:tdd-cycle."
    fi

    # v1.0.201: Include LSP instructions BEFORE TDD message
    # This ensures LSP guidance is included in ALL early exits
    if [[ -n "$LSP_EXPLICIT_REQUEST_MSG" ]]; then
      if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
        AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}${LSP_EXPLICIT_REQUEST_MSG}"
      else
        AUTOLOAD_PLUGINS_MSG="$LSP_EXPLICIT_REQUEST_MSG"
      fi
    fi

    # Append TDD message
    if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
      AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}${TDD_MSG}"
    else
      AUTOLOAD_PLUGINS_MSG="$TDD_MSG"
    fi

    # Log TDD activation (use project root, never create dirs at $HOME)
    if [[ -n "$SW_PROJECT_ROOT" ]]; then
      TDD_LOG="$SW_PROJECT_ROOT/.specweave/logs/tdd-enforcement.log"
      echo "[$(date -Iseconds)] TDD_MODE=$TDD_MODE | enforcement=$TDD_ENFORCEMENT | source=$TDD_SOURCE" >> "$TDD_LOG" 2>/dev/null
    fi
  fi
fi

# CRITICAL: Exit immediately for non-SpecWeave prompts
# This covers 90%+ of prompts with <5ms overhead
# v1.0.144: Still show plugin autoload message if plugins are being loaded
# v1.0.155: AUTOLOAD_PLUGINS_MSG now includes new plugin warnings from helper function
# v1.0.257: Expanded keywords to catch implementation prompts that bypass LLM detection
if ! echo "$PROMPT" | grep -qiE "(specweave|/sw:|increment|add|create|implement|build|develop|test|component|feature|fix|refactor|write|style|setup|configure|migrate|deploy|scaffold)"; then
  if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
    # Show plugin loading feedback even for non-SpecWeave prompts
    output_approve_with_context "$AUTOLOAD_PLUGINS_MSG"
  else
    echo '{"decision":"approve"}'
  fi
  exit 0
fi

# ==============================================================================
# EARLY EXIT FOR NON-SPECWEAVE PROJECTS (T-006 - v0.26.15)
# ==============================================================================
# Even if prompt contains SpecWeave keywords, exit if no .specweave directory
# v1.0.144: Still show plugin autoload message for non-SpecWeave projects
# Use SW_PROJECT_ROOT to avoid creating dirs relative to CWD
if [[ -n "$SW_PROJECT_ROOT" ]]; then
  SPECWEAVE_DIR="$SW_PROJECT_ROOT/.specweave"
else
  SPECWEAVE_DIR=".specweave"
fi
if [[ ! -d "$SPECWEAVE_DIR" ]]; then
  if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
    # Show plugin loading feedback even for non-SpecWeave projects
    output_approve_with_context "$AUTOLOAD_PLUGINS_MSG"
  else
    echo '{"decision":"approve"}'
  fi
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

# NOTE: output_approve_with_context() is defined earlier in the file (line ~105)
# It uses hookSpecificOutput.additionalContext (NOT systemMessage!)

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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
  exit 0
fi

# /sw:grill → Load increment context for code review (pure bash, ~50ms)
# Unlike /sw:progress which displays data, this injects CONTEXT + INSTRUCTIONS
# so the LLM performs a structured code review with full increment awareness.
if echo "$PROMPT" | grep -qE "^/sw:grill($| )"; then
  ARGS=$(extract_command_args "$PROMPT" "/sw:grill")

  if [[ -f "$SCRIPTS_DIR/read-grill-context.sh" ]]; then
    OUTPUT=$(cd "$(pwd)" && bash "$SCRIPTS_DIR/read-grill-context.sh" $ARGS 2>&1)
  else
    OUTPUT="GRILL MODE ACTIVATED — Run a thorough code review of the active increment. Check correctness, security, performance, and maintainability. Categorize issues as BLOCKER, CRITICAL, MAJOR, MINOR, or SUGGESTION. End with VERDICT: PASS or FAIL."
  fi

  output_approve_with_context "$OUTPUT"
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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
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

  # Unified response for both CLI and VSCode (v1.0.166)
  # Uses additionalContext (NOT systemMessage) to inject output into Claude's context
  output_approve_with_context "$OUTPUT"
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

    if [[ "$status" == "active" || "$status" == "planning" || "$status" == "ready_for_review" ]]; then
      inc_id=$(basename "$(dirname "$metadata_file")")
      ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
      ACTIVE_LIST="${ACTIVE_LIST}  - $inc_id [$inc_type]\n"
      [[ -z "$ACTIVE_INCREMENT" ]] && ACTIVE_INCREMENT="$inc_id"
    fi
  done < <(find "$SPECWEAVE_DIR/increments" -maxdepth 2 -name "metadata.json" -not -path "*/_archive/*" 2>/dev/null)
fi

# ==============================================================================
# WIP WARNING BUILDER (reusable across all increment suggestion paths)
# ==============================================================================
# Builds a soft warning string when active increments >= configured limit.
# Never blocks — just informs. Prepended to increment suggestion messages.
WIP_WARNING=""
if [[ "$ACTIVE_COUNT" -gt 0 ]]; then
  _WIP_CONFIG="${SPECWEAVE_DIR}/config.json"
  _WIP_LIMIT=3
  if [[ -f "$_WIP_CONFIG" ]] && command -v jq >/dev/null 2>&1; then
    _WIP_LIMIT=$(jq -r '.limits.maxActiveIncrements // 3' "$_WIP_CONFIG" 2>/dev/null || echo "3")
  fi
  [[ ! "$_WIP_LIMIT" =~ ^[0-9]+$ ]] && _WIP_LIMIT=3

  if [[ "$ACTIVE_COUNT" -ge "$_WIP_LIMIT" ]]; then
    WIP_WARNING="⚠️ **WIP Notice** (${ACTIVE_COUNT}/${_WIP_LIMIT} active)\\n\\nActive increments:\\n${ACTIVE_LIST}\\nConsider completing existing work first (\`/sw:done <id>\`) or pausing (\`specweave pause <id>\`).\\n\\n---\\n\\n"
  fi
fi

# ==============================================================================
# ARCHIVE SUGGESTION (v1.0.257 - Auto-archive when too many increments)
# ==============================================================================
# When total numbered increment directories exceed threshold, suggest archiving.
# In auto mode: archive silently. Interactive: inject suggestion for LLM.
# Rate-limited: once per day via marker file.
ARCHIVE_SUGGESTION_MSG=""
if [[ -d "$SPECWEAVE_DIR/increments" ]]; then
  TOTAL_INCREMENT_DIRS=$(ls -d "$SPECWEAVE_DIR/increments"/[0-9]* 2>/dev/null | wc -l | tr -d ' ')

  # Read threshold from config (default: 10)
  _ARCHIVE_THRESHOLD=10
  if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
    _ARCHIVE_THRESHOLD=$(jq -r '.archiving.autoArchiveThreshold // 10' "$CONFIG_PATH" 2>/dev/null || echo "10")
  fi
  [[ ! "$_ARCHIVE_THRESHOLD" =~ ^[0-9]+$ ]] && _ARCHIVE_THRESHOLD=10

  if [[ "$TOTAL_INCREMENT_DIRS" -ge "$_ARCHIVE_THRESHOLD" ]]; then
    # Rate limit: once per day via marker file
    ARCHIVE_MARKER="$SPECWEAVE_DIR/state/archive-suggestion.marker"
    SHOULD_SUGGEST=true
    if [[ -f "$ARCHIVE_MARKER" ]]; then
      MARKER_DATE=$(cat "$ARCHIVE_MARKER" 2>/dev/null | head -1)
      TODAY=$(date +%Y-%m-%d)
      [[ "$MARKER_DATE" == "$TODAY" ]] && SHOULD_SUGGEST=false
    fi

    if [[ "$SHOULD_SUGGEST" == "true" ]]; then
      # Check if in auto mode
      AUTO_STATE_FILE="$SPECWEAVE_DIR/state/auto.json"
      IN_AUTO_MODE=false
      if [[ -f "$AUTO_STATE_FILE" ]] && command -v jq >/dev/null 2>&1; then
        AUTO_STATUS=$(jq -r '.status // "idle"' "$AUTO_STATE_FILE" 2>/dev/null)
        [[ "$AUTO_STATUS" == "running" ]] && IN_AUTO_MODE=true
      fi

      if [[ "$IN_AUTO_MODE" == "true" ]]; then
        # Auto mode: archive silently in background
        if command -v specweave >/dev/null 2>&1; then
          specweave archive --keep-last 10 2>/dev/null &
        fi
      else
        # Interactive: suggest to LLM
        ARCHIVE_SUGGESTION_MSG="⚠️ **Archive suggested**: ${TOTAL_INCREMENT_DIRS} increments in workspace (threshold: ${_ARCHIVE_THRESHOLD}). Run: \`specweave archive --keep-last 10\`\n\n"
      fi

      # Write today's date as marker
      mkdir -p "$(dirname "$ARCHIVE_MARKER")" 2>/dev/null
      echo "$(date +%Y-%m-%d)" > "$ARCHIVE_MARKER" 2>/dev/null || true
    fi
  fi
fi

# ==============================================================================
# SMART INTERVIEW GATE (v1.0.243 - LLM-Driven Prompt Assessment)
# ==============================================================================
# When Deep Interview Mode is enabled AND no active increment exists,
# inject instructions for the LLM to assess prompt completeness.
# The LLM decides: ask targeted questions OR proceed to increment creation.
# Fires on EVERY prompt until an increment is created.
# See ADR-0243 for architecture decision.

SMART_INTERVIEW_GATE_MSG=""
if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]] && [[ -z "$ACTIVE_INCREMENT" ]]; then
  # Also check active-increment.json state file as secondary source
  HAVE_ACTIVE_STATE=false
  STATE_FILE="$SPECWEAVE_DIR/state/active-increment.json"
  if [[ -f "$STATE_FILE" ]] && command -v jq >/dev/null 2>&1; then
    ACTIVE_IDS=$(jq -r '.ids // [] | length' "$STATE_FILE" 2>/dev/null || echo "0")
    [[ "$ACTIVE_IDS" -gt 0 ]] && HAVE_ACTIVE_STATE=true
  fi

  if [[ "$HAVE_ACTIVE_STATE" != "true" ]]; then
    SMART_INTERVIEW_GATE_MSG="No active increment. Assess prompt completeness for complexity — if gaps, ask 2-5 targeted questions. If sufficient, call sw:increment."
  fi
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

  # WIP + PROJECT CONTEXT: Combine WIP_WARNING (built earlier) with project context
  # Never blocks — always approve with informational context
  COMBINED_CONTEXT="${WIP_WARNING}${PROJECT_CONTEXT}"
  if [[ -n "$COMBINED_CONTEXT" ]]; then
    output_approve_with_context "$COMBINED_CONTEXT"
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
      output_approve_with_context "⚠️ Spec changes detected in ${ACTIVE_INCREMENT}\n\nspec.md has been modified after plan.md.\nConsider running /sw:sync-docs to update living documentation."
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

# Command suggestions removed (v1.0.257) — already in CLAUDE.md, reduces per-turn context

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
# OUTPUT: Priority-based context assembly with budget (v1.0.260)
# ==============================================================================
# Assembles final message by adding context items in priority order,
# stopping when the budget is exhausted. This prevents blind concatenation
# that wastes budget on low-priority items while truncating critical ones.
#
# Priority tiers:
#   P1 (critical): Plugin status (RESTART/Using), active increment status
#   P2 (important): LSP explicit request, WIP/interview gate
#   P3 (informational): LSP setup/install suggestions, archive suggestion

# ==============================================================================
# CONTEXT BUDGET RESOLUTION (v1.0.262)
# ==============================================================================
# 1. Read base level from config.json (contextBudget.level)
# 2. If autoAdapt=true, check context-pressure.json and step down
# 3. Map level to char budget
# 4. Environment override: SPECWEAVE_CONTEXT_BUDGET

BUDGET_LEVEL="full"
AUTO_ADAPT=true
if [[ -f "$CONFIG_PATH" ]] && command -v jq >/dev/null 2>&1; then
  BUDGET_LEVEL=$(jq -r '.contextBudget.level // "full"' "$CONFIG_PATH" 2>/dev/null || echo "full")
  AUTO_ADAPT_VAL=$(jq -r '.contextBudget.autoAdapt // true' "$CONFIG_PATH" 2>/dev/null || echo "true")
  [[ "$AUTO_ADAPT_VAL" == "false" ]] && AUTO_ADAPT=false
fi

# Environment override (for quick testing without config changes)
[[ -n "${SPECWEAVE_CONTEXT_BUDGET:-}" ]] && BUDGET_LEVEL="$SPECWEAVE_CONTEXT_BUDGET"

# Auto-adapt: check pressure state from PreCompact hook
if [[ "$AUTO_ADAPT" == "true" ]] && [[ -n "$SW_PROJECT_ROOT" ]]; then
  PRESSURE_FILE="$SW_PROJECT_ROOT/.specweave/state/context-pressure.json"
  if [[ -f "$PRESSURE_FILE" ]] && command -v jq >/dev/null 2>&1; then
    PRESSURE_LEVEL=$(jq -r '.level // "normal"' "$PRESSURE_FILE" 2>/dev/null || echo "normal")
    case "$PRESSURE_LEVEL" in
      elevated)
        # Step down one level
        case "$BUDGET_LEVEL" in
          full) BUDGET_LEVEL="compact" ;;
          compact) BUDGET_LEVEL="minimal" ;;
        esac
        ;;
      critical)
        # Jump to minimal regardless of base
        [[ "$BUDGET_LEVEL" != "off" ]] && BUDGET_LEVEL="minimal"
        ;;
      emergency)
        # Nuclear option: strip ALL context (v1.0.268 - 3+ compactions)
        BUDGET_LEVEL="off"
        ;;
    esac
  fi
fi

# Map level to char budget
case "$BUDGET_LEVEL" in
  full)    CONTEXT_BUDGET=2500 ;;
  compact) CONTEXT_BUDGET=1000 ;;
  minimal) CONTEXT_BUDGET=300  ;;
  off)     CONTEXT_BUDGET=0    ;;
  *)       CONTEXT_BUDGET=2500 ;;
esac

# If budget is 0, skip all context assembly
if [[ "$CONTEXT_BUDGET" -eq 0 ]]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Helper: Append message to FINAL_MESSAGE if it fits within budget
# Args: $1=message to append
# Returns: 0 if appended, 1 if skipped (budget exceeded)
_budget_append() {
  local msg="$1"
  [[ -z "$msg" ]] && return 0
  local new_len=$(( ${#FINAL_MESSAGE} + ${#msg} ))
  if [[ $new_len -le $CONTEXT_BUDGET ]]; then
    FINAL_MESSAGE="${FINAL_MESSAGE}${msg}"
    return 0
  fi
  return 1
}

FINAL_MESSAGE=""

# P1: Critical — plugin status and active increment
_budget_append "$AUTOLOAD_PLUGINS_MSG"
_budget_append "$CONTEXT"

# P2: Important — LSP explicit request, interview gate
_budget_append "$LSP_EXPLICIT_REQUEST_MSG"
if [[ -n "$SMART_INTERVIEW_GATE_MSG" ]]; then
  _budget_append "\\n${SMART_INTERVIEW_GATE_MSG}"
fi

# P3: Informational — LSP setup, archive, environment
_budget_append "$LSP_ENV_SETUP_MSG"
_budget_append "$LSP_INSTALL_MSG"
_budget_append "$LSP_SETUP_SUGGESTION_MSG"
_budget_append "$ARCHIVE_SUGGESTION_MSG"

# ==============================================================================
# TURN DEDUPLICATION: Skip identical context to save tokens (v1.0.262)
# ==============================================================================
# If this turn's context is identical to last turn's, don't re-inject it.
# Claude already has it in history. Saves ~2500 chars per duplicate turn.
if [[ -n "$FINAL_MESSAGE" ]] && [[ -n "$SW_PROJECT_ROOT" ]]; then
  DEDUP_HASH_FILE="$SW_PROJECT_ROOT/.specweave/state/.context-hash"
  CURRENT_HASH=""
  if command -v md5sum >/dev/null 2>&1; then
    CURRENT_HASH=$(printf '%s' "$FINAL_MESSAGE" | md5sum | cut -d' ' -f1)
  elif command -v md5 >/dev/null 2>&1; then
    CURRENT_HASH=$(printf '%s' "$FINAL_MESSAGE" | md5)
  fi

  if [[ -n "$CURRENT_HASH" ]]; then
    if [[ -f "$DEDUP_HASH_FILE" ]]; then
      PREV_HASH=$(cat "$DEDUP_HASH_FILE" 2>/dev/null)
      if [[ "$CURRENT_HASH" == "$PREV_HASH" ]]; then
        # Identical to last turn — skip injection
        echo '{"decision":"approve"}'
        exit 0
      fi
    fi
    # Save hash for next turn
    echo "$CURRENT_HASH" > "$DEDUP_HASH_FILE" 2>/dev/null
  fi
fi

if [[ -n "$FINAL_MESSAGE" ]]; then
  output_approve_with_context "$FINAL_MESSAGE"
else
  echo '{"decision":"approve"}'
fi

exit 0
