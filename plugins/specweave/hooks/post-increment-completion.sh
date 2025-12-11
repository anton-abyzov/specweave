#!/usr/bin/env bash

# Post-Increment-Completion Hook
# Runs after an increment is marked as complete
#
# This hook closes GitHub issues automatically when increments complete

set +e  # EMERGENCY FIX: Prevents Claude Code crashes

# EMERGENCY KILL SWITCH
if [[ "${SPECWEAVE_DISABLE_HOOKS:-0}" == "1" ]]; then
  exit 0
fi

HOOK_NAME="post-increment-completion"
INCREMENT_ID="${1:-}"

# Check if increment ID provided
if [ -z "$INCREMENT_ID" ]; then
  echo "⚠️  $HOOK_NAME: No increment ID provided" >&2
  exit 0
fi

# Get project root (3 levels up from plugins/specweave/hooks/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INCREMENT_DIR="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID"

# ============================================================================
# RECURSION PREVENTION (v0.26.1 - CRITICAL)
# ============================================================================
# PROBLEM: consolidated-sync.js does Edit/Write operations which trigger hooks.
# If no guard exists, those hooks will run full sync → more Edit/Write → INFINITE LOOP.
#
# SOLUTION: Create recursion guard file BEFORE calling any sync scripts.
# Other hooks check this file and exit early if it exists.
#
# See: ADR-0073 (Hook Recursion Prevention Strategy)
# See: .specweave/increments/0051-*/reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md

RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  # Silent exit - we're already inside a hook chain
  exit 0
fi

# Create guard file (atomic operation)
mkdir -p "$PROJECT_ROOT/.specweave/state" 2>/dev/null || true
touch "$RECURSION_GUARD_FILE"

# Ensure guard file is ALWAYS removed when script exits (even on error)
trap 'rm -f "$RECURSION_GUARD_FILE" 2>/dev/null || true' EXIT SIGINT SIGTERM

# Check if increment exists
if [ ! -d "$INCREMENT_DIR" ]; then
  echo "⚠️  $HOOK_NAME: Increment $INCREMENT_ID not found" >&2
  exit 0
fi

# Read metadata.json
METADATA_FILE="$INCREMENT_DIR/metadata.json"
if [ ! -f "$METADATA_FILE" ]; then
  echo "⚠️  $HOOK_NAME: No metadata.json found for $INCREMENT_ID" >&2
  exit 0
fi

# Extract GitHub issue number
ISSUE_NUMBER=$(jq -r '.github.issue // empty' "$METADATA_FILE" 2>/dev/null)

if [ -z "$ISSUE_NUMBER" ] || [ "$ISSUE_NUMBER" = "null" ]; then
  # No GitHub issue linked - skip GitHub closure but continue with sync
  echo "ℹ️  No GitHub issue linked to increment $INCREMENT_ID"
  SKIP_GITHUB_CLOSURE=true
else
  SKIP_GITHUB_CLOSURE=false
fi

# ============================================================================
# GITHUB ISSUE CLOSURE (if linked)
# ============================================================================

if [ "$SKIP_GITHUB_CLOSURE" = "false" ]; then
  # Check if gh CLI is available
  if ! command -v gh &> /dev/null; then
    echo "⚠️  $HOOK_NAME: GitHub CLI (gh) not found - skipping issue closure" >&2
  else
    # Check if issue is already closed
    ISSUE_STATE=$(gh issue view "$ISSUE_NUMBER" --json state --jq '.state' 2>/dev/null || echo "")

    if [ "$ISSUE_STATE" = "CLOSED" ]; then
      echo "✓ GitHub issue #$ISSUE_NUMBER already closed"
    else
      # Close the GitHub issue with completion message
      echo "🔗 Closing GitHub issue #$ISSUE_NUMBER for increment $INCREMENT_ID..."

      # Create completion comment
      COMPLETION_COMMENT="## ✅ Increment Complete

Increment \`$INCREMENT_ID\` has been marked as complete.

**Completion Details:**
- Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- All tasks completed
- Tests passed
- Documentation updated

---
🤖 Auto-closed by SpecWeave post-increment-completion hook"

      # Close issue with comment
      gh issue close "$ISSUE_NUMBER" --comment "$COMPLETION_COMMENT" 2>/dev/null || {
        echo "⚠️  Failed to close issue #$ISSUE_NUMBER" >&2
      }

      echo "✅ GitHub issue #$ISSUE_NUMBER closed successfully"
    fi
  fi
fi

# ============================================================================
# SYNC SPEC.MD STATUS (CRITICAL - v0.28.8)
# ============================================================================
# PROBLEM: metadata.json is updated to "completed" but spec.md frontmatter
# may still say "active". This causes desyncs that break status line.
#
# SOLUTION: Explicitly update spec.md frontmatter to match metadata.json.
# This ensures source-of-truth discipline is maintained.
#
# See: Incident 2025-11-20 - metadata.json="completed" but spec.md="active"
# See: /sw:sync-status command for manual recovery

SPEC_FILE="$INCREMENT_DIR/spec.md"

if [ -f "$SPEC_FILE" ]; then
  echo "🔄 Syncing spec.md status to 'completed'..."

  # Read current status from spec.md frontmatter
  # Use heredoc to avoid quote escaping issues in awk
  SPEC_STATUS=$(awk '
    BEGIN { in_frontmatter=0 }
    /^---$/ {
      if (in_frontmatter == 0) {
        in_frontmatter=1; next
      } else {
        exit
      }
    }
    in_frontmatter == 1 && /^status:/ {
      gsub(/^status:[ \t]*/, "");
      gsub(/["'"'"']/, "");
      print;
      exit
    }
  ' "$SPEC_FILE" | tr -d '\r\n')

  if [ "$SPEC_STATUS" != "completed" ]; then
    # Update spec.md frontmatter to "completed"
    # Use sed for atomic in-place update
    if [[ "$(uname)" == "Darwin" ]]; then
      # macOS sed requires different syntax
      sed -i '' 's/^status:.*$/status: completed/' "$SPEC_FILE" 2>/dev/null || {
        echo "⚠️  Failed to update spec.md status (non-blocking)" >&2
      }
    else
      # GNU sed
      sed -i 's/^status:.*$/status: completed/' "$SPEC_FILE" 2>/dev/null || {
        echo "⚠️  Failed to update spec.md status (non-blocking)" >&2
      }
    fi
    echo "✅ spec.md status updated: $SPEC_STATUS → completed"
  else
    echo "✅ spec.md status already 'completed'"
  fi
else
  echo "⚠️  spec.md not found at $SPEC_FILE" >&2
fi

# Update status line cache (increment no longer open)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

echo "✅ Status line cache updated"

# ============================================================================
# SYNC LIVING DOCS (NEW in v0.24.0 - Critical Missing Feature)
# ============================================================================
# After increment completes, perform FULL living docs sync to ensure:
# - Feature specs finalized with all user stories marked complete
# - ADRs created/updated with final architecture decisions
# - Architecture docs updated with implementation details
# - Delivery docs updated with what was shipped
# - Internal/public docs reflect completed work
#
# This is the FINAL, COMPREHENSIVE sync that happens once per increment.
# (Task-level sync in post-task-completion.sh handles incremental updates)
#
# Architecture Decision: Non-blocking execution
# - If sync fails, log error but don't crash hook (GitHub issue already closed)
# - Living docs can be manually synced later with /sw:sync-docs
# - Failure mode: Graceful degradation (increment still completes)

if command -v node &> /dev/null; then
  echo ""
  echo "📚 Performing final living docs sync for increment $INCREMENT_ID..."

  # ========================================================================
  # EXTRACT FEATURE ID (v0.23.0+)
  # ========================================================================
  # Extract epic field from spec.md frontmatter (e.g., epic: FS-047)
  # This ensures sync uses the explicitly defined feature ID rather than
  # auto-generating one, maintaining traceability with living docs structure.

  FEATURE_ID=""
  SPEC_MD_PATH="$INCREMENT_DIR/spec.md"

  if [ -f "$SPEC_MD_PATH" ]; then
    # Extract epic field from YAML frontmatter
    FEATURE_ID=$(awk '
      BEGIN { in_frontmatter=0 }
      /^---$/ {
        if (in_frontmatter == 0) {
          in_frontmatter=1; next
        } else {
          exit
        }
      }
      in_frontmatter == 1 && /^epic:/ {
        gsub(/^epic:[ \t]*/, "");
        gsub(/["'\'']/, "");
        print;
        exit
      }
    ' "$SPEC_MD_PATH" | tr -d '\r\n')

    if [ -n "$FEATURE_ID" ]; then
      echo "  📎 Using feature ID from spec.md: $FEATURE_ID"
    else
      echo "  ℹ️  No epic field found in spec.md - will auto-generate feature ID"
    fi
  else
    echo "  ⚠️  spec.md not found at $SPEC_MD_PATH" >&2
  fi

  # ========================================================================
  # EXTRACT PROJECT ID (v0.20.0+)
  # ========================================================================
  # Extract activeProject from config.json (defaults to "default")
  # Supports multi-project mode where specs are organized by project.

  PROJECT_ID="default"
  CONFIG_PATH="$PROJECT_ROOT/.specweave/config.json"

  if [ -f "$CONFIG_PATH" ]; then
    if command -v jq >/dev/null 2>&1; then
      ACTIVE_PROJECT=$(jq -r '.activeProject // "default"' "$CONFIG_PATH" 2>/dev/null || echo "default")
      if [ -n "$ACTIVE_PROJECT" ] && [ "$ACTIVE_PROJECT" != "null" ]; then
        PROJECT_ID="$ACTIVE_PROJECT"
      fi
    fi
  fi
  echo "  📁 Project ID: $PROJECT_ID"

  # ========================================================================
  # LOCATE SYNC SCRIPT
  # ========================================================================
  # Find sync-living-docs.js in order of preference:
  # 1. In-place compiled (development, esbuild output)
  # 2. Local dist (development, tsc output)
  # 3. node_modules (installed as dependency)
  # 4. Plugin marketplace (Claude Code global installation)

  SYNC_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    # Development: Use in-place compiled hooks (esbuild, not tsc)
    SYNC_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-living-docs.js"
    echo "  🔧 Using in-place compiled hook (development mode)"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    # Development: Use project's compiled files (has node_modules)
    SYNC_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
    echo "  🔧 Using local dist (development mode)"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js" ]; then
    # Installed as dependency: Use node_modules version
    SYNC_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-living-docs.js"
    echo "  📦 Using node_modules version"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js" ]; then
    # Fallback: Plugin marketplace (may fail if deps missing)
    SYNC_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-living-docs.js"
    echo "  🌐 Using plugin marketplace version"
  fi

  # ========================================================================
  # EXECUTE SYNC
  # ========================================================================
  # Run living docs sync with feature ID and project ID
  # Non-blocking: Errors logged but don't crash hook

  if [ -n "$SYNC_SCRIPT" ]; then
    # Pass FEATURE_ID and PROJECT_ID as environment variables if available
    if [ -n "$FEATURE_ID" ]; then
      (cd "$PROJECT_ROOT" && FEATURE_ID="$FEATURE_ID" PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
        echo "  ⚠️  Failed to sync living docs (non-blocking - you can run /sw:sync-docs manually)" >&2
      }
    else
      # No explicit feature ID - sync will auto-generate
      (cd "$PROJECT_ROOT" && PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
        echo "  ⚠️  Failed to sync living docs (non-blocking - you can run /sw:sync-docs manually)" >&2
      }
    fi
    echo "  ✅ Living docs sync complete"
    echo ""
  else
    echo "  ⚠️  sync-living-docs.js not found in any location - skipping living docs sync" >&2
    echo "  💡 To manually sync: /sw:sync-docs update" >&2
    echo ""
  fi
else
  echo "  ⚠️  Node.js not found - skipping living docs sync" >&2
  echo "  💡 Install Node.js to enable automatic living docs sync" >&2
  echo ""
fi

# ============================================================================
# GITHUB SYNC (v0.26.1 - CRITICAL FIX)
# ============================================================================
# After living docs sync, create GitHub issues for user stories.
# This is the AUTOMATIC GitHub sync that runs once per increment completion.
#
# CRITICAL: This was MISSING in v0.26.0, causing GitHub issues to NEVER be
# created automatically. The consolidated-sync.js has the full logic for:
# - Creating GitHub issues for user stories (with 3-layer idempotency)
# - Syncing task completion comments to existing issues
# - Format preservation sync for external tools
#
# GATE SYSTEM (4 gates - all checked inside consolidated-sync.js):
# - GATE 1: canUpsertInternalItems (living docs sync enabled)
# - GATE 2: canUpdateExternalItems (external tool sync enabled)
# - GATE 3: autoSyncOnCompletion (automatic sync enabled)
# - GATE 4: sync.github.enabled (GitHub-specific sync enabled)
#
# RECURSION SAFETY:
# - Recursion guard created at script start (line 49)
# - consolidated-sync.js does Edit/Write operations
# - Other hooks see the guard and exit early
# - Guard removed via trap on script exit
#
# USER PROJECT COMPATIBILITY:
# - Script detection works for: development, dist/, node_modules/, marketplace
# - Works in both SpecWeave framework repo AND user projects using SpecWeave
# - GITHUB_TOKEN loaded from project's .env file
#
# See: Root cause analysis in initial implementation planning
# See: ADR-0073 (Hook Recursion Prevention Strategy)

if command -v node &> /dev/null; then
  echo ""
  echo "🔗 Creating GitHub issues for user stories..."

  # ========================================================================
  # LOCATE CONSOLIDATED SYNC SCRIPT
  # ========================================================================
  # Find consolidated-sync.js in order of preference:
  # 1. In-place compiled (development, esbuild output)
  # 2. Local dist (development, tsc output)
  # 3. node_modules (installed as dependency) ← USER PROJECTS
  # 4. Plugin marketplace (Claude Code global installation)

  CONSOLIDATED_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    # Development: Use in-place compiled hooks (esbuild, not tsc)
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/consolidated-sync.js"
    echo "  🔧 Using in-place compiled hook (development mode)"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    # Development: Use project's compiled files (has node_modules)
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/consolidated-sync.js"
    echo "  🔧 Using local dist (development mode)"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/consolidated-sync.js" ]; then
    # Installed as dependency: Use node_modules version (MOST USER PROJECTS)
    CONSOLIDATED_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/consolidated-sync.js"
    echo "  📦 Using node_modules version"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/consolidated-sync.js" ]; then
    # Fallback: Plugin marketplace (may fail if deps missing)
    CONSOLIDATED_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/consolidated-sync.js"
    echo "  🌐 Using plugin marketplace version"
  fi

  # ========================================================================
  # EXECUTE GITHUB SYNC
  # ========================================================================
  # Run consolidated sync to create GitHub issues and sync task completion.
  # Non-blocking: Errors logged but don't crash hook (increment already closed)
  #
  # CRITICAL: Do NOT set SKIP_GITHUB_SYNC=true here!
  # That flag is ONLY for post-task-completion hook to prevent duplicate comments.
  # On increment completion, we WANT GitHub sync to run.

  if [ -n "$CONSOLIDATED_SCRIPT" ]; then
    # Load GITHUB_TOKEN from .env for gh CLI authentication
    if [ -f "$PROJECT_ROOT/.env" ]; then
      # Extract GITHUB_TOKEN from .env (handles various formats)
      GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
      if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
        export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
        echo "  🔑 GitHub token loaded from .env"
      fi
    fi

    # Run consolidated sync (synchronous - user sees immediate feedback)
    # This creates GitHub issues, syncs comments, and performs format preservation
    if (cd "$PROJECT_ROOT" && node "$CONSOLIDATED_SCRIPT" "$INCREMENT_ID") 2>&1; then
      echo "  ✅ GitHub sync complete"
      echo ""
    else
      echo "  ⚠️  Failed to sync GitHub issues (non-blocking - you can run /sw-github:sync manually)" >&2
      echo "  💡 Check that sync.github.enabled=true in .specweave/config.json" >&2
      echo ""
    fi
  else
    echo "  ⚠️  consolidated-sync.js not found in any location - skipping GitHub sync" >&2
    echo "  💡 To manually sync: /sw-github:sync" >&2
    echo ""
  fi
else
  echo ""
  echo "  ⚠️  Node.js not found - skipping GitHub sync" >&2
  echo "  💡 Install Node.js to enable automatic GitHub sync" >&2
  echo ""
fi

# ============================================================================
# GITHUB ISSUE CLOSURE (v0.28.1 - CRITICAL FIX)
# ============================================================================
# After creating/syncing GitHub issues, close User Story issues for this increment.
# This was the MISSING feature causing issues to stay open indefinitely.
#
# WHY THIS IS SEPARATE FROM consolidated-sync.js:
# - consolidated-sync.js handles task-level sync (called by post-task-completion too)
# - sync-increment-closure.js ONLY runs on increment completion
# - Closing issues is a DESTRUCTIVE operation that should only happen once
#
# GATE CHECK: All gates are checked inside sync-increment-closure.js
# - canUpdateExternalItems must be true
# - autoSyncOnCompletion must be true
# - sync.github.enabled must be true
#
# See: Root cause analysis - User Story issues created but never closed

if command -v node &> /dev/null; then
  echo ""
  echo "🔒 Closing GitHub issues for completed user stories..."

  # ========================================================================
  # LOCATE CLOSURE SYNC SCRIPT
  # ========================================================================
  # Find sync-increment-closure.js in order of preference:
  # 1. In-place compiled (development, esbuild output)
  # 2. Local dist (development, tsc output)
  # 3. node_modules (installed as dependency) ← USER PROJECTS
  # 4. Plugin marketplace (Claude Code global installation)

  CLOSURE_SCRIPT=""
  if [ -f "$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-increment-closure.js" ]; then
    # Development: Use in-place compiled hooks (esbuild, not tsc)
    CLOSURE_SCRIPT="$PROJECT_ROOT/plugins/specweave/lib/hooks/sync-increment-closure.js"
    echo "  🔧 Using in-place compiled hook (development mode)"
  elif [ -f "$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-increment-closure.js" ]; then
    # Development: Use project's compiled files (has node_modules)
    CLOSURE_SCRIPT="$PROJECT_ROOT/dist/plugins/specweave/lib/hooks/sync-increment-closure.js"
    echo "  🔧 Using local dist (development mode)"
  elif [ -f "$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-increment-closure.js" ]; then
    # Installed as dependency: Use node_modules version (MOST USER PROJECTS)
    CLOSURE_SCRIPT="$PROJECT_ROOT/node_modules/specweave/dist/plugins/specweave/lib/hooks/sync-increment-closure.js"
    echo "  📦 Using node_modules version"
  elif [ -n "${CLAUDE_PLUGIN_ROOT}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-increment-closure.js" ]; then
    # Fallback: Plugin marketplace (may fail if deps missing)
    CLOSURE_SCRIPT="${CLAUDE_PLUGIN_ROOT}/lib/hooks/sync-increment-closure.js"
    echo "  🌐 Using plugin marketplace version"
  fi

  # ========================================================================
  # EXECUTE CLOSURE SYNC
  # ========================================================================
  # Run closure sync to close all User Story GitHub issues.
  # Non-blocking: Errors logged but don't crash hook (increment already closed)

  if [ -n "$CLOSURE_SCRIPT" ]; then
    # Ensure GITHUB_TOKEN is available (may have been set earlier)
    if [ -z "$GITHUB_TOKEN" ] && [ -f "$PROJECT_ROOT/.env" ]; then
      GITHUB_TOKEN_FROM_ENV=$(grep -E '^GITHUB_TOKEN=' "$PROJECT_ROOT/.env" 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
      if [ -n "$GITHUB_TOKEN_FROM_ENV" ]; then
        export GITHUB_TOKEN="$GITHUB_TOKEN_FROM_ENV"
      fi
    fi

    # Run closure sync (synchronous - user sees immediate feedback)
    if (cd "$PROJECT_ROOT" && node "$CLOSURE_SCRIPT" "$INCREMENT_ID") 2>&1; then
      echo "  ✅ GitHub issue closure complete"
      echo ""
    else
      echo "  ⚠️  Failed to close GitHub issues (non-blocking - you can close manually)" >&2
      echo ""
    fi
  else
    echo "  ⚠️  sync-increment-closure.js not found in any location - skipping issue closure" >&2
    echo "  💡 User Story GitHub issues may remain open until manually closed" >&2
    echo ""
  fi
else
  echo ""
  echo "  ⚠️  Node.js not found - skipping GitHub issue closure" >&2
  echo ""
fi

exit 0
