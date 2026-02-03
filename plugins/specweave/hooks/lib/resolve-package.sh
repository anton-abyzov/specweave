#!/bin/bash
#
# Resolve SpecWeave Package Location
#
# Shared library for hooks to find the specweave package installation.
# This is CRITICAL for hooks to work on user machines where PROJECT_ROOT
# doesn't contain dist/src/cli files.
#
# Usage:
#   source "$(dirname "$0")/../lib/resolve-package.sh"
#   # Then use $SPECWEAVE_PKG variable
#
# v1.0.71 - Created to fix hooks hanging on user machines

# =============================================================================
# resolve_specweave_package - Find the specweave npm package location
# =============================================================================
# Searches in this order:
# 1. CLAUDE_PLUGIN_ROOT environment variable (set by Claude Code for plugins)
# 2. Relative to calling script (for hooks inside the package)
# 3. Global npm installation (npm root -g)
# 4. Local npm installation (which specweave)
# =============================================================================

resolve_specweave_package() {
  local caller_dir="${1:-$PWD}"

  # Method 1: CLAUDE_PLUGIN_ROOT (set by Claude Code when running plugin hooks)
  if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]] && [[ -d "${CLAUDE_PLUGIN_ROOT}/dist/src/cli" ]]; then
    echo "$CLAUDE_PLUGIN_ROOT"
    return 0
  fi

  # Method 2: Walk up from caller directory to find package root
  # Handles various depths: hooks/v2/, hooks/lib/, hooks/v2/handlers/, etc.
  local search_dir="$caller_dir"
  local max_depth=6
  local depth=0

  while [[ "$search_dir" != "/" ]] && [[ $depth -lt $max_depth ]]; do
    if [[ -d "$search_dir/dist/src/cli" ]] && [[ -f "$search_dir/package.json" ]]; then
      # Verify it's actually specweave package
      if grep -q '"name": "specweave"' "$search_dir/package.json" 2>/dev/null; then
        echo "$search_dir"
        return 0
      fi
    fi
    search_dir="$(dirname "$search_dir")"
    depth=$((depth + 1))
  done

  # Method 3: Global npm installation
  local npm_root
  npm_root="$(npm root -g 2>/dev/null)"
  if [[ -d "$npm_root/specweave/dist/src/cli" ]]; then
    echo "$npm_root/specweave"
    return 0
  fi

  # Method 4: Find via which specweave
  local specweave_bin
  specweave_bin="$(which specweave 2>/dev/null)"
  if [[ -n "$specweave_bin" ]]; then
    # Handle symlinks (npm link, volta, etc.)
    # Use portable symlink resolution (macOS doesn't have readlink -f)
    local real_bin
    if command -v realpath >/dev/null 2>&1; then
      real_bin="$(realpath "$specweave_bin" 2>/dev/null || echo "$specweave_bin")"
    elif command -v greadlink >/dev/null 2>&1; then
      real_bin="$(greadlink -f "$specweave_bin" 2>/dev/null || echo "$specweave_bin")"
    elif [[ "$(uname)" == "Darwin" ]]; then
      # macOS fallback: resolve symlink chain manually
      real_bin="$specweave_bin"
      while [[ -L "$real_bin" ]]; do
        local link_target
        link_target="$(readlink "$real_bin")"
        if [[ "$link_target" == /* ]]; then
          real_bin="$link_target"
        else
          real_bin="$(dirname "$real_bin")/$link_target"
        fi
      done
      real_bin="$(cd "$(dirname "$real_bin")" && pwd)/$(basename "$real_bin")"
    else
      real_bin="$(readlink -f "$specweave_bin" 2>/dev/null || echo "$specweave_bin")"
    fi
    local bin_dir="$(dirname "$real_bin")"
    local pkg_dir="$(cd "$bin_dir/.." 2>/dev/null && pwd)"
    if [[ -d "$pkg_dir/dist/src/cli" ]]; then
      echo "$pkg_dir"
      return 0
    fi
  fi

  # Not found
  return 1
}

# Auto-resolve when sourced (convenience)
# Only set if not already set (allows override)
if [[ -z "${SPECWEAVE_PKG:-}" ]]; then
  # Get the directory of the script that sourced this
  _RESOLVE_CALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}")" && pwd)"
  SPECWEAVE_PKG="$(resolve_specweave_package "$_RESOLVE_CALLER_DIR")"
  export SPECWEAVE_PKG
fi

# =============================================================================
# find_specweave_script - Find a script file in the specweave package
# =============================================================================
# Usage: find_specweave_script "dist/src/cli/register-session.js"
# Returns: Full path if found, empty string otherwise
# =============================================================================

find_specweave_script() {
  local script_path="$1"

  if [[ -n "$SPECWEAVE_PKG" ]] && [[ -f "$SPECWEAVE_PKG/$script_path" ]]; then
    echo "$SPECWEAVE_PKG/$script_path"
    return 0
  fi

  return 1
}

# =============================================================================
# run_specweave_cli - Run a CLI script from the specweave package
# =============================================================================
# Usage: run_specweave_cli "dist/src/cli/register-session.js" arg1 arg2
# Returns: Exit code from node, or 1 if script not found
# =============================================================================

run_specweave_cli() {
  local script_path="$1"
  shift

  local full_path
  full_path="$(find_specweave_script "$script_path")"

  if [[ -z "$full_path" ]]; then
    echo "ERROR: Script not found: $script_path" >&2
    return 1
  fi

  node "$full_path" "$@"
}
