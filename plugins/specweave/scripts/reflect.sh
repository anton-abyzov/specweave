#!/bin/bash
# reflect.sh - Self-Improving Skills Reflection System (v3.0)
#
# PHILOSOPHY: Only store HIGH-VALUE learnings that contain actionable rules.
# Most sessions produce NO learnings - that's correct behavior.
#
# What we capture:
# - Direct corrections with both WRONG and RIGHT: "No, don't X. Do Y instead."
# - Explicit rules: "Always use X" / "Never use Y" / "In this project, use X"
# - Project-specific patterns that differ from defaults
#
# What we SKIP:
# - Generic praise ("Perfect!", "Great!")
# - Vague approval ("That's right") - no actionable info
# - Things already in CLAUDE.md
#
# FORMAT: Test-like rules with optional example
#   RULE: When [context], [always|never] [action]
#   EXAMPLE: [one concrete example if helpful]
#
# LIMITS:
# - 30 rules max per category (quality over quantity)
# - ~100 chars per rule (compact)
# - Deduplication by keyword similarity

set +e

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
STATE_DIR="$PROJECT_ROOT/.specweave/state"
REFLECT_CONFIG="$STATE_DIR/reflect-config.json"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
MEMORY_DIR="$PROJECT_ROOT/.specweave/memory"

# Conservative limits - quality over quantity
MAX_RULES_PER_CATEGORY=30
MAX_LOG_LINES=50
DEFAULT_CONFIDENCE="high"  # Only high-confidence by default
DEFAULT_MAX_LEARNINGS=5    # Max 5 per session (most sessions = 0)

# ============================================================================
# LOGGING (with rotation)
# ============================================================================

log() {
    local level="$1"; shift
    mkdir -p "$LOGS_DIR"
    local log_file="$LOGS_DIR/reflect.log"

    # Rotate if needed
    if [ -f "$log_file" ]; then
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo 0)
        [ "$lines" -gt "$MAX_LOG_LINES" ] && tail -n 25 "$log_file" > "$log_file.tmp" && mv "$log_file.tmp" "$log_file"
    fi

    echo "[$(date +%H:%M:%S)] $level: $*" >> "$log_file"
}

ensure_dirs() { mkdir -p "$LOGS_DIR" "$MEMORY_DIR" "$STATE_DIR"; }

get_config() {
    local key="$1" default="$2"
    [ -f "$REFLECT_CONFIG" ] && jq -r ".$key // \"$default\"" "$REFLECT_CONFIG" 2>/dev/null || echo "$default"
}

# ============================================================================
# HIGH-VALUE SIGNAL DETECTION
# ============================================================================

# Patterns that indicate a CORRECTION with actionable info
# Must have both "don't do X" AND "do Y instead" to be valuable
CORRECTION_PATTERNS=(
    "No,? don.t.*instead"
    "No,? use.*not"
    "Wrong.*should be"
    "Never.*always"
    "Don.t.*use.*instead"
    "That.s incorrect.*correct"
    "Actually,?.*should"
    "Stop using.*use"
)

# Patterns for explicit rules (no correction needed, just a rule)
RULE_PATTERNS=(
    "Always use"
    "Never use"
    "In this (project|codebase|repo)"
    "The convention (here|is)"
    "We always"
    "We never"
    "The rule is"
    "Remember to always"
)

# Patterns to SKIP (generic praise with no actionable info)
SKIP_PATTERNS=(
    "^Perfect!?$"
    "^Great!?$"
    "^Exactly!?$"
    "^That.s right\.?$"
    "^Well done\.?$"
    "^Good job\.?$"
    "^Correct\.?$"
)

# Check if context contains actionable info (not just praise)
is_actionable() {
    local text="$1"

    # Skip if it's just generic praise
    for pattern in "${SKIP_PATTERNS[@]}"; do
        if echo "$text" | grep -qiE "$pattern"; then
            return 1
        fi
    done

    # Must be longer than 20 chars to have real content
    [ ${#text} -lt 20 ] && return 1

    # Must contain some actionable verb
    echo "$text" | grep -qiE "(use|don.t|never|always|should|must|avoid|prefer)" || return 1

    return 0
}

# Extract the actual rule from a correction context
extract_rule() {
    local context="$1"

    # Try to find the "do Y instead" part
    local rule=""

    # Pattern: "No, don't X. Use Y instead" -> "Use Y"
    rule=$(echo "$context" | grep -oiE "(use|prefer|always)[^.!?]*" | head -1)
    [ -n "$rule" ] && echo "$rule" && return

    # Pattern: "Should be X" -> "Should be X"
    rule=$(echo "$context" | grep -oiE "should (be|use)[^.!?]*" | head -1)
    [ -n "$rule" ] && echo "$rule" && return

    # Pattern: "Never X, always Y" -> "Always Y"
    rule=$(echo "$context" | grep -oiE "always[^.!?]*" | head -1)
    [ -n "$rule" ] && echo "$rule" && return

    # Fallback: return cleaned context
    echo "$context" | cut -c1-100
}

# Detect high-value signals in transcript
detect_signals() {
    local transcript="$1"
    local signals_file="$STATE_DIR/reflect-signals.txt"

    [ ! -f "$transcript" ] && return 1
    > "$signals_file"

    # Look for corrections (high value)
    for pattern in "${CORRECTION_PATTERNS[@]}"; do
        local matches=$(grep -inE "$pattern" "$transcript" 2>/dev/null | head -3) || true
        if [ -n "$matches" ]; then
            echo "$matches" | while read -r match; do
                local linenum=$(echo "$match" | cut -d: -f1)
                local start=$((linenum > 2 ? linenum - 1 : 1))
                local end=$((linenum + 1))
                local context=$(sed -n "${start},${end}p" "$transcript" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g')

                # Only add if actionable
                if is_actionable "$context"; then
                    local rule=$(extract_rule "$context")
                    echo "CORRECTION|$rule" >> "$signals_file"
                fi
            done
        fi
    done

    # Look for explicit rules (medium value)
    for pattern in "${RULE_PATTERNS[@]}"; do
        local matches=$(grep -inE "$pattern" "$transcript" 2>/dev/null | head -2) || true
        if [ -n "$matches" ]; then
            echo "$matches" | while read -r match; do
                local linenum=$(echo "$match" | cut -d: -f1)
                local context=$(sed -n "${linenum}p" "$transcript" 2>/dev/null | tr '\n' ' ')

                if is_actionable "$context"; then
                    local rule=$(extract_rule "$context")
                    echo "RULE|$rule" >> "$signals_file"
                fi
            done
        fi
    done

    local count=$(wc -l < "$signals_file" 2>/dev/null || echo 0)
    count=$(echo "$count" | tr -d ' ')

    log "info" "Found $count actionable signals"
    [ "$count" -eq 0 ] && return 1

    echo "$signals_file"
}

# ============================================================================
# DEDUPLICATION
# ============================================================================

# Check if a similar rule already exists (by key words)
rule_exists() {
    local file="$1"
    local new_rule="$2"

    [ ! -f "$file" ] && return 1

    # Extract key words from new rule (nouns, verbs)
    local keywords=$(echo "$new_rule" | tr '[:upper:]' '[:lower:]' | grep -oE '\b[a-z]{4,}\b' | sort -u | head -5 | tr '\n' ' ')

    # Check if 3+ keywords match any existing rule
    local match_count=0
    for kw in $keywords; do
        if grep -qi "\b$kw\b" "$file" 2>/dev/null; then
            match_count=$((match_count + 1))
        fi
    done

    [ "$match_count" -ge 3 ] && return 0
    return 1
}

# ============================================================================
# MEMORY MANAGEMENT
# ============================================================================

categorize() {
    local text="$1"
    local lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    case "$lower" in
        *component*|*button*|*ui*|*style*|*css*|*react*|*vue*|*html*) echo "frontend" ;;
        *api*|*endpoint*|*route*|*rest*|*graphql*|*server*) echo "backend" ;;
        *test*|*spec*|*mock*|*assert*|*expect*) echo "testing" ;;
        *deploy*|*docker*|*k8s*|*ci*|*terraform*|*aws*) echo "devops" ;;
        *auth*|*security*|*token*|*password*|*secret*) echo "security" ;;
        *query*|*database*|*sql*|*schema*|*table*) echo "database" ;;
        *file*|*path*|*import*|*export*|*module*) echo "structure" ;;
        *) echo "general" ;;
    esac
}

ensure_memory_file() {
    local category="$1"
    local file="$MEMORY_DIR/${category}.md"

    mkdir -p "$MEMORY_DIR"

    if [ ! -f "$file" ]; then
        local cap=$(echo "$category" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
        cat > "$file" << EOF
# $cap Rules
> Project-specific patterns learned from corrections.
> Max $MAX_RULES_PER_CATEGORY rules, auto-deduplicated.

EOF
    fi

    echo "$file"
}

add_rule() {
    local category="$1"
    local type="$2"  # CORRECTION or RULE
    local rule="$3"

    local file=$(ensure_memory_file "$category")

    # Skip if similar rule exists
    if rule_exists "$file" "$rule"; then
        log "info" "Skipped duplicate: $rule"
        return 1
    fi

    # Clean and format
    local clean=$(echo "$rule" | tr -d '\n\r' | sed 's/  */ /g' | cut -c1-100)
    local marker="→"
    [ "$type" = "CORRECTION" ] && marker="✗→✓"

    echo "- $marker $clean" >> "$file"

    # Prune if over limit (keep newest, they're at bottom)
    local count=$(grep -c "^- " "$file" 2>/dev/null || echo 0)
    if [ "$count" -gt "$MAX_RULES_PER_CATEGORY" ]; then
        local header=$(head -4 "$file")
        local rules=$(grep "^- " "$file" | tail -n "$MAX_RULES_PER_CATEGORY")
        echo "$header" > "$file"
        echo "$rules" >> "$file"
        log "info" "Pruned $category to $MAX_RULES_PER_CATEGORY rules"
    fi

    log "info" "Added to $category: $clean"
    return 0
}

# ============================================================================
# MAIN REFLECTION
# ============================================================================

reflect_session() {
    local transcript="$1"
    local dry_run="${2:-false}"
    local max="${3:-$DEFAULT_MAX_LEARNINGS}"

    ensure_dirs

    local signals_file=$(detect_signals "$transcript")

    if [ -z "$signals_file" ] || [ ! -f "$signals_file" ]; then
        echo "No actionable signals found (this is normal)."
        return 0
    fi

    local total=$(wc -l < "$signals_file" 2>/dev/null || echo 0)
    total=$(echo "$total" | tr -d ' ')

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT: $total actionable signals"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local added=0

    while IFS='|' read -r type rule; do
        [ "$added" -ge "$max" ] && break
        [ -z "$rule" ] && continue

        local category=$(categorize "$rule")

        echo "  [$category] $type"

        if [ "$dry_run" = "false" ]; then
            if add_rule "$category" "$type" "$rule"; then
                added=$((added + 1))
            fi
        else
            added=$((added + 1))
        fi
    done < "$signals_file"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN - would add $added rules"
    else
        echo "✅ Added $added rules"
    fi

    rm -f "$signals_file"
    return 0
}

# ============================================================================
# COMMANDS
# ============================================================================

cmd_on() {
    ensure_dirs
    cat > "$REFLECT_CONFIG" << EOF
{
  "enabled": true,
  "autoReflect": true,
  "enabledAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "confidenceThreshold": "high",
  "maxLearningsPerSession": $DEFAULT_MAX_LEARNINGS
}
EOF
    echo "🧠 Auto-reflection ENABLED (high-value only)"
    echo "   Max $DEFAULT_MAX_LEARNINGS rules/session, $MAX_RULES_PER_CATEGORY per category"
}

cmd_off() {
    ensure_dirs
    [ -f "$REFLECT_CONFIG" ] && jq '.autoReflect = false' "$REFLECT_CONFIG" > "$REFLECT_CONFIG.tmp" && mv "$REFLECT_CONFIG.tmp" "$REFLECT_CONFIG"
    echo "🧠 Auto-reflection DISABLED"
}

cmd_status() {
    ensure_dirs
    local auto=$(get_config "autoReflect" "false")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 REFLECT STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    [ "$auto" = "true" ] && echo "  Auto: ✅ ON" || echo "  Auto: ❌ OFF"
    echo "  Max/session: $DEFAULT_MAX_LEARNINGS"
    echo "  Max/category: $MAX_RULES_PER_CATEGORY"
    echo ""

    local total=0
    if [ -d "$MEMORY_DIR" ]; then
        for f in "$MEMORY_DIR"/*.md; do
            [ -f "$f" ] || continue
            local name=$(basename "$f" .md)
            local count=$(grep -c "^- " "$f" 2>/dev/null || echo 0)
            echo "  📁 $name: $count rules"
            total=$((total + count))
        done
    fi

    echo ""
    echo "  Total: $total rules"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_clear() {
    local cat="${1:-all}"
    if [ "$cat" = "all" ]; then
        rm -f "$MEMORY_DIR"/*.md
        echo "✅ Cleared all rules"
    else
        rm -f "$MEMORY_DIR/${cat}.md"
        echo "✅ Cleared $cat rules"
    fi
}

cmd_show() {
    local cat="${1:-all}"
    if [ "$cat" = "all" ]; then
        for f in "$MEMORY_DIR"/*.md; do
            [ -f "$f" ] && cat "$f" && echo ""
        done
    else
        [ -f "$MEMORY_DIR/${cat}.md" ] && cat "$MEMORY_DIR/${cat}.md" || echo "No $cat rules"
    fi
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local cmd="${1:-reflect}"; shift || true

    case "$cmd" in
        on|enable) cmd_on ;;
        off|disable) cmd_off ;;
        status) cmd_status ;;
        clear) cmd_clear "$@" ;;
        show) cmd_show "$@" ;;
        reflect|analyze)
            local transcript="" dry_run="false" max="$DEFAULT_MAX_LEARNINGS"
            while [ $# -gt 0 ]; do
                case "$1" in
                    --transcript) transcript="$2"; shift 2 ;;
                    --dry-run) dry_run="true"; shift ;;
                    --max) max="$2"; shift 2 ;;
                    *) shift ;;
                esac
            done

            if [ -z "$transcript" ]; then
                transcript=$(find "${TMPDIR:-/tmp}" -name "*.md" -mmin -5 2>/dev/null | head -1)
                [ -z "$transcript" ] && echo "No transcript found" && return 1
            fi

            reflect_session "$transcript" "$dry_run" "$max"
            ;;
        *) echo "Usage: reflect.sh [on|off|status|clear|show|reflect]" ;;
    esac
}

[ "${BASH_SOURCE[0]}" = "$0" ] && main "$@"
