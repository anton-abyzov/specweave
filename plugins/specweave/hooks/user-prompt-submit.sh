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
#   * Shows domain skills to use after sw:increment-planner
#   * Points to CLAUDE.md "MANDATORY: Skill Chaining" section
# - v1.0.175: CRITICAL FIX - Use installed_plugins.json as SOURCE OF TRUTH
#   * Reads ~/.claude/plugins/installed_plugins.json directly (eliminates false restart warnings)
#   * `claude plugin list` can have timing/buffering issues → unreliable for detection
#   * Primary: check_plugin_installed_from_json() using jq (fast, accurate)
#   * Fallback: `claude plugin list` only if jq unavailable
#   * Post-install verification: re-checks registry after install to confirm success
#   * Increased timeouts: 5s → 10s for CLI operations (reduces timing issues)
#   * Guard against false positives: if install says "success" but not in registry → treat as already installed
# - v1.0.169: DIRECT SKILL INVOCATION - Call sw:increment-planner directly (not wrapper)
#   * Skips 2-level indirection (hook → sw:increment command → sw:increment-planner skill)
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

# ==============================================================================
# PROJECT ROOT DETECTION (walk up to find .specweave/ — prevents folder pollution)
# ==============================================================================
SW_PROJECT_ROOT=""
_swdir="$PWD"
while [[ "$_swdir" != "/" ]]; do
  if [[ -d "$_swdir/.specweave" ]]; then
    SW_PROJECT_ROOT="$_swdir"
    break
  fi
  _swdir=$(dirname "$_swdir")
done

# Check config for pluginAutoLoad.enabled, suggestOnly and incrementAssist.enabled settings
PLUGIN_AUTOLOAD_ENABLED=true
PLUGIN_SUGGEST_ONLY=false
INCREMENT_ASSIST_ENABLED=true
INCREMENT_CONFIDENCE_THRESHOLD=0.7
INCREMENT_MANDATORY_CONFIG=false
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
    MANDATORY_CONFIG_VALUE=$(jq -r '.incrementAssist.mandatory // false' "$CONFIG_PATH" 2>/dev/null)
    [[ "$MANDATORY_CONFIG_VALUE" == "true" ]] && INCREMENT_MANDATORY_CONFIG=true

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

# Helper: Output approve response with context (Claude Code hook format v1.0.166)
# CRITICAL: systemMessage is NOT a valid field for UserPromptSubmit hooks!
# Use hookSpecificOutput.additionalContext instead.
# See: https://docs.claude.com/en/docs/claude-code/hooks
output_approve_with_context() {
  local context="$1"
  local escaped
  escaped=$(escape_json_early "$context")
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$escaped"
}

# Helper: Get skill memory content for injection (v1.0.198)
# Reads .specweave/skill-memories/{skill}.md and extracts learnings.
# Args: $1=full skill name (e.g., "sw:pm", "sw-frontend:frontend-architect")
# Returns: Formatted memory content on stdout, or empty string if not found
get_skill_memory_context() {
  local full_skill="$1"
  local project_root="${SW_PROJECT_ROOT:-${PROJECT_ROOT:-$(pwd)}}"

  # Not a SpecWeave project — no skill memories to load
  [[ ! -d "$project_root/.specweave" ]] && return 0

  # Extract skill name (part after colon, or whole string if no colon)
  local skill_name="${full_skill##*:}"

  local memory_file="$project_root/.specweave/skill-memories/${skill_name}.md"

  if [[ ! -f "$memory_file" ]]; then
    return 0
  fi

  # Read the file and extract learnings section
  local content
  content=$(cat "$memory_file" 2>/dev/null)

  # Extract lines between "## Learnings" and next heading or EOF
  local learnings
  learnings=$(echo "$content" | sed -n '/^## Learnings$/,/^## /{ /^## Learnings$/d; /^## /d; p; }' | sed '/^$/d')

  if [[ -z "$learnings" ]]; then
    return 0
  fi

  # Format for injection
  printf '📚 **Skill Memory for %s**:\\n%s' "$skill_name" "$learnings"
}

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
# │ • Questions: "how do I", "what is", "explain", "why does"                  │
# │ • Exploration: "show me", "find", "search for", "list"                     │
# │ • Commands: "run tests", "build", "deploy", "commit"                       │
# │ • Already in workflow: prompt starts with /sw:                              │
# │ • Chat/greetings: "hello", "thanks", general conversation                  │
# │ • EXPLICIT OPT-OUT:                                                         │
# │   - "don't create an increment", "no increment needed", "skip workflow"    │
# │   - "just a quick fix", "without tracking", "no spec needed"               │
# │   - "don't reopen", "leave it closed" (for completed increments)           │
# │   - "I'll track it myself", "already in an increment"                      │
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
      LSP_WARNING_MSG="⚡ **LSP: Install language servers for 100x faster code intelligence**

The following language servers are not installed:
$MISSING_SERVERS

LSP provides semantic code understanding (findReferences, goToDefinition, diagnostics).
Without it, Claude uses text search which is slower and less accurate.

📖 Guide: https://spec-weave.com/docs/guides/lsp-integration

---

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
        # Setup logging
        LAZY_LOAD_LOG="$HOME/.specweave/logs/lazy-loading.log"
        mkdir -p "$(dirname "$LAZY_LOAD_LOG")" 2>/dev/null

        # Per-session cache to avoid redundant LLM calls (30 min TTL)
        PROMPT_CACHE_DIR="$HOME/.specweave/state/prompt-cache"
        mkdir -p "$PROMPT_CACHE_DIR" 2>/dev/null
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
                    # v1.0.171: STRICT BLOCKING restart warning with explicit tool blocklist
                    # Truncate prompt for display (max 500 chars to avoid bloat)
                    PROMPT_DISPLAY="${PROMPT:0:500}"
                    [[ ${#PROMPT} -gt 500 ]] && PROMPT_DISPLAY="${PROMPT_DISPLAY}..."
                    # Escape for JSON/markdown
                    PROMPT_DISPLAY=$(echo "$PROMPT_DISPLAY" | sed 's/\\/\\\\/g; s/"/\\"/g; s/`/\\`/g')

                    AUTOLOAD_PLUGINS_MSG="\\n╔══════════════════════════════════════════════════════════════════════════════╗\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}║  🛑 FULL STOP - RESTART REQUIRED - DO NOT PROCEED                             ║\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}╚══════════════════════════════════════════════════════════════════════════════╝\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}**Plugins installed**: ${PLUGINS_INSTALLED}\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}These plugins are NOT available in the current session. A restart is MANDATORY.\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}┌──────────────────────────────────────────────────────────────────────────────┐\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ⛔ YOU ARE BLOCKED FROM THE FOLLOWING ACTIONS:                              │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}├──────────────────────────────────────────────────────────────────────────────┤\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ❌ Write tool      - BLOCKED (cannot create files)                          │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ❌ Edit tool       - BLOCKED (cannot modify files)                          │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ❌ Bash tool       - BLOCKED (except read-only commands)                    │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ❌ Task tool       - BLOCKED (agents need plugins)                          │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ❌ Implementation  - BLOCKED (no coding until restart)                      │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}└──────────────────────────────────────────────────────────────────────────────┘\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}┌──────────────────────────────────────────────────────────────────────────────┐\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  ✅ YOUR ONLY ALLOWED ACTIONS:                                               │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}├──────────────────────────────────────────────────────────────────────────────┤\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  1. Display this restart warning to user                                     │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  2. Provide the prompt below for user to copy                                │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}│  3. STOP and wait for user to restart                                        │\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}└──────────────────────────────────────────────────────────────────────────────┘\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}**To restart:**\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}  • VSCode: \\\`Cmd+Shift+P\\\` → 'Claude: New Session'\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}  • CLI: Exit and run \\\`claude\\\` again\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}**Your prompt (copy this):**\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}\\\`\\\`\\\`\\n${PROMPT_DISPLAY}\\n\\\`\\\`\\\`\\n\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}════════════════════════════════════════════════════════════════════════════════\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}**Claude: DO NOT ignore this. DO NOT 'help anyway'. STOP COMPLETELY.**\\n"
                    AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}════════════════════════════════════════════════════════════════════════════════\\n"
                  elif [[ -n "$PLUGINS_ALREADY" ]]; then
                    AUTOLOAD_PLUGINS_MSG="🔌 **Using plugins**: ${PLUGINS_ALREADY}\\n"
                  fi
                  if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
                    LLM_REASON=$(echo "$JSON_OUTPUT" | jq -r '.reasoning // empty' 2>/dev/null)
                    [[ -n "$LLM_REASON" ]] && AUTOLOAD_PLUGINS_MSG="${AUTOLOAD_PLUGINS_MSG}*${LLM_REASON}*\\n\\n---\\n"
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
                # v1.0.198: Added skill memory injection
                if [[ -n "$SKILL_INVOCATION" ]]; then
                  # Get skill memory for injection (v1.0.198)
                  SKILL_MEMORY=""
                  SKILL_MEMORY_RAW=$(get_skill_memory_context "$SKILL_INVOCATION")
                  if [[ -n "$SKILL_MEMORY_RAW" ]]; then
                    SKILL_MEMORY="

${SKILL_MEMORY_RAW}

---
"
                  fi

                  if [[ "$SKILL_MANDATORY" == "true" ]]; then
                    AGENT_DIRECTIVE="

---
${SKILL_MEMORY}
<skill_invocation_required>
### 🎯 MANDATORY: Use ${SKILL_INVOCATION} Skill

You MUST invoke this skill for this task. Do NOT implement directly without using this skill.

**Invoke NOW using Skill tool:**
\\\`\\\`\\\`typescript
Skill({ skill: \\\"${SKILL_INVOCATION}\\\" })
\\\`\\\`\\\`

**Why this skill is required:**
${SKILL_REASON:-This skill provides specialized support for your task.}

⚠️ **Do NOT skip this** - the skill has domain expertise needed for quality implementation.
</skill_invocation_required>"
                  else
                    AGENT_DIRECTIVE="

---
${SKILL_MEMORY}
### 💡 Recommended: Use ${SKILL_INVOCATION} Skill

Consider invoking this skill for better results:
\\\`\\\`\\\`typescript
Skill({ skill: \\\"${SKILL_INVOCATION}\\\" })
\\\`\\\`\\\`
*${SKILL_REASON:-This skill provides specialized support for your task.}*"
                  fi
                elif [[ "$ROUTING_SKILLS_COUNT" -gt 0 ]]; then
                  PRIMARY_PLUGIN=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .plugin // empty' 2>/dev/null | head -1)
                  PRIMARY_SKILL_NAME=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .name // empty' 2>/dev/null | head -1)
                  PRIMARY_REASON=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .reason // empty' 2>/dev/null | head -1)
                  if [[ -n "$PRIMARY_PLUGIN" && -n "$PRIMARY_SKILL_NAME" ]]; then
                    AGENT_TYPE="${PRIMARY_PLUGIN}:${PRIMARY_SKILL_NAME}:${PRIMARY_SKILL_NAME}"
                    AGENT_DIRECTIVE="

---

### 🚀 Then SPAWN Specialized Agent

**After creating increment, use Task tool:**
\\\`\\\`\\\`typescript
Task({
  subagent_type: \\\"${AGENT_TYPE}\\\",
  prompt: \\\"Implement the feature...\\\",
  description: \\\"${PRIMARY_REASON:-Implementation}\\\"
})
\\\`\\\`\\\`
*Specialized agents produce better code than direct implementation.*"
                  fi
                fi

                case "$INC_ACTION" in
                  new)
                    CMD="/sw:increment"
                    [[ -n "$INC_NAME" ]] && CMD="/sw:increment \"$INC_NAME\""

                    # v1.0.169: Call sw:increment-planner DIRECTLY (not wrapper)
                    # Pass FULL user prompt so skill can extract all context
                    # INC_MANDATORY comes from detect-intent LLM response
                    if [[ "$INC_MANDATORY" == "true" ]]; then
                      # Escape the full prompt for JSON embedding
                      # Use printf to handle special chars, then escape for nested JSON
                      ESCAPED_PROMPT=$(printf '%s' "$PROMPT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')

                      # v1.0.243: Smart interview gate — LLM assesses prompt completeness
                      # before blindly calling increment-planner. If details are missing,
                      # ask targeted questions first. If complete, proceed directly.
                      DEEP_INTERVIEW_MSG=""
                      if [[ "$DEEP_INTERVIEW_ENABLED" == "true" ]]; then
                        DEEP_INTERVIEW_MSG="

🧠 **SMART INTERVIEW GATE** (Deep Interview Mode active)

BEFORE calling sw:increment-planner, assess this prompt for completeness.
Consider ALL prior messages in this conversation.

**Assess complexity:**
- Trivial → need almost nothing, call increment-planner now
- Small (single component) → need: tech stack + basic flow
- Medium (multiple components) → need: stack + integrations + user flows + auth
- Large (platform/multi-service) → need: architecture + security + deployment + edge cases

**Check signals (weight by project type):**
- Technical: stack, frameworks, DB, auth, API integrations, deployment target
- Product: target users, core flows, business model, MVP scope
- Operational: env vars/keys, CI/CD, monitoring

**Decision:**
- Sufficient detail → call increment-planner immediately with full context
- Gaps detected → ask 2-5 targeted questions about ONLY what is missing, then call increment-planner after answers received
- NEVER ask 10+ questions. NEVER repeat what the user already said."
                      fi

                      # v1.0.198: Get skill memory for increment-planner
                      INC_PLANNER_MEMORY=""
                      INC_PLANNER_MEMORY_RAW=$(get_skill_memory_context "sw:increment-planner")
                      if [[ -n "$INC_PLANNER_MEMORY_RAW" ]]; then
                        INC_PLANNER_MEMORY="
${INC_PLANNER_MEMORY_RAW}

---
"
                      fi

                      MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}${INC_PLANNER_MEMORY}╔══════════════════════════════════════════════════════════════════════════════╗
║  🎯 SKILL FIRST - Call Skill tool BEFORE implementation                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

**Your FIRST tool call must be:**
\\\`\\\`\\\`
Skill({ skill: \\\"sw:increment-planner\\\", args: \\\"${ESCAPED_PROMPT}\\\" })
\\\`\\\`\\\`

**Order matters:**
1. ✅ Call Skill tool FIRST (as shown above)
2. ✅ THEN proceed with implementation normally

**Detection**: Feature request (confidence: ${INC_CONF})
**Reason**: ${INC_REASON}${AGENT_DIRECTIVE}${DEEP_INTERVIEW_MSG}

---

⚠️ **SKILL CHAINING REQUIRED** - \\\"SKILL FIRST\\\" does NOT mean \\\"only one skill\\\"!

After sw:increment-planner, ALSO invoke domain skills for your tech stack:
- React/Vue/Angular → \\\`sw-frontend:frontend-architect\\\`
- .NET/C# → \\\`sw-backend:dotnet-backend\\\`
- Stripe → \\\`sw-payments:stripe-integration\\\`
- After code → LSP works automatically (use findReferences, goToDefinition)

See CLAUDE.md section \\\"MANDATORY: Skill Chaining\\\" for full pattern."
                      # When INCREMENT_MANDATORY_CONFIG=true (from config), use block decision
                      # to actually prevent execution without increment creation
                      if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" ]]; then
                        local escaped_block
                        escaped_block=$(escape_json_early "$MSG")
                        printf '{"decision":"block","reason":"%s"}\n' "$escaped_block"
                      else
                        output_approve_with_context "$MSG"
                      fi
                      exit 0
                    else
                      # v1.0.169: Also suggest direct skill call for non-mandatory
                      ESCAPED_PROMPT_SUGGEST=$(printf '%s' "$PROMPT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')
                      MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}💡 **Increment Suggestion**: This looks like new feature work.

Consider creating an increment first:
\`\`\`
Skill({ skill: \"sw:increment-planner\", args: \"${ESCAPED_PROMPT_SUGGEST}\" })
\`\`\`

Or via command: \`$CMD\`

*Reason: $INC_REASON*${AGENT_DIRECTIVE}

---

*Tip: Disable with \`incrementAssist.enabled: false\` in config.json*"
                      output_approve_with_context "$MSG"
                      exit 0
                    fi
                    ;;

                  hotfix)
                    # v1.0.169: Direct skill call for hotfix too
                    ESCAPED_PROMPT_HOTFIX=$(printf '%s' "$PROMPT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')
                    MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}🚨 **Hotfix Detected**: Urgent production issue.

Create a hotfix increment:
\`\`\`
Skill({ skill: \"sw:increment-planner\", args: \"--type=hotfix ${ESCAPED_PROMPT_HOTFIX}\" })
\`\`\`

Or via command: \`/sw:increment --type=hotfix \"${INC_NAME:-urgent-fix}\"\`

*Reason: $INC_REASON*

---

*Tip: Disable with \`incrementAssist.enabled: false\` in config.json*"
                    # When INCREMENT_MANDATORY_CONFIG=true, block hotfix too
                    if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" ]]; then
                      local escaped_hotfix_block
                      escaped_hotfix_block=$(escape_json_early "$MSG")
                      printf '{"decision":"block","reason":"%s"}\n' "$escaped_hotfix_block"
                    else
                      output_approve_with_context "$MSG"
                    fi
                    exit 0
                    ;;

                  reopen)
                    HINT=""
                    [[ -n "$INC_KEYWORD" ]] && HINT=" (look for: *$INC_KEYWORD*)"
                    MSG="${AUTOLOAD_PREFIX}💡 **Increment Suggestion**: This looks related to previous work$HINT.

Consider reopening the existing increment:
\`\`\`
/sw:status  # Find the related increment
specweave resume <id>  # Reopen it
\`\`\`

*Reason: $INC_REASON*

---

*Tip: Disable with \`incrementAssist.enabled: false\` in config.json*"
                    output_approve_with_context "$MSG"
                    exit 0
                    ;;

                  small_fix)
                    # v1.0.241: small_fix still suggests increment (non-mandatory)
                    # Previously small_fix fell through with no output at all
                    ESCAPED_PROMPT_SMALLFIX=$(printf '%s' "$PROMPT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')
                    CMD_SMALLFIX="/sw:increment"
                    [[ -n "$INC_NAME" ]] && CMD_SMALLFIX="/sw:increment \"$INC_NAME\""

                    MSG="${WIP_WARNING}${AUTOLOAD_PREFIX}💡 **Increment Suggestion**: This looks like a small change worth tracking.

Consider creating an increment:
\`\`\`
Skill({ skill: \"sw:increment-planner\", args: \"${ESCAPED_PROMPT_SMALLFIX}\" })
\`\`\`

Or via command: \`$CMD_SMALLFIX\`

*Reason: $INC_REASON*${AGENT_DIRECTIVE}

---

*Tip: Disable with \`incrementAssist.enabled: false\` in config.json*"
                    # When INCREMENT_MANDATORY_CONFIG=true, block small_fix too
                    if [[ "$INCREMENT_MANDATORY_CONFIG" == "true" ]]; then
                      local escaped_smallfix_block
                      escaped_smallfix_block=$(escape_json_early "$MSG")
                      printf '{"decision":"block","reason":"%s"}\n' "$escaped_smallfix_block"
                    else
                      output_approve_with_context "$MSG"
                    fi
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
                  MSG="${SKILL_ONLY_PREFIX}╔══════════════════════════════════════════════════════════════════════════════╗
║  🎯 SKILL REQUIRED - This task needs specialized skill support               ║
╚══════════════════════════════════════════════════════════════════════════════╝

<skill_invocation_required>
### 🎯 MANDATORY: Use ${SKILL_INVOCATION} Skill

You MUST use this skill for this task. Do NOT proceed without loading it first.

**Invoke NOW using Skill tool:**
\\\`\\\`\\\`typescript
Skill({ skill: \\\"${SKILL_INVOCATION}\\\" })
\\\`\\\`\\\`

**Why this skill is required:**
${SKILL_REASON:-This skill provides specialized support for your task.}

⚠️ **Do NOT skip this** - the skill has domain expertise needed for this operation.
</skill_invocation_required>"
                  output_approve_with_context "$MSG"
                  exit 0
                else
                  # Non-mandatory skill recommendation
                  MSG="${SKILL_ONLY_PREFIX}💡 **Skill Recommended**: Consider using a specialized skill.

Use \\\`${SKILL_INVOCATION}\\\` for better results:
\\\`\\\`\\\`typescript
Skill({ skill: \\\"${SKILL_INVOCATION}\\\" })
\\\`\\\`\\\`

*${SKILL_REASON:-This skill provides specialized support for your task.}*"
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

              # Header
              BRAIN_MSG="# 🧠 Router Brain Active\\n\\n"

              # Analysis summary table
              BRAIN_MSG+="## Analysis\\n"
              BRAIN_MSG+="| Aspect | Decision |\\n"
              BRAIN_MSG+="|--------|----------|\\n"

              # Plugins row
              if [[ -n "$PLUGINS_INSTALLED" ]]; then
                BRAIN_MSG+="| Plugins | ✅ Loaded: ${PLUGINS_INSTALLED} |\\n"
              elif [[ -n "$PLUGINS_ALREADY" ]]; then
                BRAIN_MSG+="| Plugins | ✅ Using: ${PLUGINS_ALREADY} |\\n"
              fi

              # Increment row
              if [[ "$INC_ACTION" == "new" || "$INC_ACTION" == "hotfix" ]]; then
                BRAIN_MSG+="| Increment | 📋 Create: \\\"${INC_NAME:-new-feature}\\\" |\\n"
              elif [[ "$INC_ACTION" == "reopen" ]]; then
                BRAIN_MSG+="| Increment | 🔄 Reopen existing |\\n"
              fi

              # Primary skill row
              if [[ -n "$PRIMARY_SKILL" ]]; then
                BRAIN_MSG+="| Primary Skill | \`${PRIMARY_SKILL}\` |\\n"
              fi

              # Secondary skills row
              if [[ -n "$SECONDARY_SKILLS" ]]; then
                BRAIN_MSG+="| Supporting | ${SECONDARY_SKILLS} |\\n"
              fi

              BRAIN_MSG+="\\n"

              # Workflow section
              BRAIN_MSG+="## Workflow\\n\\n"

              STEP_NUM=1

              # Step: Create increment (if needed)
              if [[ "$INC_ACTION" == "new" ]]; then
                CMD="/sw:increment"
                [[ -n "$INC_NAME" ]] && CMD="/sw:increment \\\"$INC_NAME\\\""
                BRAIN_MSG+="### Step ${STEP_NUM}: Create Increment\\n"
                BRAIN_MSG+="\\\`\\\`\\\`\\n${CMD}\\n\\\`\\\`\\\`\\n"
                BRAIN_MSG+="*${INC_REASON:-Tracks this feature work with specs}*\\n\\n"
                STEP_NUM=$((STEP_NUM + 1))
              elif [[ "$INC_ACTION" == "hotfix" ]]; then
                CMD="/sw:increment --type=hotfix \\\"${INC_NAME:-urgent-fix}\\\""
                BRAIN_MSG+="### Step ${STEP_NUM}: Create Hotfix Increment\\n"
                BRAIN_MSG+="\\\`\\\`\\\`\\n${CMD}\\n\\\`\\\`\\\`\\n"
                BRAIN_MSG+="*${INC_REASON:-Urgent production issue}*\\n\\n"
                STEP_NUM=$((STEP_NUM + 1))
              elif [[ "$INC_ACTION" == "reopen" ]]; then
                BRAIN_MSG+="### Step ${STEP_NUM}: Find & Reopen Increment\\n"
                BRAIN_MSG+="\\\`\\\`\\\`\\n/sw:status  # Find related increment\\nspecweave resume <id>\\n\\\`\\\`\\\`\\n"
                [[ -n "$INC_KEYWORD" ]] && BRAIN_MSG+="*Look for: ${INC_KEYWORD}*\\n"
                BRAIN_MSG+="\\n"
                STEP_NUM=$((STEP_NUM + 1))
              fi

              # Step: SPAWN AGENTS (v1.0.155 - Task tool directive)
              if [[ -n "$PRIMARY_SKILL" ]]; then
                BRAIN_MSG+="### Step ${STEP_NUM}: 🚀 SPAWN SPECIALIZED AGENTS\\n\\n"

                # Build agent subagent_type from skill info
                # Format: plugin:skill:skill (e.g., sw-frontend:frontend-architect:frontend-architect)
                PRIMARY_PLUGIN=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .plugin // empty' 2>/dev/null | head -1)
                PRIMARY_SKILL_NAME=$(echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "primary") | .name // empty' 2>/dev/null | head -1)

                if [[ -n "$PRIMARY_PLUGIN" && -n "$PRIMARY_SKILL_NAME" ]]; then
                  AGENT_TYPE="${PRIMARY_PLUGIN}:${PRIMARY_SKILL_NAME}:${PRIMARY_SKILL_NAME}"

                  BRAIN_MSG+="**⚠️ MANDATORY: Use Task tool to spawn agent for implementation**\\n\\n"
                  BRAIN_MSG+="\\\`\\\`\\\`typescript\\n"
                  BRAIN_MSG+="Task({\\n"
                  BRAIN_MSG+="  subagent_type: \\\"${AGENT_TYPE}\\\",\\n"
                  BRAIN_MSG+="  prompt: \\\"Implement [describe task]...\\\",\\n"
                  BRAIN_MSG+="  description: \\\"[short description]\\\"\\n"
                  BRAIN_MSG+="})\\n"
                  BRAIN_MSG+="\\\`\\\`\\\`\\n\\n"

                  BRAIN_MSG+="**Why**: Specialized agents have deep domain knowledge and produce better code than direct implementation.\\n\\n"
                  [[ -n "$PRIMARY_REASON" ]] && BRAIN_MSG+="**Agent expertise**: *${PRIMARY_REASON}*\\n\\n"
                fi

                # Add secondary agents if present
                if [[ -n "$SECONDARY_SKILLS" ]]; then
                  BRAIN_MSG+="**Additional agents available**:\\n"
                  # Parse each secondary skill
                  echo "$JSON_OUTPUT" | jq -r '.routing.skills[] | select(.priority == "secondary") | "\(.plugin):\(.name):\(.name)"' 2>/dev/null | while read -r sec_agent; do
                    [[ -n "$sec_agent" ]] && BRAIN_MSG+="- \`${sec_agent}\`\\n"
                  done
                  BRAIN_MSG+="\\n"
                fi

                # Add invoke timing hint
                case "$PRIMARY_INVOKE" in
                  immediate)
                    BRAIN_MSG+="**Timing**: Spawn agent NOW - task is self-contained\\n\\n"
                    ;;
                  after_increment)
                    BRAIN_MSG+="**Timing**: Spawn agent AFTER creating increment\\n\\n"
                    ;;
                  after_planning)
                    BRAIN_MSG+="**Timing**: Enter plan mode first, THEN spawn agent\\n\\n"
                    ;;
                esac

                STEP_NUM=$((STEP_NUM + 1))
              fi

              # Add plan mode suggestion if recommended
              if [[ "$SUGGEST_PLAN" == "true" ]]; then
                BRAIN_MSG+="### 💡 Suggestion: Use Plan Mode\\n"
                BRAIN_MSG+="This task appears complex. Consider entering plan mode first.\\n\\n"
              fi

              # Footer
              BRAIN_MSG+="---\\n*Router Brain v1.0.150*"

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
        # KEYWORD FALLBACK REMOVED (v1.0.159)
        # ==================================================================
        # Keyword fallback was too aggressive - it matched "test" for simple
        # test runs, "database" for any database mention, etc.
        #
        # Now we ONLY use LLM-based detection. If LLM returns empty,
        # no plugins are installed. This is intentional - user can
        # manually install with: claude plugin install sw-frontend@specweave
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
      TDD_MSG="🚫 **STRICT TDD MODE - MANDATORY ENFORCEMENT**

⚠️ **YOU MUST FOLLOW RED→GREEN→REFACTOR OR YOUR CHANGES WILL BE REJECTED**

**MANDATORY WORKFLOW (NO EXCEPTIONS):**
1. **[RED]** Write failing test FIRST → Run test → Verify it FAILS
2. **[GREEN]** Write MINIMAL code to pass → Run test → Verify it PASSES
3. **[REFACTOR]** Improve code quality → Tests must stay green

**STRICT RULES - VIOLATIONS ARE BLOCKED:**
- ❌ CANNOT write implementation before test exists
- ❌ CANNOT mark [GREEN] task complete before [RED] is done
- ❌ CANNOT skip the test-failure verification step
- ❌ CANNOT implement features without corresponding tests

**BEFORE ANY IMPLEMENTATION:**
1. Find or create the [RED] test task
2. Write the test
3. Run the test and confirm it FAILS
4. Only THEN proceed to [GREEN] implementation

**COMMANDS:** Use \`/sw:tdd-cycle\` for guided workflow

---

**COMMANDS:** \`/sw:tdd-cycle\` for guided workflow | \`/sw:tdd-red\`, \`/sw:tdd-green\`, \`/sw:tdd-refactor\` for phases

---
"
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

    # Log TDD activation
    TDD_LOG="$HOME/.specweave/logs/tdd-enforcement.log"
    mkdir -p "$(dirname "$TDD_LOG")" 2>/dev/null
    echo "[$(date -Iseconds)] TDD_MODE=$TDD_MODE | enforcement=$TDD_ENFORCEMENT | source=$TDD_SOURCE" >> "$TDD_LOG" 2>/dev/null
  fi
fi

# CRITICAL: Exit immediately for non-SpecWeave prompts
# This covers 90%+ of prompts with <5ms overhead
# v1.0.144: Still show plugin autoload message if plugins are being loaded
# v1.0.155: AUTOLOAD_PLUGINS_MSG now includes new plugin warnings from helper function
if ! echo "$PROMPT" | grep -qE "(specweave|/sw:|increment|add|create|implement|build|develop)"; then
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
SPECWEAVE_DIR=".specweave"
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
    SMART_INTERVIEW_GATE_MSG="
🧠 **SMART INTERVIEW GATE** (Deep Interview Mode active, no increment yet)

Before proceeding, assess this conversation for completeness. Consider ALL prior messages.

**Assess complexity first:**
- Trivial (config change, typo) → need almost nothing, proceed immediately
- Small (single component) → need: tech stack + basic flow
- Medium (multiple components) → need: stack + integrations + user flows + auth approach
- Large (platform/multi-service) → need: architecture + security + deployment + edge cases + monitoring

**Check for these signals (weight by project type):**
- Technical: tech stack, frameworks, database, auth method, API integrations, deployment target
- Product: target users, core flows, business model, MVP scope, timeline
- Operational: env vars/keys, CI/CD, monitoring needs

**Your decision:**
- If sufficient detail for the detected complexity → call \`Skill({ skill: \\\"sw:increment-planner\\\", args: \\\"<summarize all gathered context>\\\" })\`
- If gaps exist → ask 2-5 targeted questions about ONLY what is missing. Do NOT repeat questions already answered in prior messages. Do NOT run a full category-by-category interview.

**Rules:**
- NEVER overwhelm with 10+ questions at once
- NEVER ask about things the user already explained
- Simple projects need fewer signals than complex platforms
- When in doubt about one detail, ask — but don't block on nice-to-haves"
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
# v1.0.144: Prepend plugin auto-loading message if plugins are being loaded
# This gives users visible feedback that plugins are being auto-loaded

FINAL_MESSAGE=""

# Add plugin auto-loading message if set (from earlier keyword detection)
if [[ -n "$AUTOLOAD_PLUGINS_MSG" ]]; then
  FINAL_MESSAGE="$AUTOLOAD_PLUGINS_MSG"
fi

# v1.0.191: Add LSP environment setup warning if needed
if [[ -n "$LSP_ENV_SETUP_MSG" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}${LSP_ENV_SETUP_MSG}"
fi

# v1.0.191: Add LSP marketplace/plugin installation message if installed
if [[ -n "$LSP_INSTALL_MSG" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}${LSP_INSTALL_MSG}"
fi

# v1.0.203: Add LSP setup suggestion if languages detected but plugins not installed
if [[ -n "$LSP_SETUP_SUGGESTION_MSG" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}${LSP_SETUP_SUGGESTION_MSG}"
fi

# v1.0.180: Add explicit LSP request explanation if detected
if [[ -n "$LSP_EXPLICIT_REQUEST_MSG" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}${LSP_EXPLICIT_REQUEST_MSG}"
fi

# v1.0.243: Smart Interview Gate for non-incrementAssist paths
# When deep interview is enabled but incrementAssist didn't trigger SKILL FIRST,
# still inject the gate so LLM can gather context across conversational prompts.
if [[ -n "$SMART_INTERVIEW_GATE_MSG" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}

${SMART_INTERVIEW_GATE_MSG}"
fi

# Add context if available
if [[ -n "$CONTEXT" ]]; then
  FINAL_MESSAGE="${FINAL_MESSAGE}${CONTEXT}"
fi

if [[ -n "$FINAL_MESSAGE" ]]; then
  output_approve_with_context "$FINAL_MESSAGE"
else
  echo '{"decision":"approve"}'
fi

exit 0
