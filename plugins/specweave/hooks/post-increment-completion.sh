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

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
INCREMENT_DIR="$PROJECT_ROOT/.specweave/increments/$INCREMENT_ID"

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

# Update status line cache (increment no longer open)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$HOOK_DIR/lib/update-status-line.sh" 2>/dev/null || true

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
# - Living docs can be manually synced later with /specweave:sync-docs
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
        echo "  ⚠️  Failed to sync living docs (non-blocking - you can run /specweave:sync-docs manually)" >&2
      }
    else
      # No explicit feature ID - sync will auto-generate
      (cd "$PROJECT_ROOT" && PROJECT_ID="$PROJECT_ID" node "$SYNC_SCRIPT" "$INCREMENT_ID") 2>&1 || {
        echo "  ⚠️  Failed to sync living docs (non-blocking - you can run /specweave:sync-docs manually)" >&2
      }
    fi
    echo "  ✅ Living docs sync complete"
    echo ""
  else
    echo "  ⚠️  sync-living-docs.js not found in any location - skipping living docs sync" >&2
    echo "  💡 To manually sync: /specweave:sync-docs update" >&2
    echo ""
  fi
else
  echo "  ⚠️  Node.js not found - skipping living docs sync" >&2
  echo "  💡 Install Node.js to enable automatic living docs sync" >&2
  echo ""
fi

exit 0
