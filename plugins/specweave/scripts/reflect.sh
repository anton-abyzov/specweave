#!/bin/bash
# reflect.sh - Self-Improving Skills Reflection System (v4.0)
#
# NEW IN v4.0: Skill-specific memory routing
# - Learnings can be routed to specific skills (e.g., /reflect architect)
# - Cross-platform support (Claude Code vs non-Claude)
# - Merges with marketplace updates (preserves user learnings)
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
# - 30 rules max per category/skill (quality over quantity)
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

# Skill-specific memory paths (v4.0)
# Claude Code: ~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/
# Non-Claude: .specweave/plugins/specweave/skills/
get_skills_dir() {
    # Check for Claude Code environment
    local claude_dir=""
    case "$(uname -s)" in
        Darwin|Linux) claude_dir="$HOME/.claude" ;;
        MINGW*|MSYS*|CYGWIN*) claude_dir="${APPDATA:-$USERPROFILE/.claude}/Claude" ;;
        *) claude_dir="$HOME/.claude" ;;
    esac

    local marketplace_skills="$claude_dir/plugins/marketplaces/specweave/plugins/specweave/skills"

    # Prefer Claude marketplace location if it exists
    if [ -d "$marketplace_skills" ]; then
        echo "$marketplace_skills"
        return
    fi

    # Fall back to project-local skills
    echo "$PROJECT_ROOT/.specweave/plugins/specweave/skills"
}

SKILLS_DIR=$(get_skills_dir)

# Conservative limits - quality over quantity
MAX_RULES_PER_CATEGORY=30
MAX_LOG_LINES=50
DEFAULT_CONFIDENCE="high"  # Only high-confidence by default
DEFAULT_MAX_LEARNINGS=5    # Max 5 per session (most sessions = 0)

# Quality gate thresholds (avoid magic numbers)
MIN_RULE_LENGTH=15         # Minimum characters for a valid rule
MIN_ACTIONABLE_LENGTH=20   # Minimum chars for actionable context
MIN_WORD_COUNT=3           # Minimum words for a valid rule
MAX_RULE_OUTPUT_LENGTH=100 # Max chars to output per rule
KEYWORD_MIN_LENGTH=4       # Minimum keyword length for dedup matching
MIN_KEYWORD_THRESHOLD=2    # Minimum keyword overlap for duplicate detection
TRANSCRIPT_MAX_AGE_MIN=5   # Max age in minutes for auto-transcript detection
MAX_LEARNINGS_LIMIT=100    # Maximum --max value for safety

# Shared doc/JSON artifact patterns (CONSOLIDATED - update in one place!)
# These patterns catch corrupted data from parsing docs, code examples, or JSON
DOC_ARTIFACT_COMMON='```|\*\*|\\n|\\"|":[[:space:]]|sessionId|userType|"cwd"'
# Line number patterns from Read tool output (e.g., "123→ code")
LINE_NUMBER_PATTERN='[0-9]+→'
# Multiple backtick code examples
MULTI_BACKTICK_PATTERN='`[^`]+`.*`[^`]+`'

# Cleanup function for temp files (called on EXIT)
cleanup_temp() {
    rm -f "${TMPDIR:-/tmp}/reflect_rules_$$" 2>/dev/null
    rm -f "$STATE_DIR/reflect-signals.txt" 2>/dev/null
}

# Set trap for cleanup on script exit
trap cleanup_temp EXIT INT TERM

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

    # Must be longer than MIN_ACTIONABLE_LENGTH chars to have real content
    [ ${#text} -lt "$MIN_ACTIONABLE_LENGTH" ] && return 1

    # Must contain some actionable verb
    echo "$text" | grep -qiE "(use|don.t|never|always|should|must|avoid|prefer)" || return 1

    # QUALITY GATE: Skip documentation examples (uses shared patterns from config)
    # Line numbers at start (Read tool output) + common doc artifacts
    if echo "$text" | grep -qE "^\s*${LINE_NUMBER_PATTERN}|^\s*[0-9]+\s*\||${DOC_ARTIFACT_COMMON}"; then
        return 1
    fi

    # QUALITY GATE: Skip content that looks like code examples with backticks
    if echo "$text" | grep -qE "$MULTI_BACKTICK_PATTERN"; then
        return 1
    fi

    # QUALITY GATE: Skip content with escaped quotes (JSON/code artifacts)
    if echo "$text" | grep -qE '\\"'; then
        return 1
    fi

    return 0
}

# Extract the actual rule from a correction context
# PRIORITY: Extract the "do Y instead" part, not the "don't X" part
extract_rule() {
    local context="$1"
    local rule=""

    # PRIORITY 1: Look for "Use X instead" pattern
    # Captures "Use logger.info() instead" - allows alphanumeric, dots, parens before "instead"
    rule=$(echo "$context" | grep -oiE "[Uu]se [a-zA-Z0-9_.()/]+(\s+[a-zA-Z0-9_.()/]+)*\s+instead" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 2: Look for "should use X" (correction pattern)
    rule=$(echo "$context" | grep -oiE "should (use|be) [^.!?]+" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 3: Look for sentence after "Wrong!" or "No,"
    # Extract the sentence that comes after the negation marker
    rule=$(echo "$context" | grep -oiE "(Wrong!?|No,) [^.!?]+" | sed 's/^[Ww]rong!*[[:space:]]*//;s/^[Nn]o,[[:space:]]*//' | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 4: "Always X" (explicit rule)
    rule=$(echo "$context" | grep -oiE "[Aa]lways [^.!?]+" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 5: "Never X" (prohibition rule)
    rule=$(echo "$context" | grep -oiE "[Nn]ever [^.!?]+" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 6: "In this project/codebase, use X"
    rule=$(echo "$context" | grep -oiE "[Ii]n this (project|codebase)[^.!?]+" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # PRIORITY 7: "prefer X" or "use X not Y"
    rule=$(echo "$context" | grep -oiE "(prefer|use) [^.!?]+ (not|instead|over) [^.!?]+" | head -1)
    if [ -n "$rule" ] && [ ${#rule} -gt "$MIN_RULE_LENGTH" ]; then
        echo "$rule" | sed 's/^[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
        return
    fi

    # Fallback: return cleaned context (last resort, but apply quality filter in add_rule)
    echo "$context" | sed 's/^[[:space:]]*//;s/^[Uu]ser:[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH"
}

# Detect high-value signals in transcript
# v4.1: Supports both plain text and JSONL (Claude Code) transcript formats
detect_signals() {
    local transcript="$1"
    local signals_file="$STATE_DIR/reflect-signals.txt"
    local extracted_text="${TMPDIR:-/tmp}/reflect_extracted_$$"

    [ ! -f "$transcript" ] && return 1
    > "$signals_file"

    # ========================================================================
    # JSONL HANDLING (v4.2 - GAP-006: Enhanced format resilience)
    # Claude Code transcripts are JSONL - extract user text for analysis
    # Supports multiple format variations for future-proofing
    # ========================================================================
    local is_jsonl="false"
    if [[ "$transcript" == *.jsonl ]] || head -1 "$transcript" 2>/dev/null | grep -q '^{'; then
        is_jsonl="true"

        # Strategy 1: Current Claude Code format (message.role, message.content[].text)
        jq -r 'select(.message.role == "user") | .message.content[]? | select(.text) | .text' "$transcript" 2>/dev/null > "$extracted_text" || true

        # Check if extraction succeeded
        if [ ! -s "$extracted_text" ]; then
            log "debug" "Strategy 1 failed, trying alternative format..."

            # Strategy 2: Alternative format (role at root level)
            jq -r 'select(.role == "user") | .content[]? | select(.text) | .text' "$transcript" 2>/dev/null > "$extracted_text" || true
        fi

        if [ ! -s "$extracted_text" ]; then
            log "debug" "Strategy 2 failed, trying simple content extraction..."

            # Strategy 3: Simple text extraction (content as string)
            jq -r 'select(.role == "user" or .message.role == "user") | .content // .message.content // empty' "$transcript" 2>/dev/null > "$extracted_text" || true
        fi

        if [ ! -s "$extracted_text" ]; then
            log "warn" "All jq strategies failed, using raw text fallback"

            # Strategy 4: Raw grep - last resort
            # Just copy raw content for pattern matching
            grep -v '^\s*{' "$transcript" 2>/dev/null > "$extracted_text" || cp "$transcript" "$extracted_text" 2>/dev/null || true
        fi
    else
        # Plain text - use directly
        cp "$transcript" "$extracted_text" 2>/dev/null || true
    fi

    # Bail if no text extracted
    if [ ! -s "$extracted_text" ]; then
        rm -f "$extracted_text"
        return 1
    fi

    # Look for corrections (high value)
    for pattern in "${CORRECTION_PATTERNS[@]}"; do
        local matches=$(grep -inE "$pattern" "$extracted_text" 2>/dev/null | head -3) || true
        if [ -n "$matches" ]; then
            echo "$matches" | while read -r match; do
                local linenum=$(echo "$match" | cut -d: -f1)
                local start=$((linenum > 2 ? linenum - 1 : 1))
                local end=$((linenum + 1))
                local context=$(sed -n "${start},${end}p" "$extracted_text" 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g')

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
        local matches=$(grep -inE "$pattern" "$extracted_text" 2>/dev/null | head -2) || true
        if [ -n "$matches" ]; then
            echo "$matches" | while read -r match; do
                local linenum=$(echo "$match" | cut -d: -f1)
                local context=$(sed -n "${linenum}p" "$extracted_text" 2>/dev/null | tr '\n' ' ')

                if is_actionable "$context"; then
                    local rule=$(extract_rule "$context")
                    echo "RULE|$rule" >> "$signals_file"
                fi
            done
        fi
    done

    # Cleanup
    rm -f "$extracted_text"

    local count=$(wc -l < "$signals_file" 2>/dev/null || echo 0)
    count=$(echo "$count" | tr -d ' ')

    log "info" "Found $count actionable signals"
    [ "$count" -eq 0 ] && return 1

    echo "$signals_file"
}

# ============================================================================
# DEDUPLICATION
# ============================================================================

# Check if a similar rule already exists
# STRICT DEDUPLICATION: Exact substring match OR high keyword overlap
rule_exists() {
    local file="$1"
    local new_rule="$2"

    [ ! -f "$file" ] && return 1

    # Normalize rule for comparison (lowercase, trim, collapse spaces)
    local normalized=$(echo "$new_rule" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/[[:space:]]\+/ /g')

    # STRICT CHECK 1: Exact substring match (catches same rule with different prefix)
    # Use -F for fixed-string match to avoid regex injection from user input
    # The -- prevents patterns starting with - from being interpreted as options
    if grep -Fqi -- "$normalized" "$file" 2>/dev/null; then
        return 0
    fi

    # STRICT CHECK 2: Rule already contains the key phrase
    # Extract core action phrase (verb + object)
    local core_phrase=$(echo "$normalized" | grep -oE "(use|prefer|always|never) [a-z]+( [a-z]+)?" | head -1)
    # Use -F for fixed-string match to avoid periods/special chars being treated as regex
    if [ -n "$core_phrase" ] && grep -Fqi -- "$core_phrase" "$file" 2>/dev/null; then
        return 0
    fi

    # STRICT CHECK 3: High keyword overlap (at least 50% of words must match a single existing rule)
    local keywords=$(echo "$normalized" | grep -oE "\b[a-z]{${KEYWORD_MIN_LENGTH},}\b" | sort -u | tr '\n' ' ')
    local keyword_count=$(echo "$keywords" | wc -w | tr -d ' ')

    # For each existing rule, check overlap
    # POSIX-compatible: use temp file instead of process substitution
    local temp_rules="${TMPDIR:-/tmp}/reflect_rules_$$"
    grep "^- " "$file" 2>/dev/null > "$temp_rules" || true

    while IFS= read -r existing_rule; do
        [ -z "$existing_rule" ] && continue
        local existing_lower=$(echo "$existing_rule" | tr '[:upper:]' '[:lower:]')
        local match_count=0

        for kw in $keywords; do
            # Use -F for fixed-string to avoid regex metacharacters in keywords
            # The -- prevents keywords starting with - from being interpreted as options
            if echo "$existing_lower" | grep -Fq -- "$kw" 2>/dev/null; then
                match_count=$((match_count + 1))
            fi
        done

        # If more than 50% of keywords match ONE existing rule, it's a duplicate
        local threshold=$((keyword_count / 2))
        [ "$threshold" -lt "$MIN_KEYWORD_THRESHOLD" ] && threshold="$MIN_KEYWORD_THRESHOLD"
        if [ "$match_count" -ge "$threshold" ]; then
            rm -f "$temp_rules"
            return 0
        fi
    done < "$temp_rules"

    rm -f "$temp_rules"
    return 1
}

# ============================================================================
# MEMORY MANAGEMENT
# ============================================================================

# Detect skill from content (v4.0)
# Returns skill name if detected, empty string otherwise
detect_skill() {
    local text="$1"
    local lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    # Skill keyword mappings (most specific first)
    # Use grep for multi-word matches to avoid bash case pattern limitations
    case "$lower" in
        *architecture*|*adr*|*microservices*|*ddd*|*cqrs*)
            echo "architect" ;;
        *refactoring*|*solid*)
            echo "tech-lead" ;;
        *qa*|*regression*)
            echo "qa-lead" ;;
        *security*|*owasp*|*auth*|*xss*|*injection*|*csrf*)
            echo "security" ;;
        *terraform*|*iac*|*cloudformation*|*serverless*)
            echo "infrastructure" ;;
        *documentation*|*readme*|*docusaurus*)
            echo "docs-writer" ;;
        *performance*|*optimization*|*profiling*|*caching*)
            echo "performance" ;;
        *tdd*)
            echo "tdd-orchestrator" ;;
        *product*|*requirements*|*roadmap*|*mvp*)
            echo "pm" ;;
        *)
            # Check multi-word patterns with grep
            if echo "$lower" | grep -qE "system design|tech lead|code review|clean code|test strategy|quality gate|acceptance|api docs|test-driven|red-green|test first|user stories"; then
                case "$lower" in
                    *"system design"*) echo "architect" ;;
                    *"tech lead"*|*"code review"*|*"clean code"*) echo "tech-lead" ;;
                    *"test strategy"*|*"quality gate"*|*"acceptance"*) echo "qa-lead" ;;
                    *"api docs"*) echo "docs-writer" ;;
                    *"test-driven"*|*"red-green"*|*"test first"*) echo "tdd-orchestrator" ;;
                    *"user stories"*) echo "pm" ;;
                    *) echo "" ;;
                esac
            else
                echo ""  # No skill detected, use category instead
            fi
            ;;
    esac
}

# Check if a skill exists
skill_exists() {
    local skill_name="$1"
    [ -d "$SKILLS_DIR/$skill_name" ] && [ -f "$SKILLS_DIR/$skill_name/SKILL.md" ]
}

# Get skill memory file path
get_skill_memory_path() {
    local skill_name="$1"
    echo "$SKILLS_DIR/$skill_name/MEMORY.md"
}

# Ensure skill memory file exists with header
ensure_skill_memory() {
    local skill_name="$1"
    local memory_file=$(get_skill_memory_path "$skill_name")

    if [ ! -d "$SKILLS_DIR/$skill_name" ]; then
        return 1
    fi

    if [ ! -f "$memory_file" ]; then
        local skill_title=$(echo "$skill_name" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)} 1')
        cat > "$memory_file" << EOF
# $skill_title Memory

> Auto-generated by SpecWeave Reflect. User learnings are preserved across updates.
> Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Learned Patterns

EOF
    fi

    echo "$memory_file"
}

# Add rule to skill memory
add_skill_rule() {
    local skill_name="$1"
    local type="$2"
    local rule="$3"

    local memory_file=$(ensure_skill_memory "$skill_name")
    [ -z "$memory_file" ] && return 1

    # Clean rule
    local clean=$(echo "$rule" | tr -d '\n\r' | sed 's/  */ /g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH")

    # Quality gates (same as add_rule)
    [ ${#clean} -lt "$MIN_RULE_LENGTH" ] && return 1
    echo "$clean" | grep -qiE "(use|prefer|always|never|should|avoid|don't|must|do not)" || return 1

    # Dedup check
    if rule_exists "$memory_file" "$clean"; then
        log "info" "Skipped duplicate in $skill_name: $clean"
        return 1
    fi

    # Generate learning ID
    local learning_id="LRN-$(date +%Y%m%d)-$(head /dev/urandom | tr -dc 'A-Z0-9' | head -c 4)"
    local confidence="High"
    [ "$type" = "RULE" ] && confidence="Medium"

    # Append structured learning
    cat >> "$memory_file" << EOF
#### $learning_id ($confidence Confidence)
**Learning**: $clean
**Added**: $(date +%Y-%m-%d)
**Source**: session:$(date +%Y-%m-%d)

EOF

    # Update timestamp in header
    sed -i.bak "s/^> Last updated:.*/> Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$memory_file" 2>/dev/null || true
    rm -f "$memory_file.bak"

    log "info" "Added to skill $skill_name: $clean"
    return 0
}

categorize() {
    local text="$1"
    local lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    case "$lower" in
        *component*|*button*|*ui*|*style*|*css*|*react*|*vue*|*html*|*tailwind*) echo "frontend" ;;
        *api*|*endpoint*|*route*|*rest*|*graphql*|*server*|*backend*) echo "backend" ;;
        *test*|*spec*|*mock*|*assert*|*expect*|*vitest*|*jest*|*playwright*) echo "testing" ;;
        *deploy*|*docker*|*k8s*|*ci*|*terraform*|*aws*|*gcp*|*azure*) echo "devops" ;;
        *auth*|*security*|*token*|*password*|*secret*|*encryption*) echo "security" ;;
        *query*|*database*|*sql*|*schema*|*table*|*prisma*|*drizzle*) echo "database" ;;
        *file*|*path*|*import*|*export*|*module*|*require*) echo "structure" ;;
        *logger*|*log*|*console*|*debug*|*error*|*warn*) echo "logging" ;;
        *type*|*interface*|*typescript*|*generic*|*enum*) echo "types" ;;
        *git*|*commit*|*branch*|*merge*|*rebase*) echo "git" ;;
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

    # Clean and format FIRST
    # Remove "User:" prefix, extra whitespace, and limit length
    local clean=$(echo "$rule" | tr -d '\n\r' | sed 's/  */ /g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^[Uu]ser:[[:space:]]*//' | cut -c1-"$MAX_RULE_OUTPUT_LENGTH")

    # QUALITY GATE 1: Minimum length (too short = useless)
    if [ ${#clean} -lt "$MIN_RULE_LENGTH" ]; then
        log "info" "Skipped too short: $clean"
        return 1
    fi

    # QUALITY GATE 2: Must contain actionable verb
    if ! echo "$clean" | grep -qiE "(use|prefer|always|never|should|avoid|don't|must|do not)"; then
        log "info" "Skipped non-actionable: $clean"
        return 1
    fi

    # QUALITY GATE 3: Must have specific subject (not just a verb phrase)
    local word_count=$(echo "$clean" | wc -w | tr -d ' ')
    if [ "$word_count" -lt "$MIN_WORD_COUNT" ]; then
        log "info" "Skipped too vague: $clean"
        return 1
    fi

    # QUALITY GATE 4: Skip documentation/JSON artifacts (uses shared patterns)
    # Uses LINE_NUMBER_PATTERN instead of bare → to avoid filtering legitimate rules
    if echo "$clean" | grep -qE "${LINE_NUMBER_PATTERN}|${DOC_ARTIFACT_COMMON}"; then
        log "info" "Skipped doc/JSON artifact: $clean"
        return 1
    fi

    # Skip if similar rule exists
    if rule_exists "$file" "$clean"; then
        log "info" "Skipped duplicate: $clean"
        return 1
    fi

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
    local target_skill="${4:-}"  # Optional: force routing to specific skill

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
    if [ -n "$target_skill" ]; then
        echo "   Target: skill/$target_skill"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local added=0
    local skill_adds=0
    local category_adds=0

    while IFS='|' read -r type rule; do
        [ "$added" -ge "$max" ] && break
        [ -z "$rule" ] && continue

        # Determine target: explicit skill > detected skill > category
        local skill=""
        local category=""

        if [ -n "$target_skill" ]; then
            # Force routing to specified skill
            skill="$target_skill"
        else
            # Auto-detect skill from content
            skill=$(detect_skill "$rule")
        fi

        if [ -n "$skill" ] && skill_exists "$skill"; then
            echo "  [skill:$skill] $type"

            if [ "$dry_run" = "false" ]; then
                if add_skill_rule "$skill" "$type" "$rule"; then
                    added=$((added + 1))
                    skill_adds=$((skill_adds + 1))
                fi
            else
                added=$((added + 1))
            fi
        else
            # Fall back to category-based routing
            category=$(categorize "$rule")
            echo "  [category:$category] $type"

            if [ "$dry_run" = "false" ]; then
                if add_rule "$category" "$type" "$rule"; then
                    added=$((added + 1))
                    category_adds=$((category_adds + 1))
                fi
            else
                added=$((added + 1))
            fi
        fi
    done < "$signals_file"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$dry_run" = "true" ]; then
        echo "🔍 DRY RUN - would add $added rules"
    else
        echo "✅ Added $added rules"
        [ "$skill_adds" -gt 0 ] && echo "   Skills: $skill_adds"
        [ "$category_adds" -gt 0 ] && echo "   Categories: $category_adds"
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
    if [ -f "$REFLECT_CONFIG" ]; then
        # Safely update config with error handling to prevent corruption
        local tmp_file="${REFLECT_CONFIG}.tmp.$$"
        if jq '.autoReflect = false' "$REFLECT_CONFIG" > "$tmp_file" 2>/dev/null; then
            # jq succeeded - safely move temp to config
            mv "$tmp_file" "$REFLECT_CONFIG"
        else
            # jq failed - clean up and warn
            rm -f "$tmp_file"
            log "error" "Failed to update config, keeping existing"
            echo "⚠️  Warning: Could not update config file"
            return 1
        fi
    fi
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

cmd_skill() {
    local skill_name="$1"

    if [ -z "$skill_name" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🧠 AVAILABLE SKILLS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Skills directory: $SKILLS_DIR"
        echo ""

        if [ ! -d "$SKILLS_DIR" ]; then
            echo "No skills directory found."
            return 1
        fi

        local found=0
        for skill_dir in "$SKILLS_DIR"/*/; do
            [ -d "$skill_dir" ] || continue
            local skill=$(basename "$skill_dir")
            if [ -f "$skill_dir/SKILL.md" ]; then
                local memory_file="$skill_dir/MEMORY.md"
                local count=0
                if [ -f "$memory_file" ]; then
                    local raw_count
                    raw_count=$(grep -c "^####" "$memory_file" 2>/dev/null || echo "0")
                    # Ensure count is a valid integer (handle newlines/whitespace)
                    count=$(echo "$raw_count" | tr -d '[:space:]' | grep -E '^[0-9]+$' || echo "0")
                    [ -z "$count" ] && count=0
                fi
                printf "  %-25s %d learnings\n" "$skill" "$count"
                found=$((found + 1))
            fi
        done

        if [ "$found" -eq 0 ]; then
            echo "No skills found."
        fi

        echo ""
        echo "Usage: reflect.sh skill <skill-name>"
        return 0
    fi

    # Show specific skill memory
    if ! skill_exists "$skill_name"; then
        echo "Skill '$skill_name' not found in $SKILLS_DIR"
        return 1
    fi

    local memory_file=$(get_skill_memory_path "$skill_name")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 SKILL MEMORY: $skill_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ -f "$memory_file" ]; then
        cat "$memory_file"
    else
        echo "No learnings yet for skill '$skill_name'."
        echo ""
        echo "Add learnings with:"
        echo "  reflect.sh reflect --skill $skill_name --transcript <file>"
    fi
}

main() {
    local cmd="${1:-reflect}"; shift || true

    case "$cmd" in
        on|enable) cmd_on ;;
        off|disable) cmd_off ;;
        status) cmd_status ;;
        clear) cmd_clear "$@" ;;
        show) cmd_show "$@" ;;
        skill) cmd_skill "$@" ;;
        reflect|analyze)
            local transcript="" dry_run="false" max="$DEFAULT_MAX_LEARNINGS" target_skill=""
            while [ $# -gt 0 ]; do
                case "$1" in
                    --transcript) transcript="$2"; shift 2 ;;
                    --dry-run) dry_run="true"; shift ;;
                    --skill)
                        # Route all learnings to specific skill
                        target_skill="$2"
                        if ! skill_exists "$target_skill"; then
                            echo "Error: Skill '$target_skill' not found"
                            echo "Available skills:"
                            cmd_skill
                            return 1
                        fi
                        shift 2
                        ;;
                    --max)
                        # Validate --max is a positive integer (uses constant MAX_LEARNINGS_LIMIT)
                        if echo "$2" | grep -qE '^[0-9]+$' && [ "$2" -gt 0 ] && [ "$2" -le "$MAX_LEARNINGS_LIMIT" ]; then
                            max="$2"
                        else
                            echo "Error: --max must be a positive integer between 1 and $MAX_LEARNINGS_LIMIT"
                            return 1
                        fi
                        shift 2
                        ;;
                    *) shift ;;
                esac
            done

            if [ -z "$transcript" ]; then
                # Auto-detect transcript with safer patterns
                # Look for Claude-specific transcript patterns first, then generic .md
                # Use -mmin for age limit to avoid picking stale files
                local tmpdir="${TMPDIR:-/tmp}"

                # Priority 1: Claude conversation transcripts (most likely)
                transcript=$(find "$tmpdir" -maxdepth 2 -name "*transcript*.md" -mmin -"$TRANSCRIPT_MAX_AGE_MIN" -type f 2>/dev/null | head -1)

                # Priority 2: Claude session files
                if [ -z "$transcript" ]; then
                    transcript=$(find "$tmpdir" -maxdepth 2 -name "*claude*.md" -mmin -"$TRANSCRIPT_MAX_AGE_MIN" -type f 2>/dev/null | head -1)
                fi

                # Priority 3: Any recent .md (fallback, less reliable)
                if [ -z "$transcript" ]; then
                    transcript=$(find "$tmpdir" -maxdepth 2 -name "*.md" -mmin -"$TRANSCRIPT_MAX_AGE_MIN" -type f 2>/dev/null | head -1)
                fi

                if [ -z "$transcript" ]; then
                    echo "No transcript found in $tmpdir (max age: ${TRANSCRIPT_MAX_AGE_MIN}min)"
                    return 1
                fi

                log "info" "Auto-detected transcript: $transcript"
            fi

            reflect_session "$transcript" "$dry_run" "$max" "$target_skill"
            ;;
        *)
            echo "reflect.sh - Self-Improving Skills Reflection System (v4.0)"
            echo ""
            echo "Usage: reflect.sh <command> [options]"
            echo ""
            echo "Commands:"
            echo "  reflect     Analyze transcript and extract learnings"
            echo "  on          Enable auto-reflection on session end"
            echo "  off         Disable auto-reflection"
            echo "  status      Show reflection status and memory stats"
            echo "  show [cat]  Show learnings (all or by category)"
            echo "  clear [cat] Clear learnings (all or by category)"
            echo "  skill [name] List skills or show skill memory"
            echo ""
            echo "Options for 'reflect':"
            echo "  --transcript <file>  Transcript file to analyze"
            echo "  --skill <name>       Route all learnings to specific skill"
            echo "  --dry-run            Preview without saving"
            echo "  --max <n>            Max learnings to add (default: 5)"
            echo ""
            echo "Examples:"
            echo "  reflect.sh reflect --skill architect"
            echo "  reflect.sh skill architect"
            echo "  reflect.sh status"
            ;;
    esac
}

[ "${BASH_SOURCE[0]}" = "$0" ] && main "$@"
