#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  SpecWeave Plugin Health Check (Quick)                                    ║
# ║  Silently checks plugin health and auto-repairs if possible              ║
# ║  Exit codes: 0 = healthy, 1 = unhealthy (with auto-fix attempted)        ║
# ╚══════════════════════════════════════════════════════════════════════════╝

PLUGINS_DIR="$HOME/.claude/plugins"
SPECWEAVE_DIR="$PLUGINS_DIR/marketplaces/specweave"
PLUGINS_SUBDIR="$SPECWEAVE_DIR/plugins"
AUTO_FIX="${1:-false}"  # Pass "true" to auto-fix

# Quick health checks
ERRORS=0
WARNINGS=0

# Check 1: Marketplace exists
if [ ! -d "$SPECWEAVE_DIR" ]; then
    echo "❌ SpecWeave marketplace not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Plugins folder exists and has content
if [ -d "$SPECWEAVE_DIR" ]; then
    if [ ! -d "$PLUGINS_SUBDIR" ]; then
        echo "❌ plugins/ folder missing from marketplace"
        ERRORS=$((ERRORS + 1))
    elif [ -z "$(ls -A "$PLUGINS_SUBDIR" 2>/dev/null)" ]; then
        echo "❌ plugins/ folder is empty"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check 3: iCloud offloaded files
if find "$PLUGINS_DIR" -name "*.icloud" 2>/dev/null | grep -q .; then
    echo "⚠️  Found .icloud offloaded files - iCloud sync issue"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 4: specweave plugin specifically
if [ ! -d "$PLUGINS_SUBDIR/specweave" ]; then
    echo "❌ Core specweave plugin missing"
    ERRORS=$((ERRORS + 1))
fi

# Result
if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "Health check: UNHEALTHY ($ERRORS errors, $WARNINGS warnings)"

    if [ "$AUTO_FIX" = "true" ]; then
        echo ""
        echo "🔧 Attempting auto-fix..."

        # Remove stale marketplace
        if command -v claude &> /dev/null; then
            claude plugin marketplace remove specweave 2>/dev/null || true
            rm -rf "$PLUGINS_DIR/cache/specweave" 2>/dev/null || true

            # Reinstall
            if claude plugin marketplace add https://github.com/anton-abyzov/specweave 2>&1; then
                echo "✓ Marketplace reinstalled"

                # Install core plugins
                for plugin in sw sw-github sw-jira sw-ado sw-infra sw-testing; do
                    claude plugin install "$plugin" 2>/dev/null && echo "  ✓ $plugin"
                done

                echo ""
                echo "⚡ Restart Claude Code for changes to take effect"
            else
                echo "✗ Failed to reinstall marketplace"
            fi
        else
            echo "✗ Claude CLI not found - cannot auto-fix"
        fi
    else
        echo "Run with 'true' argument to attempt auto-fix"
        echo "Or run: bash scripts/diagnose-plugins.sh for full diagnosis"
    fi

    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "Health check: OK with $WARNINGS warnings"
    exit 0
else
    echo "✓ Plugin health: OK"
    exit 0
fi
