#!/bin/bash
# reflect.sh - Self-Improving Skills Reflection System (v2.0 - Simplified)
#
# Analyzes session transcripts and extracts learnings to memory files.
# Designed to be lightweight, robust, and context-window friendly.
#
# KEY DESIGN DECISIONS:
# - Max 20 learnings per category (auto-prunes oldest)
# - Max 5KB per memory file (prevents context bloat)
# - Log rotation: keeps last 100 entries
# - Compact learning format (no verbose metadata)
#
# Usage:
#   reflect.sh [on|off|status|reflect] [options]
#
# Exit codes:
#   0 - Success
#   1 - No learnings found
#   2 - Configuration error

set +e  # Don't exit on error (hook safety)

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
MEMORY_DIR="$PROJECT_ROOT/.specweave/memory"

# Limits to prevent bloat
MAX_LEARNINGS_PER_CATEGORY=20
MAX_LOG_LINES=100
MAX_MEMORY_FILE_KB=5

# Defaults
DEFAULT_CONFIDENCE="medium"
DEFAULT_MAX_LEARNINGS=10

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    mkdir -p "$LOGS_DIR"

    # Log rotation - keep only last MAX_LOG_LINES
    local log_file="$LOGS_DIR/reflect.log"
    if [ -f "$log_file" ]; then
        local line_count=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        if [ "$line_count" -gt "$MAX_LOG_LINES" ]; then
            tail -n $((MAX_LOG_LINES / 2)) "$log_file" > "$log_file.tmp" && mv "$log_file.tmp" "$log_file"
        fi
    fi

    echo "{\"ts\":\"$timestamp\",\"lvl\":\"$level\",\"msg\":\"$*\"}" >> "$log_file"
}

ensure_dirs() {
    mkdir -p "$LOGS_DIR" "$MEMORY_DIR" "$STATE_DIR"
}

get_config_value() {
    local key="$1"
    local default="$2"

    if [ -f "$REFLECT_CONFIG" ]; then
        local value=$(jq -r ".$key // \"$default\"" "$REFLECT_CONFIG" 2>/dev/null)
        echo "${value:-$default}"
    else
        echo "$default"
    fi
}

is_reflect_enabled() {
    local enabled=$(get_config_value "enabled" "true")
    [ "$enabled" = "true" ]
}

is_auto_reflect_enabled() {
    local auto=$(get_config_value "autoReflect" "false")
    [ "$auto" = "true" ]
}

# ============================================================================
# SIGNAL DETECTION (Simplified)
# ============================================================================

# Correction patterns (user says "no", "wrong", etc.)
CORRECTION_REGEX="(No,? don.t|No,? use|Wrong|That.s incorrect|Actually,? you should|Never use|Always use|Stop using|The correct way)"

# Approval patterns (user says "perfect", "correct", etc.)
APPROVAL_REGEX="(Perfect!|That.s right|That.s correct|Exactly!|Well done|Great job|Good pattern|Keep doing this)"

# Detect signals and extract context
detect_signals() {
    local transcript="$1"

    if [ ! -f "$transcript" ]; then
        log "warn" "Transcript not found: $transcript"
        return 1
    fi

    local signals_file="$STATE_DIR/reflect-signals.txt"
    > "$signals_file"  # Clear file

    # Find corrections with context (using process substitution to avoid subshell)
    local matches
    matches=$(grep -inE "$CORRECTION_REGEX" "$transcript" 2>/dev/null | head -5) || true
    if [ -n "$matches" ]; then
        echo "$matches" | while read -r match; do
            local linenum=$(echo "$match" | cut -d: -f1)
            local start=$((linenum > 3 ? linenum - 2 : 1))
            local end=$((linenum + 2))
            local context=$(sed -n "${start},${end}p" "$transcript" 2>/dev/null | tr '\n' ' ' | cut -c1-300)
            echo "CORRECTION|$context"
        done >> "$signals_file"
    fi

    # Find approvals with context
    matches=$(grep -inE "$APPROVAL_REGEX" "$transcript" 2>/dev/null | head -5) || true
    if [ -n "$matches" ]; then
        echo "$matches" | while read -r match; do
            local linenum=$(echo "$match" | cut -d: -f1)
            local start=$((linenum > 3 ? linenum - 2 : 1))
            local end=$((linenum + 2))
            local context=$(sed -n "${start},${end}p" "$transcript" 2>/dev/null | tr '\n' ' ' | cut -c1-300)
            echo "APPROVAL|$context"
        done >> "$signals_file"
    fi

    local corrections
    local approvals
    corrections=$(grep -c "^CORRECTION|" "$signals_file" 2>/dev/null) || corrections=0
    approvals=$(grep -c "^APPROVAL|" "$signals_file" 2>/dev/null) || approvals=0

    log "info" "Detected $corrections corrections, $approvals approvals"

    local total=$((corrections + approvals))
    if [ "$total" -eq 0 ]; then
        return 1
    fi

    echo "$signals_file"
}

# ============================================================================
# LEARNING EXTRACTION
# ============================================================================

# Generate compact learning ID
generate_learning_id() {
    echo "L$(date +%m%d)-$(head -c 2 /dev/urandom | od -An -tx1 | tr -d ' ')"
}

# Categorize based on keywords
categorize_learning() {
    local context="$1"
    local lower=$(echo "$context" | tr '[:upper:]' '[:lower:]')

    case "$lower" in
        *button*|*component*|*ui*|*style*|*css*|*react*|*vue*) echo "frontend" ;;
        *api*|*endpoint*|*route*|*rest*|*graphql*|*backend*) echo "backend" ;;
        *test*|*spec*|*mock*|*playwright*|*vitest*|*jest*) echo "testing" ;;
        *deploy*|*docker*|*k8s*|*ci*|*cd*|*terraform*) echo "devops" ;;
        *auth*|*security*|*token*|*password*|*encrypt*) echo "security" ;;
        *query*|*database*|*sql*|*schema*|*postgres*) echo "database" ;;
        *) echo "general" ;;
    esac
}

# Prune memory file to max learnings
prune_memory_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        return
    fi

    # Count learnings (lines starting with "- ")
    local count=$(grep -c "^- L[0-9]" "$file" 2>/dev/null || echo "0")

    if [ "$count" -gt "$MAX_LEARNINGS_PER_CATEGORY" ]; then
        log "info" "Pruning $file: $count > $MAX_LEARNINGS_PER_CATEGORY"

        # Keep header and last N learnings
        local header=$(head -5 "$file")
        local learnings=$(grep "^- L[0-9]" "$file" | tail -n "$MAX_LEARNINGS_PER_CATEGORY")

        echo "$header" > "$file"
        echo "" >> "$file"
        echo "$learnings" >> "$file"
    fi

    # Also check file size
    local size_kb=$(du -k "$file" 2>/dev/null | cut -f1)
    if [ "${size_kb:-0}" -gt "$MAX_MEMORY_FILE_KB" ]; then
        log "warn" "Memory file too large: ${size_kb}KB > ${MAX_MEMORY_FILE_KB}KB, pruning"
        # Keep only last half of learnings
        local header=$(head -5 "$file")
        local learnings=$(grep "^- L[0-9]" "$file" | tail -n $((MAX_LEARNINGS_PER_CATEGORY / 2)))
        echo "$header" > "$file"
        echo "" >> "$file"
        echo "$learnings" >> "$file"
    fi
}

# Ensure memory file exists with header
ensure_memory_file() {
    local category="$1"
    local file="$MEMORY_DIR/${category}.md"

    mkdir -p "$MEMORY_DIR"

    if [ ! -f "$file" ]; then
        # POSIX-compatible capitalize first letter
        local cap_category=$(echo "$category" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
        cat > "$file" << EOF
# $cap_category Memory
> SpecWeave learnings - auto-pruned to $MAX_LEARNINGS_PER_CATEGORY entries
> Updated: $(date +%Y-%m-%d)

## Learnings
EOF
    fi

    echo "$file"
}

# Add learning (compact format)
add_learning() {
    local category="$1"
    local confidence="$2"
    local context="$3"

    local file=$(ensure_memory_file "$category")
    local id=$(generate_learning_id)

    # Compact format: - ID (conf): context
    local conf_short=$(echo "$confidence" | cut -c1 | tr '[:lower:]' '[:upper:]')
    local clean_context=$(echo "$context" | tr -d '\n\r' | sed 's/  */ /g' | cut -c1-200)

    echo "- $id ($conf_short): $clean_context" >> "$file"

    # Update timestamp in header
    sed -i.bak "s/^> Updated:.*/> Updated: $(date +%Y-%m-%d)/" "$file" 2>/dev/null
    rm -f "${file}.bak"

    # Prune if needed
    prune_memory_file "$file"

    log "info" "Added $id to $category"
}

# ============================================================================
# MAIN REFLECTION LOGIC
# ============================================================================

reflect_session() {
    local transcript="$1"
    local dry_run="${2:-false}"
    local confidence_threshold="${3:-$DEFAULT_CONFIDENCE}"
    local max_learnings="${4:-$DEFAULT_MAX_LEARNINGS}"

    ensure_dirs

    # Detect signals
    local signals_file=$(detect_signals "$transcript")

    if [ -z "$signals_file" ] || [ ! -f "$signals_file" ]; then
        echo "No signals detected in session."
        return 1
    fi

    local total=$(wc -l < "$signals_file" 2>/dev/null || echo "0")

    if [ "$total" -eq 0 ]; then
        echo "No corrections or approvals found."
        return 1
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Found $total signals"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local learnings_created=0

    # Process each signal
    while IFS='|' read -r type context; do
        if [ "$learnings_created" -ge "$max_learnings" ]; then
            break
        fi

        local category=$(categorize_learning "$context")
        local confidence="medium"
        [ "$type" = "CORRECTION" ] && confidence="high"

        # Skip low confidence if threshold is high
        if [ "$confidence_threshold" = "high" ] && [ "$confidence" != "high" ]; then
            continue
        fi

        echo "  📝 [$category] $confidence confidence"

        if [ "$dry_run" = "false" ]; then
            add_learning "$category" "$confidence" "$context"
        fi

        learnings_created=$((learnings_created + 1))
    done < "$signals_file"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN - no changes saved"
    else
        echo "✅ Saved $learnings_created learnings"
    fi

    # Cleanup
    rm -f "$signals_file"

    return 0
}

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

cmd_reflect_on() {
    ensure_dirs

    cat > "$REFLECT_CONFIG" << EOF
{
  "enabled": true,
  "autoReflect": true,
  "enabledAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "confidenceThreshold": "$DEFAULT_CONFIDENCE",
  "maxLearningsPerSession": $DEFAULT_MAX_LEARNINGS,
  "gitCommit": false,
  "gitPush": false
}
EOF

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Auto-mode ENABLED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Sessions will now extract learnings on exit."
    echo "Limits: $MAX_LEARNINGS_PER_CATEGORY per category, ${MAX_MEMORY_FILE_KB}KB max"
    echo ""
    echo "To disable: /sw:reflect-off"

    log "info" "Auto-reflection enabled"
}

cmd_reflect_off() {
    ensure_dirs

    if [ -f "$REFLECT_CONFIG" ]; then
        jq '.autoReflect = false' "$REFLECT_CONFIG" > "$REFLECT_CONFIG.tmp" && mv "$REFLECT_CONFIG.tmp" "$REFLECT_CONFIG"
    else
        cat > "$REFLECT_CONFIG" << EOF
{
  "enabled": true,
  "autoReflect": false,
  "disabledAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Auto-mode DISABLED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Manual /sw:reflect still works."
    echo "To re-enable: /sw:reflect-on"

    log "info" "Auto-reflection disabled"
}

cmd_reflect_status() {
    ensure_dirs

    local enabled=$(get_config_value "enabled" "true")
    local auto_reflect=$(get_config_value "autoReflect" "false")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    [ "$enabled" = "true" ] && echo "  Reflection:   ✅ Enabled" || echo "  Reflection:   ❌ Disabled"
    [ "$auto_reflect" = "true" ] && echo "  Auto-reflect: ✅ On" || echo "  Auto-reflect: ❌ Off"
    echo "  Max/category: $MAX_LEARNINGS_PER_CATEGORY"
    echo "  Max file:     ${MAX_MEMORY_FILE_KB}KB"
    echo ""

    # Count learnings
    local total=0
    if [ -d "$MEMORY_DIR" ]; then
        echo "  📚 Memory files:"
        for f in "$MEMORY_DIR"/*.md; do
            if [ -f "$f" ]; then
                local name=$(basename "$f" .md)
                local count=$(grep -c "^- L[0-9]" "$f" 2>/dev/null || echo "0")
                local size=$(du -k "$f" 2>/dev/null | cut -f1)
                echo "     $name: $count learnings (${size}KB)"
                total=$((total + count))
            fi
        done
    fi

    echo ""
    echo "  Total: $total learnings"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_reflect_clear() {
    local category="${1:-all}"

    if [ "$category" = "all" ]; then
        echo "Clearing all memory files..."
        rm -rf "$MEMORY_DIR"/*.md
        echo "✅ All learnings cleared"
    else
        local file="$MEMORY_DIR/${category}.md"
        if [ -f "$file" ]; then
            rm -f "$file"
            echo "✅ Cleared $category learnings"
        else
            echo "⚠️ No $category memory file found"
        fi
    fi

    log "info" "Cleared learnings: $category"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local command="${1:-reflect}"
    shift || true

    case "$command" in
        on|enable)
            cmd_reflect_on
            ;;
        off|disable)
            cmd_reflect_off
            ;;
        status)
            cmd_reflect_status
            ;;
        clear)
            cmd_reflect_clear "$@"
            ;;
        reflect|analyze)
            local transcript=""
            local dry_run="false"
            local confidence="$DEFAULT_CONFIDENCE"
            local max="$DEFAULT_MAX_LEARNINGS"

            while [ $# -gt 0 ]; do
                case "$1" in
                    --transcript) transcript="$2"; shift 2 ;;
                    --dry-run) dry_run="true"; shift ;;
                    --confidence) confidence="$2"; shift 2 ;;
                    --max) max="$2"; shift 2 ;;
                    *) shift ;;
                esac
            done

            # Auto-detect transcript if not provided
            if [ -z "$transcript" ]; then
                local tmp="${TMPDIR:-/tmp}"
                transcript=$(find "$tmp" -name "*.md" -mmin -5 2>/dev/null | head -1)

                if [ -z "$transcript" ]; then
                    echo "⚠️ No transcript found. Use --transcript <path>"
                    return 1
                fi
            fi

            reflect_session "$transcript" "$dry_run" "$confidence" "$max"
            ;;
        *)
            echo "Usage: reflect.sh [on|off|status|clear|reflect] [options]"
            return 1
            ;;
    esac
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
