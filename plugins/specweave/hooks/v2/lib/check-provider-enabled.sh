#!/bin/bash
# check-provider-enabled.sh - Shared provider config detection for SpecWeave hooks
#
# Supports ALL 3 config formats:
#   1. PROFILES: sync.profiles.*.provider == "github" + canUpdateExternalItems
#   2. LEGACY DIRECT: sync.github.enabled == true
#   3. LEGACY PROVIDER: sync.provider == "github" + sync.enabled == true
#
# Usage:
#   source "path/to/check-provider-enabled.sh"
#   if check_provider_enabled "$CONFIG_PATH" "github"; then
#     echo "GitHub enabled"
#   fi
#
# Returns: 0 = enabled, 1 = disabled
# Reference: github-sync-handler.sh:72-107 (canonical implementation)

check_provider_enabled() {
  local config_file="$1"
  local provider="$2"

  [[ ! -f "$config_file" ]] && return 1

  # Method 1: PROFILES format (sync.profiles with provider field)
  if grep -q '"profiles"[[:space:]]*:' "$config_file" 2>/dev/null; then
    if grep -q "\"provider\"[[:space:]]*:[[:space:]]*\"$provider\"" "$config_file" 2>/dev/null; then
      # Also check canUpdateExternalItems (required for sync)
      if grep -q '"canUpdateExternalItems"[[:space:]]*:[[:space:]]*true' "$config_file" 2>/dev/null; then
        return 0
      fi
    fi
  fi

  # Method 2: LEGACY DIRECT (sync.{provider}.enabled: true)
  if grep -q "\"$provider\"[[:space:]]*:" "$config_file" 2>/dev/null; then
    if grep -A5 "\"$provider\"[[:space:]]*:" "$config_file" 2>/dev/null | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
      return 0
    fi
  fi

  # Method 3: LEGACY PROVIDER (sync.provider: "provider" + sync.enabled: true)
  # Only check if no profiles section (pure legacy config)
  if ! grep -q '"profiles"[[:space:]]*:' "$config_file" 2>/dev/null; then
    if grep -q "\"provider\"[[:space:]]*:[[:space:]]*\"$provider\"" "$config_file" 2>/dev/null; then
      if grep -q '"sync"' "$config_file" && grep -A2 '"sync"' "$config_file" | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
        return 0
      fi
    fi
  fi

  return 1
}
