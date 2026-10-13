#!/bin/bash
# Run on an authenticated, identity-verified worker. Keeps native credentials intact.
#
#   worker-bootstrap.sh ID [--no-proxy]      e.g. worker-bootstrap.sh m1, worker-bootstrap.sh linux1
#
# Installs the Codex and Claude CLIs in an isolated prefix, Switch as a loopback
# service on 8318 (launchd on macOS, systemd user unit on Linux) and CLIProxyAPI
# on 8317 (skip with --no-proxy). Rerun-safe: a Switch or CLIProxyAPI that is
# already installed and answering is left as it is.
set -euo pipefail
role="${1:-}"
[[ "$role" =~ ^[a-z0-9-]{1,32}$ && "$role" != local ]] || { echo 'Usage: worker-bootstrap.sh ID [--no-proxy]   (ID: lowercase letters, digits, dashes)' >&2; exit 2; }
proxy=1
case "${2:-}" in '') ;; --no-proxy) proxy=0;; *) echo "Unknown option: $2" >&2; exit 2;; esac
os="$(uname -s)"; arch="$(uname -m)"
case "$os/$arch" in
  Darwin/arm64) hostname_now() { scutil --get LocalHostName; };;
  Linux/x86_64|Linux/aarch64) hostname_now() { hostnamectl --static 2>/dev/null || hostname; };;
  *) echo 'Apple Silicon macOS or x86_64/aarch64 Linux required' >&2; exit 2;;
esac
# The verified identity comes from the operator, never from the public source tree.
expected_host="${SPECWEAVE_WORKER_HOST:-}"
expected_user="${SPECWEAVE_WORKER_USER:-}"
[ -n "$expected_host" ] && [ -n "$expected_user" ] || { echo 'Set SPECWEAVE_WORKER_HOST (macOS LocalHostName, Linux static hostname) and SPECWEAVE_WORKER_USER for this worker' >&2; exit 2; }
[ "$(hostname_now)" = "$expected_host" ] && [ "$(id -un)" = "$expected_user" ] || { echo 'Worker identity does not match its verified native user; preserve this host' >&2; exit 2; }
# Non-interactive SSH shells do not read profile files, so look in the fleet's Node location too.
for candidate in "${SPECWEAVE_NODE:-}" "$HOME/.local/share/specweave/node22/bin/node"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then PATH="$(dirname "$candidate"):$PATH"; break; fi
done
export PATH
command -v node >/dev/null && command -v npm >/dev/null || { echo 'Install Node 22 first (or set SPECWEAVE_NODE)' >&2; exit 2; }
[ "$(node -p 'process.versions.node.split(".")[0]')" = 22 ] || { echo 'Node 22 required' >&2; exit 2; }
command -v curl >/dev/null || { echo 'curl is required' >&2; exit 2; }
[ -x /usr/bin/python3 ] || { echo '/usr/bin/python3 is required' >&2; exit 2; }
node_binary="$(command -v node)"
# Source bundle must be uploaded by the authorized main host; do not fetch unverified code.
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
install_dir="$HOME/.local/share/specweave/subscription-switch"
switch_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8318/api/state || true; }
if [ -e "$install_dir" ] || [ -e "$HOME/.local/bin/specweave-switch" ]; then
  [ "$(switch_code)" = 200 ] || { echo 'Companion destination exists but Switch is not answering on 127.0.0.1:8318; preserve and review before update' >&2; exit 3; }
  echo 'Switch is already installed and answering on 127.0.0.1:8318; left as is (update with install-switch.py --update --service).'
else
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
  # Use the same immutable bundle, receipt and service identity checks as local
  # installs. Future reviewed updates use install-switch.py --service --update.
  /usr/bin/python3 "$source_dir/scripts/install-switch.py" --node "$node_binary" --service
  "$HOME/.local/bin/specweave-switch" doctor
  code=000
  for _ in $(seq 1 10); do code="$(switch_code)"; [ "$code" = 200 ] && break; sleep 1; done
  [ "$code" = 200 ] || { echo "Switch service did not answer on 127.0.0.1:8318 (HTTP $code)" >&2; exit 4; }
fi
if [ "$proxy" = 1 ]; then
  # Fresh per-machine keys; an install that already answers is left alone and its auth folder is never touched.
  bash "$source_dir/scripts/install-cliproxy.sh" --if-missing
fi
printf 'Worker %s bootstrapped as %s on %s. Native sign-ins and pairing must be verified separately.\n' "$role" "$(id -un)" "$(hostname_now)"
