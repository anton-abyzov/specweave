#!/bin/bash
# reflect.sh - Self-Improving Skills Reflection System
#
# This script analyzes session transcripts and extracts learnings
# to skill MEMORY.md files for persistent AI memory across sessions.
#
# Usage:
#   reflect.sh [options]
#
# Options:
#   --skill <name>       Only extract learnings for this skill
#   --dry-run            Show learnings without saving
#   --confidence <level> Minimum confidence: high, medium, low
#   --max <n>            Maximum learnings to extract
#   --transcript <path>  Path to transcript file (auto-detected if omitted)
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
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"

# Memory paths (CENTRALIZED - no per-skill copies needed)
PROJECT_MEMORY="$PROJECT_ROOT/.specweave/memory"
GLOBAL_MEMORY="${HOME}/.specweave/memory"

# Legacy skill paths (for migration/compatibility)
PROJECT_SKILLS="$PROJECT_ROOT/.specweave/skills"
GLOBAL_SKILLS="${HOME}/.claude/skills"

# Defaults
DEFAULT_CONFIDENCE="medium"
DEFAULT_MAX_LEARNINGS=10
DEFAULT_RETENTION_DAYS=90

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    shift
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"message\":\"$*\"}" >> "$LOGS_DIR/reflect.log"
}

ensure_dirs() {
    mkdir -p "$LOGS_DIR"
    mkdir -p "$PROJECT_MEMORY"
    mkdir -p "$GLOBAL_MEMORY"
    mkdir -p "$STATE_DIR"
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
# SIGNAL DETECTION
# ============================================================================

# Patterns that indicate corrections (high confidence)
CORRECTION_PATTERNS=(
    "No, don't"
    "No, use"
    "Wrong"
    "Don't do that"
    "That's incorrect"
    "Actually, you should"
    "Never use"
    "Always use"
    "Stop using"
    "Instead of"
    "The correct way"
    "You should have"
    "That's not how"
    "That's the wrong"
    "Fix this"
    "Change this to"
)

# Patterns that indicate approvals (medium confidence)
APPROVAL_PATTERNS=(
    "Perfect!"
    "That's right"
    "That's correct"
    "Exactly!"
    "Well done"
    "Great job"
    "That's exactly how"
    "Yes, always do"
    "This is correct"
    "Good pattern"
    "Keep doing this"
)

# Detect signals in transcript
detect_signals() {
    local transcript="$1"
    local signals_file="$STATE_DIR/reflect-signals.json"

    echo '{"corrections":[],"approvals":[]}' > "$signals_file"

    if [ ! -f "$transcript" ]; then
        log "warn" "Transcript not found: $transcript"
        return 1
    fi

    local corrections=()
    local approvals=()

    # Scan for correction patterns
    for pattern in "${CORRECTION_PATTERNS[@]}"; do
        local matches=$(grep -i -n "$pattern" "$transcript" 2>/dev/null | head -5)
        if [ -n "$matches" ]; then
            while IFS= read -r match; do
                local line_num=$(echo "$match" | cut -d: -f1)
                local context=$(sed -n "${line_num}p" "$transcript" | head -c 500)
                corrections+=("{\"pattern\":\"$pattern\",\"line\":$line_num,\"context\":\"$(echo "$context" | sed 's/"/\\"/g' | tr '\n' ' ')\"}")
            done <<< "$matches"
        fi
    done

    # Scan for approval patterns
    for pattern in "${APPROVAL_PATTERNS[@]}"; do
        local matches=$(grep -i -n "$pattern" "$transcript" 2>/dev/null | head -5)
        if [ -n "$matches" ]; then
            while IFS= read -r match; do
                local line_num=$(echo "$match" | cut -d: -f1)
                local context=$(sed -n "${line_num}p" "$transcript" | head -c 500)
                approvals+=("{\"pattern\":\"$pattern\",\"line\":$line_num,\"context\":\"$(echo "$context" | sed 's/"/\\"/g' | tr '\n' ' ')\"}")
            done <<< "$matches"
        fi
    done

    # Build JSON output
    local corrections_json=$(printf '%s\n' "${corrections[@]}" | jq -s '.' 2>/dev/null || echo '[]')
    local approvals_json=$(printf '%s\n' "${approvals[@]}" | jq -s '.' 2>/dev/null || echo '[]')

    cat > "$signals_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "transcript": "$transcript",
  "corrections": $corrections_json,
  "approvals": $approvals_json,
  "totalSignals": $((${#corrections[@]} + ${#approvals[@]}))
}
EOF

    log "info" "Detected ${#corrections[@]} corrections, ${#approvals[@]} approvals"
    echo "$signals_file"
}

# ============================================================================
# LEARNING EXTRACTION
# ============================================================================

# Generate unique learning ID
generate_learning_id() {
    local date=$(date +%Y-%m-%d)
    local random=$(head -c 3 /dev/urandom | od -An -tx1 | tr -d ' \n')
    echo "LRN-$date-$random"
}

# Categorize learning based on content
categorize_learning() {
    local context="$1"
    local context_lower=$(echo "$context" | tr '[:upper:]' '[:lower:]')

    # Check for category keywords
    case "$context_lower" in
        *button*|*component*|*ui*|*style*|*css*|*tailwind*)
            echo "component-usage"
            ;;
        *api*|*endpoint*|*route*|*rest*|*graphql*)
            echo "api-patterns"
            ;;
        *test*|*spec*|*coverage*|*mock*|*playwright*|*vitest*)
            echo "testing"
            ;;
        *deploy*|*wrangler*|*vercel*|*supabase*|*cloudflare*|*ci*|*cd*)
            echo "deployment"
            ;;
        *auth*|*security*|*token*|*password*|*validation*)
            echo "security"
            ;;
        *query*|*database*|*sql*|*schema*|*migration*)
            echo "database"
            ;;
        *name*|*convention*|*case*|*file*|*folder*)
            echo "naming"
            ;;
        *pattern*|*architecture*|*design*|*structure*)
            echo "architecture"
            ;;
        *)
            echo "general"
            ;;
    esac
}

# Map category to skill name
category_to_skill() {
    local category="$1"

    case "$category" in
        component-usage|styling)
            echo "frontend"
            ;;
        api-patterns)
            echo "backend"
            ;;
        testing)
            echo "testing"
            ;;
        deployment)
            echo "devops"
            ;;
        security)
            echo "security"
            ;;
        database)
            echo "database"
            ;;
        naming|architecture|general)
            echo "general"
            ;;
        *)
            echo "general"
            ;;
    esac
}

# Extract keywords from context
extract_triggers() {
    local context="$1"

    # Extract likely trigger words (nouns, tech terms)
    echo "$context" | tr '[:upper:]' '[:lower:]' | \
        grep -oE '\b(button|component|api|test|deploy|auth|query|name|file|pattern|function|class|module|hook|state|props|route|endpoint|database|schema|style|css|tailwind|react|next|node|typescript)\b' | \
        sort -u | \
        head -5 | \
        tr '\n' ',' | \
        sed 's/,$//'
}

# ============================================================================
# MEMORY FILE MANAGEMENT (CENTRALIZED ARCHITECTURE)
# ============================================================================

# Get memory file path for a category (CENTRALIZED - one file per category)
# This means users DON'T need copies of skills - just the central memory folder
get_memory_path() {
    local category="$1"
    local scope="${2:-project}"  # project or global

    if [ "$scope" = "global" ]; then
        echo "$GLOBAL_MEMORY/${category}.md"
    else
        echo "$PROJECT_MEMORY/${category}.md"
    fi
}

# Ensure memory file exists (CENTRALIZED - by category, not by skill)
ensure_memory_exists() {
    local category="$1"
    local scope="${2:-project}"

    local memory_dir
    if [ "$scope" = "global" ]; then
        memory_dir="$GLOBAL_MEMORY"
    else
        memory_dir="$PROJECT_MEMORY"
    fi

    mkdir -p "$memory_dir"

    # Create category MEMORY.md if doesn't exist
    local memory_file="$memory_dir/${category}.md"
    if [ ! -f "$memory_file" ]; then
        # Capitalize first letter for display
        local category_display
        case "$category" in
            component-usage) category_display="Component Usage" ;;
            api-patterns) category_display="API Patterns" ;;
            testing) category_display="Testing" ;;
            deployment) category_display="Deployment" ;;
            security) category_display="Security" ;;
            database) category_display="Database" ;;
            naming) category_display="Naming Conventions" ;;
            architecture) category_display="Architecture" ;;
            general) category_display="General" ;;
            *) category_display="$category" ;;
        esac

        cat > "$memory_file" << EOF
# $category_display Memory

> Auto-generated by SpecWeave Reflect. Edit with caution.
> Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
> Location: Centralized in .specweave/memory/

## Learned Patterns

EOF
    fi

    echo "$memory_file"
}

# DEPRECATED: Legacy skill-based memory (for migration)
ensure_skill_exists() {
    local skill="$1"
    local scope="${2:-project}"

    # Redirect to centralized memory using the skill name as category
    ensure_memory_exists "$skill" "$scope"
}

# Append learning to memory file
append_learning() {
    local memory_file="$1"
    local learning_id="$2"
    local confidence="$3"
    local category="$4"
    local context="$5"
    local learning="$6"
    local triggers="$7"
    local source="$8"

    # Update last modified timestamp
    sed -i.bak "s/^> Last updated:.*/> Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$memory_file"
    rm -f "${memory_file}.bak"

    # Check if category section exists
    if ! grep -q "^### $category" "$memory_file"; then
        echo "" >> "$memory_file"
        echo "### $category" >> "$memory_file"
        echo "" >> "$memory_file"
    fi

    # Capitalize confidence for display (POSIX-compatible)
    local confidence_display
    case "$confidence" in
        high) confidence_display="High" ;;
        medium) confidence_display="Medium" ;;
        low) confidence_display="Low" ;;
        *) confidence_display="$confidence" ;;
    esac

    # Append learning under category
    cat >> "$memory_file" << EOF

#### $learning_id ($confidence_display Confidence)
**Context**: $context
**Learning**: $learning
**Triggers**: $triggers
**Added**: $(date +%Y-%m-%d)
**Source**: $source

EOF

    log "info" "Added learning $learning_id to $memory_file"
}

# ============================================================================
# MAIN REFLECTION LOGIC
# ============================================================================

reflect_session() {
    local transcript="$1"
    local skill_filter="$2"
    local dry_run="${3:-false}"
    local confidence_threshold="${4:-$DEFAULT_CONFIDENCE}"
    local max_learnings="${5:-$DEFAULT_MAX_LEARNINGS}"

    ensure_dirs

    # Detect signals
    local signals_file=$(detect_signals "$transcript")

    if [ ! -f "$signals_file" ]; then
        echo "No signals detected in session."
        return 1
    fi

    local total_signals=$(jq '.totalSignals' "$signals_file")

    if [ "$total_signals" -eq 0 ]; then
        echo "No corrections or approvals detected."
        return 1
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Analyzing Session"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local corrections_count=$(jq '.corrections | length' "$signals_file")
    local approvals_count=$(jq '.approvals | length' "$signals_file")

    echo "📊 SIGNALS DETECTED:"
    echo "  • Corrections: $corrections_count"
    echo "  • Approvals: $approvals_count"
    echo ""

    # Process each signal and create learnings
    local learnings_created=0
    local learnings_file="$STATE_DIR/reflect-learnings.json"
    echo '{"learnings":[]}' > "$learnings_file"

    # Process corrections (high confidence)
    for i in $(seq 0 $((corrections_count - 1))); do
        if [ $learnings_created -ge $max_learnings ]; then
            break
        fi

        local context=$(jq -r ".corrections[$i].context" "$signals_file")
        local pattern=$(jq -r ".corrections[$i].pattern" "$signals_file")

        local learning_id=$(generate_learning_id)
        local category=$(categorize_learning "$context")
        local skill=$(category_to_skill "$category")
        local triggers=$(extract_triggers "$context")

        # Apply skill filter if provided
        if [ -n "$skill_filter" ] && [ "$skill" != "$skill_filter" ]; then
            continue
        fi

        local learning_text="[Extracted from correction] $context"

        echo "📝 Learning $learning_id:"
        echo "   Category: $category"
        echo "   Confidence: high"
        echo "   Triggers: $triggers"
        echo ""

        if [ "$dry_run" = "false" ]; then
            # CENTRALIZED: Store by category, not by skill
            local memory_file=$(ensure_memory_exists "$category" "project")
            append_learning "$memory_file" "$learning_id" "high" "$category" "$context" "$learning_text" "$triggers" "session:$(basename "$transcript" .md)"
        fi

        learnings_created=$((learnings_created + 1))
    done

    # Process approvals (medium confidence)
    if [ "$confidence_threshold" != "high" ]; then
        for i in $(seq 0 $((approvals_count - 1))); do
            if [ $learnings_created -ge $max_learnings ]; then
                break
            fi

            local context=$(jq -r ".approvals[$i].context" "$signals_file")
            local pattern=$(jq -r ".approvals[$i].pattern" "$signals_file")

            local learning_id=$(generate_learning_id)
            local category=$(categorize_learning "$context")
            local skill=$(category_to_skill "$category")
            local triggers=$(extract_triggers "$context")

            if [ -n "$skill_filter" ] && [ "$skill" != "$skill_filter" ]; then
                continue
            fi

            local learning_text="[Extracted from approval] $context"

            echo "📝 Learning $learning_id:"
            echo "   Category: $category"
            echo "   Confidence: medium"
            echo "   Triggers: $triggers"
            echo ""

            if [ "$dry_run" = "false" ]; then
                # CENTRALIZED: Store by category, not by skill
                local memory_file=$(ensure_memory_exists "$category" "project")
                append_learning "$memory_file" "$learning_id" "medium" "$category" "$context" "$learning_text" "$triggers" "session:$(basename "$transcript" .md)"
            fi

            learnings_created=$((learnings_created + 1))
        done
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN - No changes saved"
    else
        echo "✅ Saved $learnings_created learnings to skill memory files"

        # Git commit if configured
        local git_commit=$(get_config_value "gitCommit" "false")
        if [ "$git_commit" = "true" ]; then
            if [ -d "$PROJECT_ROOT/.git" ]; then
                cd "$PROJECT_ROOT"
                git add "$PROJECT_MEMORY" 2>/dev/null || true
                git commit -m "learn: Extract $learnings_created learnings from session" 2>/dev/null || true
                log "info" "Git commit created for $learnings_created learnings"
            fi
        fi
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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
  "gitCommit": true,
  "gitPush": false
}
EOF

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Automatic Mode Enabled"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Auto-reflection is now ENABLED"
    echo ""
    echo "When enabled:"
    echo "  • Stop hook analyzes session on exit"
    echo "  • Corrections and approvals are extracted"
    echo "  • Learnings saved to skill MEMORY.md files"
    echo "  • Git commit created (if configured)"
    echo ""
    echo "To disable: /sw:reflect-off"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Automatic Mode Disabled"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "❌ Auto-reflection is now DISABLED"
    echo ""
    echo "  • Stop hook will NOT analyze sessions"
    echo "  • Manual /sw:reflect still available"
    echo "  • Existing learnings preserved"
    echo ""
    echo "To re-enable: /sw:reflect-on"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    log "info" "Auto-reflection disabled"
}

cmd_reflect_status() {
    ensure_dirs

    local enabled=$(get_config_value "enabled" "true")
    local auto_reflect=$(get_config_value "autoReflect" "false")
    local confidence=$(get_config_value "confidenceThreshold" "$DEFAULT_CONFIDENCE")
    local max_learnings=$(get_config_value "maxLearningsPerSession" "$DEFAULT_MAX_LEARNINGS")
    local git_commit=$(get_config_value "gitCommit" "false")
    local git_push=$(get_config_value "gitPush" "false")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: Status Dashboard"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 CONFIGURATION"
    echo ""

    if [ "$enabled" = "true" ]; then
        echo "  Reflection:      ✅ Enabled"
    else
        echo "  Reflection:      ❌ Disabled"
    fi

    if [ "$auto_reflect" = "true" ]; then
        echo "  Auto-reflect:    ✅ On (stop hook active)"
    else
        echo "  Auto-reflect:    ❌ Off"
    fi

    echo "  Confidence:      $confidence"
    echo "  Max/session:     $max_learnings"

    if [ "$git_commit" = "true" ]; then
        echo "  Git commit:      ✅ enabled"
    else
        echo "  Git commit:      ❌ disabled"
    fi

    if [ "$git_push" = "true" ]; then
        echo "  Git push:        ✅ enabled"
    else
        echo "  Git push:        ❌ disabled"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📚 CENTRALIZED MEMORY (no skill copies needed!)"
    echo ""

    # Count learnings in centralized memory
    local total_learnings=0

    if [ -d "$PROJECT_MEMORY" ]; then
        echo "  Project Memory ($PROJECT_MEMORY/):"
        for memory_file in "$PROJECT_MEMORY"/*.md; do
            if [ -f "$memory_file" ]; then
                local category_name=$(basename "$memory_file" .md)
                local count=$(grep -c "^#### LRN-" "$memory_file" 2>/dev/null || echo "0")
                echo "    • ${category_name}.md    $count learnings"
                total_learnings=$((total_learnings + count))
            fi
        done
        if [ $total_learnings -eq 0 ]; then
            echo "    (no learnings yet - run /sw:reflect after corrections)"
        fi
    else
        echo "  Project Memory: (not initialized)"
    fi

    echo ""

    if [ -d "$GLOBAL_MEMORY" ]; then
        echo "  Global Memory ($GLOBAL_MEMORY/):"
        local global_count=0
        for memory_file in "$GLOBAL_MEMORY"/*.md; do
            if [ -f "$memory_file" ]; then
                local category_name=$(basename "$memory_file" .md)
                local count=$(grep -c "^#### LRN-" "$memory_file" 2>/dev/null || echo "0")
                echo "    • ${category_name}.md    $count learnings"
                global_count=$((global_count + count))
                total_learnings=$((total_learnings + count))
            fi
        done
        if [ $global_count -eq 0 ]; then
            echo "    (no global learnings)"
        fi
    else
        echo "  Global Memory: (not initialized)"
    fi

    echo ""
    echo "  Total: $total_learnings learnings"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 COMMANDS"
    echo ""
    echo "  /sw:reflect          Manual reflection now"
    echo "  /sw:reflect-on       Enable auto-reflect"
    echo "  /sw:reflect-off      Disable auto-reflect"
    echo "  /sw:reflect-clear    Clear specific learnings"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
        reflect|analyze)
            local transcript=""
            local skill=""
            local dry_run="false"
            local confidence="$DEFAULT_CONFIDENCE"
            local max="$DEFAULT_MAX_LEARNINGS"

            while [ $# -gt 0 ]; do
                case "$1" in
                    --transcript)
                        transcript="$2"
                        shift 2
                        ;;
                    --skill)
                        skill="$2"
                        shift 2
                        ;;
                    --dry-run)
                        dry_run="true"
                        shift
                        ;;
                    --confidence)
                        confidence="$2"
                        shift 2
                        ;;
                    --max)
                        max="$2"
                        shift 2
                        ;;
                    *)
                        shift
                        ;;
                esac
            done

            # Auto-detect transcript if not provided
            if [ -z "$transcript" ]; then
                # Try to find most recent transcript in Claude's temp directory
                local claude_temp="${TMPDIR:-/tmp}"
                transcript=$(find "$claude_temp" -name "*.md" -mmin -5 2>/dev/null | head -1)

                if [ -z "$transcript" ]; then
                    echo "⚠️ No transcript found. Use --transcript <path> to specify."
                    return 1
                fi
            fi

            reflect_session "$transcript" "$skill" "$dry_run" "$confidence" "$max"
            ;;
        *)
            echo "Unknown command: $command"
            echo "Usage: reflect.sh [on|off|status|reflect] [options]"
            return 1
            ;;
    esac
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
