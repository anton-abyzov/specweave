#!/bin/bash
# validate-completion-conditions.sh
# Validates completion conditions for auto mode (v0.4.0+)
#
# Reads session.completionConditions from auto-session.json
# Validates each condition (build, tests, e2e, lint, types, coverage, custom command)
# Auto-detects framework-specific commands
# Implements self-healing for build/lint failures (max 3 retries)
# Returns exit code 0 if ALL conditions pass, 1 if ANY fail
#
# STATUS: NOT YET WIRED into stop-auto.sh
# This script exists but is never called from the stop hook.
# stop-auto.sh has its own inline validate_increment() function.
# This script reads auto-session.json which is not created by current auto.ts.
# Wiring this into the stop hook pipeline is future work.
#
# Usage: validate-completion-conditions.sh <SESSION_FILE> <TRANSCRIPT_PATH>

set -e

SESSION_FILE="$1"
TRANSCRIPT_PATH="$2"

if [ ! -f "$SESSION_FILE" ]; then
    echo "Session file not found: $SESSION_FILE" >&2
    exit 1
fi

# Check if completionConditions exist in session
HAS_CONDITIONS=$(jq -r 'has("completionConditions")' "$SESSION_FILE" 2>/dev/null || echo "false")

if [ "$HAS_CONDITIONS" = "false" ] || [ "$(jq -r '.completionConditions | length' "$SESSION_FILE" 2>/dev/null || echo "0")" = "0" ]; then
    # No completion conditions - pass validation
    exit 0
fi

# ============================================================================
# FRAMEWORK DETECTION
# Auto-detect build/test/lint commands based on project files
# ============================================================================

detect_framework() {
    if [ -f "package.json" ]; then
        echo "npm"
    elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
        echo "python"
    elif [ -f "go.mod" ]; then
        echo "go"
    elif [ -f "Cargo.toml" ]; then
        echo "rust"
    elif [ -f "pom.xml" ]; then
        echo "maven"
    elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
        echo "gradle"
    else
        echo "unknown"
    fi
}

detect_command() {
    local condition_type="$1"
    local framework=$(detect_framework)

    case "$condition_type" in
        build)
            case "$framework" in
                npm)
                    if jq -e '.scripts.build' package.json &>/dev/null; then
                        echo "npm run build"
                    else
                        echo ""  # No build command
                    fi
                    ;;
                python)
                    if [ -f "pyproject.toml" ]; then
                        echo "python -m build"
                    else
                        echo ""
                    fi
                    ;;
                go)
                    echo "go build ./..."
                    ;;
                rust)
                    echo "cargo build"
                    ;;
                maven)
                    echo "mvn compile"
                    ;;
                gradle)
                    echo "./gradlew build"
                    ;;
                *)
                    echo ""
                    ;;
            esac
            ;;
        tests)
            case "$framework" in
                npm)
                    if jq -e '.scripts.test' package.json &>/dev/null; then
                        echo "npm test"
                    elif [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
                        echo "npx vitest run"
                    elif [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
                        echo "npx jest"
                    else
                        echo "npm test"
                    fi
                    ;;
                python)
                    if [ -f "pytest.ini" ] || grep -q pytest requirements.txt 2>/dev/null; then
                        echo "pytest"
                    else
                        echo "python -m unittest"
                    fi
                    ;;
                go)
                    echo "go test ./..."
                    ;;
                rust)
                    echo "cargo test"
                    ;;
                maven)
                    echo "mvn test"
                    ;;
                gradle)
                    echo "./gradlew test"
                    ;;
                *)
                    echo "npm test"
                    ;;
            esac
            ;;
        e2e)
            case "$framework" in
                npm)
                    if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
                        echo "npx playwright test"
                    elif [ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ]; then
                        echo "npx cypress run"
                    else
                        echo ""
                    fi
                    ;;
                *)
                    echo ""
                    ;;
            esac
            ;;
        lint)
            case "$framework" in
                npm)
                    if jq -e '.scripts.lint' package.json &>/dev/null; then
                        echo "npm run lint"
                    elif [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
                        echo "npx eslint ."
                    else
                        echo ""
                    fi
                    ;;
                python)
                    if grep -q "black" requirements.txt 2>/dev/null; then
                        echo "black --check ."
                    elif grep -q "flake8" requirements.txt 2>/dev/null; then
                        echo "flake8"
                    else
                        echo ""
                    fi
                    ;;
                go)
                    echo "golangci-lint run"
                    ;;
                rust)
                    echo "cargo clippy"
                    ;;
                *)
                    echo ""
                    ;;
            esac
            ;;
        types)
            case "$framework" in
                npm)
                    if [ -f "tsconfig.json" ]; then
                        echo "npx tsc --noEmit"
                    else
                        echo ""
                    fi
                    ;;
                python)
                    if grep -q "mypy" requirements.txt 2>/dev/null; then
                        echo "mypy ."
                    else
                        echo ""
                    fi
                    ;;
                *)
                    echo ""
                    ;;
            esac
            ;;
    esac
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_build() {
    local auto_heal="$1"
    local max_retries="${2:-3}"
    local cmd=$(detect_command "build")

    if [ -z "$cmd" ]; then
        echo "  ⏭️  No build command detected - skipping" >&2
        return 0
    fi

    echo "  🔨 Running build: $cmd" >&2

    local attempt=1
    while [ $attempt -le "$max_retries" ]; do
        if eval "$cmd" >/dev/null 2>&1; then
            echo "  ✅ Build passed" >&2
            return 0
        else
            echo "  ❌ Build failed (attempt $attempt/$max_retries)" >&2

            if [ "$auto_heal" = "true" ] && [ $attempt -lt "$max_retries" ]; then
                echo "  🔄 Auto-heal enabled - will retry after LLM fix" >&2
                attempt=$((attempt + 1))
            else
                echo "BLOCK:Build failed after $attempt attempt(s)"
                return 1
            fi
        fi
    done

    echo "BLOCK:Build failed after $max_retries retries"
    return 1
}

validate_tests() {
    local auto_heal="${1:-false}"
    local max_retries="${2:-1}"
    local cmd=$(detect_command "tests")

    echo "  🧪 Running tests: $cmd" >&2

    # Note: Tests don't auto-retry within this script
    # Auto-heal logic is handled by stop-auto.sh's self-healing mechanism
    # This just validates if tests pass or fail
    if ! eval "$cmd" >/dev/null 2>&1; then
        echo "BLOCK:Tests failed - check test output for details"
        return 1
    fi

    echo "  ✅ Tests passed" >&2
    return 0
}

validate_e2e() {
    local cmd=$(detect_command "e2e")

    if [ -z "$cmd" ]; then
        echo "  ⏭️  No E2E framework detected - skipping" >&2
        return 0
    fi

    echo "  🎭 Running E2E tests: $cmd" >&2

    if ! eval "$cmd" >/dev/null 2>&1; then
        echo "BLOCK:E2E tests failed"
        return 1
    fi

    echo "  ✅ E2E tests passed" >&2
    return 0
}

validate_lint() {
    local auto_heal="$1"
    local max_retries="${2:-3}"
    local cmd=$(detect_command "lint")

    if [ -z "$cmd" ]; then
        echo "  ⏭️  No lint command detected - skipping" >&2
        return 0
    fi

    echo "  🧹 Running lint: $cmd" >&2

    local attempt=1
    while [ $attempt -le "$max_retries" ]; do
        if eval "$cmd" >/dev/null 2>&1; then
            echo "  ✅ Lint passed" >&2
            return 0
        else
            echo "  ❌ Lint failed (attempt $attempt/$max_retries)" >&2

            if [ "$auto_heal" = "true" ] && [ $attempt -lt "$max_retries" ]; then
                echo "  🔄 Auto-heal enabled - will retry after LLM fix" >&2
                attempt=$((attempt + 1))
            else
                echo "BLOCK:Lint failed after $attempt attempt(s)"
                return 1
            fi
        fi
    done

    echo "BLOCK:Lint failed after $max_retries retries"
    return 1
}

validate_types() {
    local auto_heal="$1"
    local max_retries="${2:-3}"
    local cmd=$(detect_command "types")

    if [ -z "$cmd" ]; then
        echo "  ⏭️  No type-checking command detected - skipping" >&2
        return 0
    fi

    echo "  📘 Running type-check: $cmd" >&2

    local attempt=1
    while [ $attempt -le "$max_retries" ]; do
        if eval "$cmd" >/dev/null 2>&1; then
            echo "  ✅ Type-check passed" >&2
            return 0
        else
            echo "  ❌ Type-check failed (attempt $attempt/$max_retries)" >&2

            if [ "$auto_heal" = "true" ] && [ $attempt -lt "$max_retries" ]; then
                echo "  🔄 Auto-heal enabled - will retry after LLM fix" >&2
                attempt=$((attempt + 1))
            else
                echo "BLOCK:Type-check failed after $attempt attempt(s)"
                return 1
            fi
        fi
    done

    echo "BLOCK:Type-check failed after $max_retries retries"
    return 1
}

validate_coverage() {
    local threshold="$1"
    local framework=$(detect_framework)

    # This is simplified - real implementation would parse coverage reports
    echo "  📊 Coverage validation (threshold: ${threshold}%) - NOT YET IMPLEMENTED" >&2
    return 0
}

validate_custom_command() {
    local cmd="$1"

    echo "  ⚡ Running custom command: $cmd" >&2

    if ! eval "$cmd" >/dev/null 2>&1; then
        echo "BLOCK:Custom command failed: $cmd"
        return 1
    fi

    echo "  ✅ Custom command passed" >&2
    return 0
}

# ============================================================================
# MAIN VALIDATION LOOP
# ============================================================================

echo "🔍 Validating completion conditions..." >&2

# Parse conditions array from session file
CONDITIONS_JSON=$(jq -r '.completionConditions' "$SESSION_FILE")
CONDITION_COUNT=$(echo "$CONDITIONS_JSON" | jq -r 'length')

echo "Found $CONDITION_COUNT completion condition(s)" >&2

# Track failures
FAILED_CONDITIONS=()

# Iterate through each condition
for i in $(seq 0 $((CONDITION_COUNT - 1))); do
    CONDITION=$(echo "$CONDITIONS_JSON" | jq -r ".[$i]")
    TYPE=$(echo "$CONDITION" | jq -r '.type')
    AUTO_HEAL=$(echo "$CONDITION" | jq -r '.autoHeal // "false"')
    MAX_RETRIES=$(echo "$CONDITION" | jq -r '.maxRetries // "3"')
    THRESHOLD=$(echo "$CONDITION" | jq -r '.threshold // ""')
    CMD=$(echo "$CONDITION" | jq -r '.cmd // ""')

    echo "" >&2
    echo "Condition $((i + 1))/$CONDITION_COUNT: $TYPE" >&2

    case "$TYPE" in
        build)
            if ! validate_build "$AUTO_HEAL" "$MAX_RETRIES"; then
                FAILED_CONDITIONS+=("build")
            fi
            ;;
        tests)
            if ! validate_tests "$AUTO_HEAL" "$MAX_RETRIES"; then
                FAILED_CONDITIONS+=("tests")
            fi
            ;;
        e2e)
            if ! validate_e2e; then
                FAILED_CONDITIONS+=("e2e")
            fi
            ;;
        lint)
            if ! validate_lint "$AUTO_HEAL" "$MAX_RETRIES"; then
                FAILED_CONDITIONS+=("lint")
            fi
            ;;
        types)
            if ! validate_types "$AUTO_HEAL" "$MAX_RETRIES"; then
                FAILED_CONDITIONS+=("types")
            fi
            ;;
        coverage)
            if ! validate_coverage "$THRESHOLD"; then
                FAILED_CONDITIONS+=("coverage:$THRESHOLD%")
            fi
            ;;
        e2e-coverage)
            # Similar to coverage
            echo "  🎯 E2E coverage validation - NOT YET IMPLEMENTED" >&2
            ;;
        llm-judge)
            # LLM Judge quality assessment
            echo "  🤖 Running LLM Judge quality assessment..." >&2

            JUDGE_SCRIPT="$(dirname "$0")/llm-judge-validator.sh"
            if [ -f "$JUDGE_SCRIPT" ]; then
                # Extract increment ID from session
                CURRENT_INCREMENT=$(jq -r '.currentIncrement // ""' "$SESSION_FILE")

                if ! "$JUDGE_SCRIPT" "$CURRENT_INCREMENT" "$TRANSCRIPT_PATH" 2>&1; then
                    FAILED_CONDITIONS+=("llm-judge")
                fi
            else
                echo "  ⚠️  LLM judge script not found - skipping" >&2
            fi
            ;;
        command)
            if ! validate_custom_command "$CMD"; then
                FAILED_CONDITIONS+=("command:$CMD")
            fi
            ;;
        *)
            echo "  ⚠️  Unknown condition type: $TYPE" >&2
            ;;
    esac
done

# Check if any conditions failed
if [ ${#FAILED_CONDITIONS[@]} -gt 0 ]; then
    echo "" >&2
    echo "❌ ${#FAILED_CONDITIONS[@]} completion condition(s) FAILED:" >&2
    for failed in "${FAILED_CONDITIONS[@]}"; do
        echo "  • $failed" >&2
    done
    exit 1
fi

echo "" >&2
echo "✅ All $CONDITION_COUNT completion conditions passed!" >&2
exit 0
