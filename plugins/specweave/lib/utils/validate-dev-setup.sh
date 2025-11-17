#!/bin/bash
# Lightweight Developer Setup Validator for Hooks
#
# This script is sourced by hooks to validate that the marketplace symlink
# is correctly configured for local development, preventing hook errors.
#
# Usage in hooks:
#   source "$(dirname "$0")/../lib/utils/validate-dev-setup.sh"
#   validate_marketplace_setup_quiet || exit 0  # Skip hook if setup invalid

# Global variables set by validation
MARKETPLACE_SETUP_VALID=0
MARKETPLACE_SETUP_ERROR=""

# Validate marketplace setup (quiet mode - for hooks)
# Returns: 0 if valid, 1 if invalid
# Sets: MARKETPLACE_SETUP_VALID, MARKETPLACE_SETUP_ERROR
validate_marketplace_setup_quiet() {
  # Only validate in development mode
  if [[ ! -f "$(git rev-parse --show-toplevel 2>/dev/null)/package.json" ]]; then
    MARKETPLACE_SETUP_VALID=1
    return 0  # Not in a repo, assume valid
  fi

  # Check if we're in the SpecWeave repository
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    MARKETPLACE_SETUP_VALID=1
    return 0  # Not in git repo, assume valid
  }

  if [[ ! -f "$repo_root/package.json" ]]; then
    MARKETPLACE_SETUP_VALID=1
    return 0
  fi

  # Check if this is the SpecWeave repository
  if ! grep -q '"name": "specweave"' "$repo_root/package.json" 2>/dev/null; then
    MARKETPLACE_SETUP_VALID=1
    return 0  # Not SpecWeave repo, assume valid (user project)
  fi

  # This IS the SpecWeave repository - validate marketplace setup
  local marketplace_path="$HOME/.claude/plugins/marketplaces/specweave"

  # Check if marketplace exists
  if [[ ! -e "$marketplace_path" ]]; then
    MARKETPLACE_SETUP_VALID=0
    MARKETPLACE_SETUP_ERROR="Marketplace directory does not exist"
    return 1
  fi

  # Check if it's a symlink
  if [[ ! -L "$marketplace_path" ]]; then
    MARKETPLACE_SETUP_VALID=0
    MARKETPLACE_SETUP_ERROR="Marketplace is a regular directory, not a symlink"
    return 1
  fi

  # Check if symlink points to this repository
  local symlink_target
  symlink_target="$(readlink "$marketplace_path")"

  if [[ "$symlink_target" != "$repo_root" ]]; then
    # Try resolving to absolute path in case symlink is relative
    local resolved_target
    resolved_target="$(cd "$(dirname "$marketplace_path")" && cd "$symlink_target" && pwd)" || {
      MARKETPLACE_SETUP_VALID=0
      MARKETPLACE_SETUP_ERROR="Symlink target cannot be resolved"
      return 1
    }

    if [[ "$resolved_target" != "$repo_root" ]]; then
      MARKETPLACE_SETUP_VALID=0
      MARKETPLACE_SETUP_ERROR="Symlink points to wrong repository"
      return 1
    fi
  fi

  # All checks passed
  MARKETPLACE_SETUP_VALID=1
  return 0
}

# Validate marketplace setup (verbose mode - for scripts)
# Prints detailed error messages
# Returns: 0 if valid, 1 if invalid
validate_marketplace_setup_verbose() {
  if validate_marketplace_setup_quiet; then
    return 0
  fi

  # Print error
  echo "❌ Invalid marketplace setup: $MARKETPLACE_SETUP_ERROR" >&2
  echo "" >&2
  echo "Fix by running:" >&2
  echo "  ./scripts/setup-dev-plugins.sh" >&2
  echo "" >&2
  echo "Or manually:" >&2
  echo "  rm -rf ~/.claude/plugins/marketplaces/specweave" >&2
  echo "  ln -s \$(pwd) ~/.claude/plugins/marketplaces/specweave" >&2
  echo "" >&2

  return 1
}

# Quick check for hooks - returns true if running in user project
is_user_project() {
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || return 0

  if [[ ! -f "$repo_root/package.json" ]]; then
    return 0  # No package.json, assume user project
  fi

  # Check if this is NOT the SpecWeave repository
  if ! grep -q '"name": "specweave"' "$repo_root/package.json" 2>/dev/null; then
    return 0  # User project
  fi

  return 1  # SpecWeave repository
}

# Print warning about marketplace setup (for hooks)
warn_marketplace_setup() {
  if [[ "${SPECWEAVE_SUPPRESS_WARNINGS:-}" == "true" ]]; then
    return 0
  fi

  echo "⚠️  Warning: Marketplace setup issue detected" >&2
  echo "   Run: ./scripts/validate-local-dev-setup.sh" >&2
  echo "" >&2
}
