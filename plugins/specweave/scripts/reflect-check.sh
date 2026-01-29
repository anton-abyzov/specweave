#!/bin/bash
# reflect-check.sh - Reflection System Health Check (v3.0)
#
# Diagnostic tool to validate reflection system health and troubleshoot issues.
# Checks TypeScript implementation and CLAUDE.md Skill Memories section.
#
# Usage: bash reflect-check.sh

set +e  # Don't exit on errors - we want to report all issues

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
CONFIG_FILE="$PROJECT_ROOT/.specweave/config.json"
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"
LOGS_DIR="$PROJECT_ROOT/.specweave/logs/reflect"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/../hooks/stop-reflect.sh"

# Colors for output (fallback if tput unavailable or no TERM)
if command -v tput >/dev/null 2>&1 && [ -n "$TERM" ]; then
    GREEN=$(tput setaf 2 2>/dev/null || echo "")
    RED=$(tput setaf 1 2>/dev/null || echo "")
    YELLOW=$(tput setaf 3 2>/dev/null || echo "")
    BLUE=$(tput setaf 4 2>/dev/null || echo "")
    RESET=$(tput sgr0 2>/dev/null || echo "")
else
    GREEN="" RED="" YELLOW="" BLUE="" RESET=""
fi

# ============================================================================
# CHECK FUNCTIONS
# ============================================================================

check_passed=0
check_failed=0
recommendations=()

check_result() {
    local status="$1"
    local message="$2"
    local detail="${3:-}"

    if [ "$status" = "pass" ]; then
        echo "${GREEN}✅${RESET} $message"
        [ -n "$detail" ] && echo "   $detail"
        check_passed=$((check_passed + 1))
    elif [ "$status" = "fail" ]; then
        echo "${RED}❌${RESET} $message"
        [ -n "$detail" ] && echo "   $detail"
        check_failed=$((check_failed + 1))
    elif [ "$status" = "warn" ]; then
        echo "${YELLOW}⚠️${RESET}  $message"
        [ -n "$detail" ] && echo "   $detail"
    else
        echo "${BLUE}ℹ️${RESET}  $message"
        [ -n "$detail" ] && echo "   $detail"
    fi
}

add_recommendation() {
    recommendations+=("$1")
}

# ============================================================================
# MAIN CHECKS
# ============================================================================

main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "${BLUE}🔍 REFLECT HEALTH CHECK (v3.0)${RESET}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # ========================================
    # CHECK 1: Configuration
    # ========================================

    echo "${BLUE}📋 Configuration${RESET}"

    if [ -f "$CONFIG_FILE" ]; then
        if jq empty "$CONFIG_FILE" 2>/dev/null; then
            check_result "pass" "Config file found and valid"

            local enabled=$(jq -r '.reflect.enabled // true' "$CONFIG_FILE" 2>/dev/null)
            local model=$(jq -r '.reflect.model // "haiku"' "$CONFIG_FILE" 2>/dev/null)
            local max=$(jq -r '.reflect.maxLearningsPerSession // 3' "$CONFIG_FILE" 2>/dev/null)

            check_result "info" "Enabled: $enabled"
            check_result "info" "Model: $model"
            check_result "info" "Max learnings/session: $max"

            if [ "$enabled" = "false" ]; then
                add_recommendation "Reflection is disabled. Set reflect.enabled: true in config."
            fi
        else
            check_result "fail" "Config file exists but has invalid JSON"
            add_recommendation "Fix config file: $CONFIG_FILE"
        fi
    else
        check_result "warn" "Config file not found (using defaults)"
    fi

    echo ""

    # ========================================
    # CHECK 2: Hook Validation
    # ========================================

    echo "${BLUE}📝 Hook Validation${RESET}"

    if [ -f "$HOOK_SCRIPT" ]; then
        if bash -n "$HOOK_SCRIPT" 2>/dev/null; then
            check_result "pass" "stop-reflect.sh syntax valid"
        else
            check_result "fail" "stop-reflect.sh has syntax errors"
            add_recommendation "Fix syntax errors in $HOOK_SCRIPT"
        fi
    else
        check_result "fail" "stop-reflect.sh hook not found"
        add_recommendation "Hook missing at: $HOOK_SCRIPT"
    fi

    # Check specweave CLI
    if command -v specweave >/dev/null 2>&1; then
        local version=$(specweave --version 2>/dev/null || echo "unknown")
        check_result "pass" "specweave CLI found" "$version"
    else
        check_result "warn" "specweave CLI not found (reflection may not work)"
        add_recommendation "Install specweave: npm install -g specweave"
    fi

    echo ""

    # ========================================
    # CHECK 3: Dependencies
    # ========================================

    echo "${BLUE}🔧 Dependencies${RESET}"

    if command -v jq >/dev/null 2>&1; then
        local jq_version=$(jq --version 2>/dev/null || echo "unknown")
        check_result "pass" "jq found" "$jq_version"
    else
        check_result "fail" "jq not found"
        add_recommendation "Install jq: brew install jq (macOS) or apt install jq (Linux)"
    fi

    echo ""

    # ========================================
    # CHECK 4: Recent Activity
    # ========================================

    echo "${BLUE}📊 Recent Activity${RESET}"

    if [ -f "$LOGS_DIR/reflect.log" ]; then
        local recent=$(tail -5 "$LOGS_DIR/reflect.log" 2>/dev/null)
        if [ -n "$recent" ]; then
            check_result "pass" "Found recent reflection activity"
            echo ""
            echo "   ${BLUE}Last 5 log entries:${RESET}"
            echo "$recent" | sed 's/^/   /'
        else
            check_result "warn" "Log file exists but is empty"
        fi
    else
        check_result "warn" "No reflection log found"
        add_recommendation "Reflection may not have run yet."
    fi

    echo ""

    # ========================================
    # CHECK 5: CLAUDE.md Skill Memories
    # ========================================

    echo "${BLUE}📚 Skill Memories (CLAUDE.md)${RESET}"

    if [ -f "$CLAUDE_MD" ]; then
        if grep -q "## Skill Memories" "$CLAUDE_MD" 2>/dev/null; then
            check_result "pass" "Skill Memories section found in CLAUDE.md"

            # Count learnings per skill
            local total=0
            local in_section=false

            while IFS= read -r line; do
                if echo "$line" | grep -q "^## Skill Memories"; then
                    in_section=true
                elif [ "$in_section" = true ] && echo "$line" | grep -q "^## "; then
                    break
                elif [ "$in_section" = true ] && echo "$line" | grep -q "^### "; then
                    local skill=$(echo "$line" | sed 's/^### //')
                    local count=$(grep -c "^- \*\*" "$CLAUDE_MD" 2>/dev/null || echo "0")
                    check_result "info" "$skill: $(echo "$count" | head -1) learnings"
                elif [ "$in_section" = true ] && echo "$line" | grep -q "^- \*\*"; then
                    total=$((total + 1))
                fi
            done < "$CLAUDE_MD"

            echo ""
            check_result "info" "Total learnings: $total"
        else
            check_result "warn" "No Skill Memories section found in CLAUDE.md"
            add_recommendation "Skill Memories section will be created on first reflection"
        fi
    else
        check_result "fail" "CLAUDE.md not found"
        add_recommendation "Create CLAUDE.md or run specweave init"
    fi

    echo ""

    # ========================================
    # SUMMARY
    # ========================================

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "${BLUE}📊 SUMMARY${RESET}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Checks passed: ${GREEN}$check_passed${RESET}"
    echo "Checks failed: ${RED}$check_failed${RESET}"
    echo ""

    if [ ${#recommendations[@]} -gt 0 ]; then
        echo "${YELLOW}💡 RECOMMENDATIONS${RESET}"
        for rec in "${recommendations[@]}"; do
            echo "   • $rec"
        done
        echo ""
    else
        echo "${GREEN}✅ System is healthy - no issues found${RESET}"
        echo ""
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Exit with error if critical checks failed
    if [ "$check_failed" -gt 0 ]; then
        return 1
    fi

    return 0
}

main "$@"
