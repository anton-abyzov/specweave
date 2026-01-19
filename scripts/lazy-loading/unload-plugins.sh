#!/bin/bash
#
# SpecWeave Lazy Loading - Plugin Unload Script
#
# Removes plugins from active skills directory.
# Usage: unload-plugins.sh [PLUGINS] [--silent] [--keep-router]
#
# Arguments:
#   PLUGINS       Plugin names (space-separated) or "all" for all plugins
#   --silent      Suppress output messages
#   --keep-router Keep the router skill installed
#
# Examples:
#   unload-plugins.sh                     # Unload all plugins
#   unload-plugins.sh specweave-github    # Unload GitHub plugin only
#   unload-plugins.sh all --keep-router   # Unload all except router
#

set -e

# Configuration
ACTIVE_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
STATE_DIR="$HOME/.specweave/state"
STATE_FILE="$STATE_DIR/plugins-loaded.json"

# Flags
SILENT=false
KEEP_ROUTER=false
PLUGINS=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --silent)
            SILENT=true
            shift
            ;;
        --keep-router)
            KEEP_ROUTER=true
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$PLUGINS" ]]; then
                PLUGINS="$1"
            else
                PLUGINS="$PLUGINS $1"
            fi
            shift
            ;;
    esac
done

# Default to "all" if no plugins specified
[[ -z "$PLUGINS" ]] && PLUGINS="all"

# Logging
log() {
    if [[ "$SILENT" != "true" ]]; then
        echo "$1"
    fi
}

# Check if active dir exists
if [[ ! -d "$ACTIVE_DIR" ]]; then
    log "No active skills directory found. Nothing to unload."
    exit 0
fi

# Get list of skills to unload
if [[ "$PLUGINS" == "all" ]]; then
    SKILL_LIST=$(ls "$ACTIVE_DIR" 2>/dev/null || echo "")
else
    SKILL_LIST="$PLUGINS"
fi

# Track removed skills
REMOVED=()
KEPT=()

# Remove each skill
for skill in $SKILL_LIST; do
    skill_dir="$ACTIVE_DIR/$skill"

    # Skip if doesn't exist
    if [[ ! -d "$skill_dir" ]]; then
        continue
    fi

    # Skip router if --keep-router flag
    if [[ "$KEEP_ROUTER" == "true" && "$skill" == "router" ]]; then
        KEPT+=("$skill")
        continue
    fi

    # Remove skill directory
    rm -rf "$skill_dir" 2>/dev/null || {
        log "Warning: Could not remove skill '$skill'"
        continue
    }
    REMOVED+=("$skill")
done

# Update state file
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p "$STATE_DIR"

cat > "$STATE_FILE" << EOF
{
  "version": "1.0.0",
  "lazyMode": true,
  "unloadedAt": "$TIMESTAMP",
  "loadedPlugins": [
$(printf '    "%s",\n' "${KEPT[@]}" | sed '$ s/,$//')
  ],
  "lastAction": "unload",
  "stats": {
    "removed": ${#REMOVED[@]},
    "kept": ${#KEPT[@]}
  }
}
EOF

# Output summary
if [[ "$SILENT" != "true" ]]; then
    echo ""
    echo "SpecWeave Plugin Unload Complete"
    echo "================================="
    echo "  Removed: ${#REMOVED[@]} skill(s)"
    echo "  Kept:    ${#KEPT[@]} skill(s)"
    echo ""
    if [[ ${#KEPT[@]} -gt 0 ]]; then
        echo "Router skill preserved. Use /sw:* to reload plugins."
    fi
fi

exit 0
