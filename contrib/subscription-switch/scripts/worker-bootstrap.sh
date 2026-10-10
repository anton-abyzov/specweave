#!/bin/bash
# Run on an authenticated, identity-verified worker. Keeps native credentials intact.
set -euo pipefail
role="${1:-}"
case "$role" in m1|m3) ;; *) echo 'Usage: worker-bootstrap.sh m1|m3' >&2; exit 2;; esac
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo 'Apple Silicon macOS required' >&2; exit 2; }
expected_host='Antons-MacBook-Pro'
expected_user='antonabyzov'
if [ "$role" = m1 ]; then expected_host='Antons-MacBook-Pro-M1MAX-2'; expected_user='anton'; fi
[ "$(scutil --get LocalHostName)" = "$expected_host" ] && [ "$(id -un)" = "$expected_user" ] || { echo 'Worker identity does not match its verified native user; preserve this host' >&2; exit 2; }
command -v node >/dev/null && command -v npm >/dev/null || { echo 'Install Node 22 first' >&2; exit 2; }
[ "$(node -p 'process.versions.node.split(".")[0]')" = 22 ] || { echo 'Node 22 required' >&2; exit 2; }
node_binary="$(command -v node)"
# Source bundle must be uploaded by the authorized main host; do not fetch unverified code.
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
install_dir="$HOME/.local/share/specweave/subscription-switch"
if [ -e "$install_dir" ] || [ -e "$HOME/.local/bin/specweave-switch" ]; then echo 'Companion destination exists; preserve and review before update' >&2; exit 3; fi
state_dir="$HOME/.local/share/specweave/switch"
provider_dir="$HOME/.local/share/specweave/providers"
mkdir -p "$state_dir" "$provider_dir" "$HOME/.local/bin"
chmod 700 "$state_dir" "$provider_dir"
# Official isolated packages. Do not replace active shared installations.
export NPM_CONFIG_USERCONFIG=/dev/null
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
export NPM_CONFIG_CACHE="$provider_dir/npm-cache"
codex_version="$(npm view @openai/codex version)"
claude_version="$(npm view @anthropic-ai/claude-code version)"
npm install --prefix "$provider_dir" --no-audit --no-fund --ignore-scripts "@openai/codex@$codex_version" "@anthropic-ai/claude-code@$claude_version"
claude_package="$provider_dir/node_modules/@anthropic-ai/claude-code"
if [ -f "$claude_package/install.cjs" ]; then
  (cd "$claude_package" && node install.cjs)
elif [ -f "$claude_package/postinstall.mjs" ]; then
  (cd "$claude_package" && node postinstall.mjs)
else
  echo 'Official Claude installer changed; preserve package and review before continuing' >&2; exit 3
fi
"$provider_dir/node_modules/.bin/codex" --version
"$provider_dir/node_modules/.bin/claude" --version
# Use the same immutable bundle, receipt and launchd identity checks as local
# installs. Future reviewed updates use install-switch.py --service --update.
/usr/bin/python3 "$source_dir/scripts/install-switch.py" --node "$node_binary" --service
"$HOME/.local/bin/specweave-switch" doctor
printf 'Worker %s bootstrapped as %s on %s. Native sign-ins and pairing must be verified separately.\n' "$role" "$(id -un)" "$(scutil --get LocalHostName)"
