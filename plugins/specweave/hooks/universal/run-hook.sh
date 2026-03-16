#!/bin/bash
# run-hook.sh - Run a hook script through fail-fast-wrapper
# Usage: run-hook.sh <hook-path> [fallback: allow|approve|continue]
#
# hook-path: relative to $CLAUDE_PLUGIN_ROOT/hooks/ (without .sh)
# fallback:  safe JSON response when wrapper is missing (default: allow)

HOOK_REL="$1"
FALLBACK="${2:-allow}"
ROOT="${CLAUDE_PLUGIN_ROOT}"
WRAPPER="$ROOT/hooks/universal/fail-fast-wrapper.sh"
HOOK="$ROOT/hooks/${HOOK_REL}.sh"

[[ -x "$WRAPPER" ]] && exec "$WRAPPER" "$HOOK"
cat >/dev/null
case "$FALLBACK" in
  approve)  printf '{"decision":"approve"}' ;;
  continue) printf '{"continue":true}' ;;
  *)        printf '{"decision":"allow"}' ;;
esac
