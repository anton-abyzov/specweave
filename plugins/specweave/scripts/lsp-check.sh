#!/usr/bin/env bash
#
# LSP Language Server Detection (Background Worker)
#
# Spawned by session-start.sh in background
# Checks if required language servers are installed based on project files
# Writes results to .specweave/state/lsp-check.json for user-prompt-submit to read
#
# v1.0.179 - Initial version

set +e  # CRITICAL: Never use set -e in background workers

PROJECT_ROOT="$1"

if [[ -z "$PROJECT_ROOT" ]] || [[ ! -d "$PROJECT_ROOT/.specweave" ]]; then
  exit 0  # Not a SpecWeave project
fi

STATE_FILE="${PROJECT_ROOT}/.specweave/state/lsp-check.json"
STATE_DIR="${PROJECT_ROOT}/.specweave/state"

mkdir -p "$STATE_DIR"

# Fast file extension detection using find with depth limit and early exit
has_extension() {
  local ext="$1"
  find "$PROJECT_ROOT" -maxdepth 4 -name "*.$ext" -print -quit 2>/dev/null | grep -q .
}

# Check if a command exists
has_command() {
  command -v "$1" >/dev/null 2>&1
}

# Language server check results
MISSING_SERVERS=()

# TypeScript/JavaScript
if has_extension "ts" || has_extension "tsx" || has_extension "js" || has_extension "jsx"; then
  if ! has_command "typescript-language-server"; then
    MISSING_SERVERS+=("TypeScript|npm install -g typescript-language-server typescript")
  fi
fi

# Python
if has_extension "py"; then
  if ! has_command "pyright-langserver" && ! has_command "pylsp"; then
    MISSING_SERVERS+=("Python|pip install pyright")
  fi
fi

# C#
if has_extension "cs"; then
  if ! has_command "csharp-ls" && ! has_command "omnisharp"; then
    MISSING_SERVERS+=("C#|dotnet tool install -g csharp-ls")
  fi
fi

# Go
if has_extension "go"; then
  if ! has_command "gopls"; then
    MISSING_SERVERS+=("Go|go install golang.org/x/tools/gopls@latest")
  fi
fi

# Rust
if has_extension "rs"; then
  if ! has_command "rust-analyzer"; then
    MISSING_SERVERS+=("Rust|rustup component add rust-analyzer")
  fi
fi

# Java
if has_extension "java"; then
  if ! has_command "jdtls"; then
    MISSING_SERVERS+=("Java|brew install jdtls (requires JDK 17+)")
  fi
fi

# PHP
if has_extension "php"; then
  if ! has_command "intelephense"; then
    MISSING_SERVERS+=("PHP|npm install -g intelephense")
  fi
fi

# Ruby
if has_extension "rb"; then
  if ! has_command "solargraph"; then
    MISSING_SERVERS+=("Ruby|gem install solargraph")
  fi
fi

# Write results to state file
if [[ ${#MISSING_SERVERS[@]} -eq 0 ]]; then
  # All language servers installed
  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "ok",
  "missing": [],
  "warned": false
}
EOF
else
  # Some language servers missing - build JSON array
  MISSING_JSON=""
  for server in "${MISSING_SERVERS[@]}"; do
    LANG="${server%%|*}"
    CMD="${server##*|}"
    if [[ -n "$MISSING_JSON" ]]; then
      MISSING_JSON="$MISSING_JSON,"
    fi
    MISSING_JSON="$MISSING_JSON{\"language\":\"$LANG\",\"install\":\"$CMD\"}"
  done

  cat > "$STATE_FILE" <<EOF
{
  "checked": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "missing",
  "missing": [$MISSING_JSON],
  "warned": false
}
EOF
fi

exit 0
