#!/usr/bin/env bash
#
# Skill Activation Validation Runner
#
# Runs domain-specific validation based on which skills/agents were activated
# during the session. Called by stop-auto.sh when skill activations exist.
#
# Exit codes:
#   0 - Validation passed (or no activations to validate)
#   1 - Validation failed
#
# @since v1.0.130
#

set -euo pipefail

# Get project root
PROJECT_ROOT="${SPECWEAVE_PROJECT_ROOT:-$(pwd)}"
ACTIVATIONS_FILE="$PROJECT_ROOT/.specweave/state/skill-activations.json"
LOG_DIR="$PROJECT_ROOT/.specweave/logs"
LOG_FILE="$LOG_DIR/skill-validation.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" | tee -a "$LOG_FILE"
}

# Check if activations file exists
if [ ! -f "$ACTIVATIONS_FILE" ]; then
    log "No skill activations tracked - skipping validation"
    exit 0
fi

# Parse activated domains
DOMAINS=$(jq -r '.domains[]' "$ACTIVATIONS_FILE" 2>/dev/null || echo "")

if [ -z "$DOMAINS" ]; then
    log "No domains activated - skipping validation"
    exit 0
fi

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🔍 SKILL ACTIVATION VALIDATION"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Activated domains: $DOMAINS"

FAILED=0
PASSED=0
SKIPPED=0

# Run validation for each activated domain
for DOMAIN in $DOMAINS; do
    log ""
    log "▶ Validating domain: $DOMAIN"

    case "$DOMAIN" in
        frontend)
            # Frontend: TypeScript check + lint
            if [ -f "$PROJECT_ROOT/package.json" ]; then
                # Check for TypeScript
                if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
                    log "  Running: tsc --noEmit"
                    if npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ TypeScript check passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ TypeScript check failed"
                        ((FAILED++)) || true
                    fi
                fi

                # Check for lint script
                if jq -e '.scripts.lint' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
                    log "  Running: npm run lint"
                    if npm run lint 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Lint passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ Lint failed"
                        ((FAILED++)) || true
                    fi
                fi
            else
                log "  ⏭ No package.json - skipping frontend validation"
                ((SKIPPED++)) || true
            fi
            ;;

        backend)
            # Backend: Unit tests + lint
            if [ -f "$PROJECT_ROOT/package.json" ]; then
                # Run tests
                if jq -e '.scripts.test' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
                    log "  Running: npm test"
                    if npm test 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Tests passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ Tests failed"
                        ((FAILED++)) || true
                    fi
                fi
            elif [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
                # Python backend
                if command -v pytest &> /dev/null; then
                    log "  Running: pytest"
                    if pytest 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Pytest passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ Pytest failed"
                        ((FAILED++)) || true
                    fi
                fi
            else
                log "  ⏭ No package.json or Python project - skipping backend validation"
                ((SKIPPED++)) || true
            fi
            ;;

        mobile)
            # Mobile: Expo doctor or RN check
            if [ -f "$PROJECT_ROOT/package.json" ]; then
                # Check for Expo
                if jq -e '.dependencies.expo' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
                    log "  Running: npx expo doctor"
                    if npx expo doctor 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Expo doctor passed"
                        ((PASSED++)) || true
                    else
                        log "  ⚠️ Expo doctor had warnings (non-blocking)"
                        ((PASSED++)) || true  # Warnings don't fail
                    fi
                # Check for React Native
                elif jq -e '.dependencies["react-native"]' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
                    log "  Running: TypeScript check for React Native"
                    if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
                        if npx tsc --noEmit 2>&1 | tee -a "$LOG_FILE"; then
                            log "  ✅ TypeScript check passed"
                            ((PASSED++)) || true
                        else
                            log "  ❌ TypeScript check failed"
                            ((FAILED++)) || true
                        fi
                    else
                        log "  ⏭ No tsconfig.json - skipping"
                        ((SKIPPED++)) || true
                    fi
                fi
            else
                log "  ⏭ No package.json - skipping mobile validation"
                ((SKIPPED++)) || true
            fi
            ;;

        infrastructure|infra)
            # Infrastructure: Terraform validate
            if [ -f "$PROJECT_ROOT/main.tf" ] || [ -d "$PROJECT_ROOT/terraform" ]; then
                TF_DIR="${PROJECT_ROOT}/terraform"
                [ -f "$PROJECT_ROOT/main.tf" ] && TF_DIR="$PROJECT_ROOT"

                log "  Running: terraform validate"
                if (cd "$TF_DIR" && terraform validate) 2>&1 | tee -a "$LOG_FILE"; then
                    log "  ✅ Terraform validate passed"
                    ((PASSED++)) || true
                else
                    log "  ❌ Terraform validate failed"
                    ((FAILED++)) || true
                fi
            else
                log "  ⏭ No Terraform files - skipping infrastructure validation"
                ((SKIPPED++)) || true
            fi
            ;;

        ml)
            # ML: Pytest
            if [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
                if command -v pytest &> /dev/null; then
                    log "  Running: pytest"
                    if pytest 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Pytest passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ Pytest failed"
                        ((FAILED++)) || true
                    fi
                else
                    log "  ⏭ pytest not installed - skipping"
                    ((SKIPPED++)) || true
                fi
            else
                log "  ⏭ No Python project - skipping ML validation"
                ((SKIPPED++)) || true
            fi
            ;;

        testing)
            # Testing domain: Run all available test suites
            if [ -f "$PROJECT_ROOT/package.json" ]; then
                # Unit tests
                if jq -e '.scripts.test' "$PROJECT_ROOT/package.json" > /dev/null 2>&1; then
                    log "  Running: npm test"
                    if npm test 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ Unit tests passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ Unit tests failed"
                        ((FAILED++)) || true
                    fi
                fi

                # E2E tests (Playwright)
                if [ -f "$PROJECT_ROOT/playwright.config.ts" ] || [ -f "$PROJECT_ROOT/playwright.config.js" ]; then
                    log "  Running: npx playwright test"
                    if npx playwright test 2>&1 | tee -a "$LOG_FILE"; then
                        log "  ✅ E2E tests passed"
                        ((PASSED++)) || true
                    else
                        log "  ❌ E2E tests failed"
                        ((FAILED++)) || true
                    fi
                fi
            else
                log "  ⏭ No package.json - skipping testing validation"
                ((SKIPPED++)) || true
            fi
            ;;

        *)
            log "  ⏭ Unknown domain: $DOMAIN - skipping"
            ((SKIPPED++)) || true
            ;;
    esac
done

log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📊 VALIDATION SUMMARY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  ✅ Passed:  $PASSED"
log "  ❌ Failed:  $FAILED"
log "  ⏭ Skipped: $SKIPPED"
log ""

if [ "$FAILED" -gt 0 ]; then
    log "❌ SKILL VALIDATION FAILED"
    log "   Fix the issues above before completing auto mode."
    exit 1
else
    log "✅ SKILL VALIDATION PASSED"

    # Clean up activations file after successful validation
    rm -f "$ACTIVATIONS_FILE"
    exit 0
fi
