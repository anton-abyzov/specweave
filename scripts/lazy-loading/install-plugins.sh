#!/usr/bin/env bash
#
# SpecWeave Lazy Loading - Plugin Installation Script
# Cross-platform: macOS, Linux, Windows (Git Bash, WSL, Cygwin)
#
# Copies plugins from cache to active skills directory for hot-reload.
# Usage: install-plugins.sh [PLUGINS] [--silent] [--force] [--target TARGET]
#
# Arguments:
#   PLUGINS     Plugin names (space-separated) or "all" for all plugins
#   --silent    Suppress output messages
#   --force     Overwrite existing plugins
#   --target    Target AI tool: "claude" (default), "cursor", "windsurf", "generic"
#
# Environment Variables:
#   SPECWEAVE_CACHE_DIR   Override cache directory
#   SPECWEAVE_SKILLS_DIR  Override active skills directory (for non-Claude tools)
#   HOME / USERPROFILE    Home directory (auto-detected)
#
# Examples:
#   install-plugins.sh                         # Install all for Claude Code
#   install-plugins.sh specweave               # Install core only
#   install-plugins.sh all --target cursor     # Install for Cursor IDE
#   install-plugins.sh all --silent --force    # Silent forced reinstall
#

set -e

# =============================================================================
# Cross-Platform Compatibility
# =============================================================================

# Detect home directory (Windows vs Unix)
get_home_dir() {
    if [[ -n "$HOME" ]]; then
        echo "$HOME"
    elif [[ -n "$USERPROFILE" ]]; then
        # Windows - convert backslashes to forward slashes
        echo "${USERPROFILE//\\//}"
    else
        echo "$HOME"  # Fallback
    fi
}

# Get current time in milliseconds (cross-platform)
get_time_ms() {
    # Try GNU date with nanoseconds, fall back to seconds * 1000
    if date +%s%3N >/dev/null 2>&1; then
        date +%s%3N
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c 'import time; print(int(time.time() * 1000))'
    elif command -v python >/dev/null 2>&1; then
        python -c 'import time; print(int(time.time() * 1000))'
    else
        # Fallback: seconds * 1000
        echo $(($(date +%s) * 1000))
    fi
}

# Normalize path for current OS
normalize_path() {
    local path="$1"
    # Convert Windows backslashes to forward slashes
    echo "${path//\\//}"
}

# =============================================================================
# Configuration
# =============================================================================

HOME_DIR=$(get_home_dir)
HOME_DIR=$(normalize_path "$HOME_DIR")

# Default directories (can be overridden by environment)
DEFAULT_CACHE_DIR="$HOME_DIR/.specweave/skills-cache"
DEFAULT_CLAUDE_DIR="$HOME_DIR/.claude/skills"
DEFAULT_CURSOR_DIR="$HOME_DIR/.cursor/skills"
DEFAULT_WINDSURF_DIR="$HOME_DIR/.windsurf/skills"
DEFAULT_GENERIC_DIR="$HOME_DIR/.ai-tools/skills"

STATE_DIR="$HOME_DIR/.specweave/state"
STATE_FILE="$STATE_DIR/plugins-loaded.json"

# =============================================================================
# Argument Parsing
# =============================================================================

SILENT=false
FORCE=false
PLUGINS=""
TARGET="claude"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --silent|-s)
            SILENT=true
            shift
            ;;
        --force|-f)
            FORCE=true
            shift
            ;;
        --target|-t)
            TARGET="${2:-claude}"
            shift 2
            ;;
        --help|-h)
            echo "Usage: install-plugins.sh [PLUGINS] [OPTIONS]"
            echo ""
            echo "Arguments:"
            echo "  PLUGINS              Plugin names or 'all' (default: all)"
            echo ""
            echo "Options:"
            echo "  --silent, -s         Suppress output"
            echo "  --force, -f          Overwrite existing plugins"
            echo "  --target, -t TARGET  AI tool: claude, cursor, windsurf, generic"
            echo "  --help, -h           Show this help"
            echo ""
            echo "Environment:"
            echo "  SPECWEAVE_CACHE_DIR   Cache directory"
            echo "  SPECWEAVE_SKILLS_DIR  Skills directory (overrides --target)"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
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

# =============================================================================
# Determine Directories Based on Target
# =============================================================================

CACHE_DIR="${SPECWEAVE_CACHE_DIR:-$DEFAULT_CACHE_DIR}"

if [[ -n "$SPECWEAVE_SKILLS_DIR" ]]; then
    ACTIVE_DIR="$SPECWEAVE_SKILLS_DIR"
else
    case "$TARGET" in
        claude)
            ACTIVE_DIR="$DEFAULT_CLAUDE_DIR"
            ;;
        cursor)
            ACTIVE_DIR="$DEFAULT_CURSOR_DIR"
            ;;
        windsurf)
            ACTIVE_DIR="$DEFAULT_WINDSURF_DIR"
            ;;
        generic|*)
            ACTIVE_DIR="$DEFAULT_GENERIC_DIR"
            ;;
    esac
fi

# Normalize paths
CACHE_DIR=$(normalize_path "$CACHE_DIR")
ACTIVE_DIR=$(normalize_path "$ACTIVE_DIR")
STATE_DIR=$(normalize_path "$STATE_DIR")
STATE_FILE=$(normalize_path "$STATE_FILE")

# Default to "all" if no plugins specified
[[ -z "$PLUGINS" ]] && PLUGINS="all"

# =============================================================================
# Utility Functions
# =============================================================================

log() {
    if [[ "$SILENT" != "true" ]]; then
        echo "$1"
    fi
}

error() {
    echo "ERROR: $1" >&2
}

warn() {
    if [[ "$SILENT" != "true" ]]; then
        echo "WARNING: $1" >&2
    fi
}

# Create JSON array from bash array (handles empty arrays)
json_array() {
    local arr=("$@")
    if [[ ${#arr[@]} -eq 0 ]]; then
        echo "[]"
    else
        local json="["
        local first=true
        for item in "${arr[@]}"; do
            if [[ "$first" == "true" ]]; then
                first=false
            else
                json="$json,"
            fi
            json="$json\"$item\""
        done
        json="$json]"
        echo "$json"
    fi
}

# =============================================================================
# Main Installation Logic
# =============================================================================

# Ensure directories exist
mkdir -p "$ACTIVE_DIR" 2>/dev/null || {
    error "Cannot create skills directory: $ACTIVE_DIR"
    error "Check permissions or run with appropriate privileges."
    exit 1
}
mkdir -p "$STATE_DIR" 2>/dev/null || true

# Check if cache exists
if [[ ! -d "$CACHE_DIR" ]]; then
    error "Skills cache not found at $CACHE_DIR"
    error "Run 'specweave refresh-marketplace' first to populate the cache."
    exit 1
fi

# Get list of plugins to install
if [[ "$PLUGINS" == "all" ]]; then
    PLUGIN_LIST=$(ls "$CACHE_DIR" 2>/dev/null || echo "")
    if [[ -z "$PLUGIN_LIST" ]]; then
        error "No plugins found in cache."
        exit 1
    fi
else
    PLUGIN_LIST="$PLUGINS"
fi

# Track installed plugins and timing
INSTALLED=()
SKIPPED=()
FAILED=()
START_TIME=$(get_time_ms)

log "Installing SpecWeave plugins for $TARGET..."
log "  Cache:  $CACHE_DIR"
log "  Target: $ACTIVE_DIR"
log ""

# Install each plugin
for plugin in $PLUGIN_LIST; do
    plugin_cache="$CACHE_DIR/$plugin"

    # Check if plugin exists in cache
    if [[ ! -d "$plugin_cache" ]]; then
        warn "Plugin '$plugin' not found in cache, skipping."
        FAILED+=("$plugin")
        continue
    fi

    # Find skills directory (could be skills/ or just the plugin dir)
    if [[ -d "$plugin_cache/skills" ]]; then
        skills_source="$plugin_cache/skills"
    else
        skills_source="$plugin_cache"
    fi

    # Count skill subdirectories
    skill_dirs=()
    if [[ -d "$skills_source" ]]; then
        for d in "$skills_source"/*/; do
            [[ -d "$d" ]] && skill_dirs+=("$d")
        done
    fi

    if [[ ${#skill_dirs[@]} -eq 0 ]]; then
        # No skill subdirectories - check for direct SKILL.md
        if [[ -f "$skills_source/SKILL.md" ]]; then
            dest_dir="$ACTIVE_DIR/$plugin"
            if [[ -d "$dest_dir" && "$FORCE" != "true" ]]; then
                SKIPPED+=("$plugin")
                continue
            fi
            mkdir -p "$dest_dir"
            cp -r "$skills_source"/* "$dest_dir/" 2>/dev/null || {
                warn "Failed to copy plugin '$plugin'"
                FAILED+=("$plugin")
                continue
            }
            INSTALLED+=("$plugin")
        else
            SKIPPED+=("$plugin")
        fi
        continue
    fi

    # Copy each skill subdirectory
    for skill_dir in "${skill_dirs[@]}"; do
        skill_name=$(basename "$skill_dir")
        dest_dir="$ACTIVE_DIR/$skill_name"

        # Skip if already exists (idempotent) unless force flag
        if [[ -d "$dest_dir" && "$FORCE" != "true" ]]; then
            SKIPPED+=("$skill_name")
            continue
        fi

        # Copy skill
        cp -r "$skill_dir" "$ACTIVE_DIR/" 2>/dev/null || {
            warn "Failed to copy skill '$skill_name'"
            FAILED+=("$skill_name")
            continue
        }
        INSTALLED+=("$skill_name")
    done
done

# Calculate duration
END_TIME=$(get_time_ms)
DURATION_MS=$((END_TIME - START_TIME))

# =============================================================================
# State File Generation
# =============================================================================

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

# Generate JSON arrays safely
INSTALLED_JSON=$(json_array "${INSTALLED[@]}")
SKIPPED_JSON=$(json_array "${SKIPPED[@]}")
FAILED_JSON=$(json_array "${FAILED[@]}")

cat > "$STATE_FILE" << EOF
{
  "version": "1.0.0",
  "lazyMode": true,
  "target": "$TARGET",
  "loadedAt": "$TIMESTAMP",
  "installMethod": "hot-reload",
  "cacheDir": "$CACHE_DIR",
  "skillsDir": "$ACTIVE_DIR",
  "loadedPlugins": $INSTALLED_JSON,
  "skippedPlugins": $SKIPPED_JSON,
  "failedPlugins": $FAILED_JSON,
  "stats": {
    "installed": ${#INSTALLED[@]},
    "skipped": ${#SKIPPED[@]},
    "failed": ${#FAILED[@]},
    "durationMs": $DURATION_MS
  }
}
EOF

# =============================================================================
# Output Summary
# =============================================================================

if [[ "$SILENT" != "true" ]]; then
    echo ""
    echo "SpecWeave Plugin Installation Complete"
    echo "======================================="
    echo "  Target:    $TARGET"
    echo "  Installed: ${#INSTALLED[@]} skill(s)"
    echo "  Skipped:   ${#SKIPPED[@]} (already installed)"
    if [[ ${#FAILED[@]} -gt 0 ]]; then
        echo "  Failed:    ${#FAILED[@]} (check cache)"
    fi
    echo "  Duration:  ${DURATION_MS}ms"
    echo ""

    case "$TARGET" in
        claude)
            echo "Skills are now active via hot-reload."
            echo "Use /sw:* commands or mention 'specweave' to get started."
            ;;
        cursor|windsurf)
            echo "Skills copied to $ACTIVE_DIR"
            echo "Configure your AI tool to read from this directory."
            echo "See: https://spec-weave.com/docs/integrations/$TARGET"
            ;;
        generic)
            echo "Skills copied to $ACTIVE_DIR"
            echo "Include SKILL.md files in your AI tool's context."
            echo "See: https://spec-weave.com/docs/integrations/generic"
            ;;
    esac
fi

# Exit with appropriate code
if [[ ${#FAILED[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi
