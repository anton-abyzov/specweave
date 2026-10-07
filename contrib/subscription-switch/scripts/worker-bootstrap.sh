#!/bin/bash
# Run on an authenticated, identity-verified worker. Keeps native credentials intact.
set -euo pipefail
role="${1:-}"
case "$role" in m1|m3) ;; *) echo 'Usage: worker-bootstrap.sh m1|m3' >&2; exit 2;; esac
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo 'Apple Silicon macOS required' >&2; exit 2; }
command -v node >/dev/null && command -v npm >/dev/null || { echo 'Install Node 22 first' >&2; exit 2; }
[ "$(node -p 'process.versions.node.split(".")[0]')" = 22 ] || { echo 'Node 22 required' >&2; exit 2; }
# Source bundle must be uploaded by the authorized main host; do not fetch unverified code.
source_dir="$(cd "$(dirname "$0")/.." && pwd)"
install_dir="$HOME/.local/share/specweave/subscription-switch"
if [ -e "$install_dir" ] || [ -e "$HOME/.local/bin/specweave-switch" ]; then echo 'Companion destination exists; preserve and review before update' >&2; exit 3; fi
state_dir="$HOME/.local/share/specweave/switch"
provider_dir="$HOME/.local/share/specweave/providers"
mkdir -p "$state_dir" "$provider_dir" "$HOME/.local/bin"
chmod 700 "$state_dir" "$provider_dir"
# Official isolated packages. Do not replace active shared installations.
codex_version="$(npm view @openai/codex version)"
claude_version="$(npm view @anthropic-ai/claude-code version)"
npm install --prefix "$provider_dir" --no-audit --no-fund --ignore-scripts "@openai/codex@$codex_version" "@anthropic-ai/claude-code@$claude_version"
postinstall="$provider_dir/node_modules/@anthropic-ai/claude-code/postinstall.mjs"
if [ -f "$postinstall" ]; then (cd "$(dirname "$postinstall")" && node "$postinstall"); fi
mkdir -p "$install_dir"
cp -R "$source_dir/." "$install_dir/"
cat > "$HOME/.local/bin/specweave-switch" <<EOF
#!/bin/bash
exec node "$install_dir/bin/specweave-switch.mjs" "\$@"
EOF
chmod 755 "$HOME/.local/bin/specweave-switch"
"$HOME/.local/bin/specweave-switch" init
"$HOME/.local/bin/specweave-switch" doctor
printf 'Worker %s bootstrapped as %s on %s. Native sign-ins and pairing must be verified separately.\n' "$role" "$(id -un)" "$(scutil --get LocalHostName)"
