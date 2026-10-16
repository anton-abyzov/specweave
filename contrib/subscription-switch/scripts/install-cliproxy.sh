#!/bin/bash
# Install CLIProxyAPI as a loopback-only background service on this machine.
# macOS: launchd agent com.specweave.cliproxy. Linux: systemd user unit specweave-cliproxy.
#
#   install-cliproxy.sh                      download the pinned official release, verify its checksum
#   install-cliproxy.sh --from-dir DIR       reuse DIR/bin/cli-proxy-api (+ DIR/static/management.html)
#   install-cliproxy.sh --version 8.0.26     pick another official release
#   install-cliproxy.sh --no-service         install files only; start nothing
#   install-cliproxy.sh --if-missing         exit 0 without changes when already installed and answering
#
# Fresh client and management keys are generated per machine and never copied.
# An existing install is left alone unless --force is given; its auth folder is never touched.
set -euo pipefail

version=8.0.17
from_dir=""
force=0
service=1
if_missing=0
while [ $# -gt 0 ]; do
  case "$1" in
    --version) version="${2:?}"; shift 2;;
    --from-dir) from_dir="${2:?}"; shift 2;;
    --force) force=1; shift;;
    --no-service) service=0; shift;;
    --if-missing) if_missing=1; shift;;
    -h|--help) sed -n '2,13p' "$0"; exit 0;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
done
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Version must look like 8.0.17' >&2; exit 2; }

os="$(uname -s)"; arch="$(uname -m)"
case "$os" in Darwin) os=darwin;; Linux) os=linux;; *) echo "Unsupported OS: $os" >&2; exit 2;; esac
case "$arch" in arm64|aarch64) arch=aarch64;; x86_64|amd64) arch=amd64;; *) echo "Unsupported CPU: $arch" >&2; exit 2;; esac

root="$HOME/.local/share/specweave/proxy"
port=8317
# Rerun-safe path for bootstrap scripts: an install that answers its own key is left
# exactly as it is (binary, keys, config, service and auth folder).
if [ "$if_missing" = 1 ] && [ "$force" != 1 ] && [ -e "$root/config.yaml" ]; then
  installed_port="$(awk '$1 == "port:" { print $2; exit }' "$root/config.yaml")"
  [[ "$installed_port" =~ ^[0-9]+$ ]] || { echo "CLIProxyAPI config at $root has no port; review it or rerun with --force." >&2; exit 3; }
  [ -s "$root/secrets/client-key.txt" ] || { echo "CLIProxyAPI at $root has no client key; review it or rerun with --force." >&2; exit 3; }
  code=000
  for _ in 1 2 3 4 5; do
    # The header goes through a file descriptor, so the key never shows in curl's argv (ps, /proc/*/cmdline).
    code="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' -H @<(printf 'Authorization: Bearer %s\n' "$(cat "$root/secrets/client-key.txt")") "http://127.0.0.1:$installed_port/v1/models" || true)"
    [ "$code" = 200 ] && break
    sleep 1
  done
  [ "$code" = 200 ] || { echo "CLIProxyAPI is installed at $root but does not answer on 127.0.0.1:$installed_port (HTTP $code); check $root/logs, or rerun with --force." >&2; exit 3; }
  echo "CLIProxyAPI is already installed and running on 127.0.0.1:$installed_port; left as is. Accounts: $(find "$root/auth" -name '*.json' 2>/dev/null | wc -l | tr -d ' ')."
  exit 0
fi
if [ -e "$root/config.yaml" ] && [ "$force" != 1 ]; then
  echo "CLIProxyAPI is already installed at $root; rerun with --force to replace the binary and service (auth is kept)." >&2
  exit 3
fi
if [ "$service" = 1 ] && [ "$force" != 1 ] && (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
  echo "Port $port is already in use on this machine; stop that listener or rerun with --force." >&2
  exit 3
fi
umask 077
mkdir -p "$root"/{bin,auth,logs,secrets,static} "$HOME/.local/bin"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

if [ -n "$from_dir" ]; then
  [ -x "$from_dir/bin/cli-proxy-api" ] || { echo "No executable at $from_dir/bin/cli-proxy-api" >&2; exit 2; }
  cp "$from_dir/bin/cli-proxy-api" "$work/cli-proxy-api"
  [ -f "$from_dir/static/management.html" ] && cp "$from_dir/static/management.html" "$work/management.html"
else
  asset="CLIProxyAPI_${version}_${os}_${arch}.tar.gz"
  base="https://github.com/router-for-me/CLIProxyAPI/releases/download/v${version}"
  curl -fsSL --proto '=https' -o "$work/$asset" "$base/$asset"
  curl -fsSL --proto '=https' -o "$work/checksums.txt" "$base/checksums.txt"
  expected="$(awk -v f="$asset" '$2 == f || $2 == "*" f { print $1 }' "$work/checksums.txt")"
  if command -v sha256sum >/dev/null; then actual="$(sha256sum "$work/$asset" | awk '{print $1}')"; else actual="$(shasum -a 256 "$work/$asset" | awk '{print $1}')"; fi
  [ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo "Checksum mismatch for $asset; nothing installed." >&2; exit 4; }
  tar -xzf "$work/$asset" -C "$work"
  found="$(find "$work" -type f \( -name cli-proxy-api -o -name CLIProxyAPI \) -perm -u+x -print -quit)"
  [ -n "$found" ] || { echo "Release archive has no cli-proxy-api binary" >&2; exit 4; }
  [ "$found" = "$work/cli-proxy-api" ] || mv "$found" "$work/cli-proxy-api"
fi
"$work/cli-proxy-api" -h >"$work/help.txt" 2>&1 || true
grep -q '^CLIProxyAPI Version' "$work/help.txt" || { echo 'Binary did not identify itself as CLIProxyAPI' >&2; exit 4; }
install -m 0755 "$work/cli-proxy-api" "$root/bin/cli-proxy-api"
[ -f "$work/management.html" ] && install -m 0644 "$work/management.html" "$root/static/management.html"
if [ "$os" = darwin ]; then xattr -d com.apple.quarantine "$root/bin/cli-proxy-api" 2>/dev/null || true; fi

key() { head -c 64 /dev/urandom | base64 | LC_ALL=C tr -dc 'A-Za-z0-9' | cut -c1-48; }
if [ ! -s "$root/secrets/client-key.txt" ]; then key >"$root/secrets/client-key.txt"; fi
if [ ! -s "$root/secrets/management-key.txt" ]; then key >"$root/secrets/management-key.txt"; fi
client_key="$(cat "$root/secrets/client-key.txt")"
management_key="$(cat "$root/secrets/management-key.txt")"
printf 'OPENAI_BASE_URL=http://127.0.0.1:%s/v1\nOPENAI_API_KEY=%s\n' "$port" "$client_key" >"$root/secrets/client.env"

# Same settings as the existing fleet hubs: loopback only, no LAN discovery, no
# remote management, session affinity, bounded retries. CLIProxyAPI hashes the
# management key in place on first start.
cat >"$root/config.yaml" <<EOF
config-version: 8
server:
  host: "127.0.0.1"
  port: $port
  trusted-proxies: []
  commercial-mode: true
  discovery:
    enabled: false
management:
  allow-remote: false
  secret-key: "$management_key"
  disable-control-panel: false
  disable-auto-update-panel: true
  panel-github-repository: "https://github.com/router-for-me/Cli-Proxy-API-Management-Center"
access:
  api-keys:
    - "$client_key"
routing:
  strategy: "round-robin"
  session-affinity: true
  session-affinity-ttl: "1h"
  session-affinity-subagents: true
  retry:
    request-retry: 1
    max-retry-credentials: 2
    max-retry-interval: 5
  cooldown:
    disable-cooling: false
    save-cooldown-status: false
requests:
  passthrough-headers: false
upstream:
  codex:
    disable-codex-cloaking: true
    response-steering: false
  claude:
    disable-claude-cloak-mode: true
    disable-cloaking-model-list: true
oauth:
  auth-dir: "$root/auth"
  auth-auto-refresh-workers: 2
observability:
  logs:
    debug: false
    logging-to-file: false
    request-log: false
    logs-max-total-size-mb: 20
    error-logs-max-files: 1
  usage:
    usage-statistics-enabled: true
EOF
chmod 600 "$root/config.yaml"
printf '#!/bin/sh\nexec %q -config %q "$@"\n' "$root/bin/cli-proxy-api" "$root/config.yaml" >"$HOME/.local/bin/specweave-cliproxy"
chmod 755 "$HOME/.local/bin/specweave-cliproxy"

if [ "$service" = 0 ]; then
  head -1 "$work/help.txt"
  echo "Installed files in $root; no service started."
  exit 0
fi
if [ "$os" = darwin ]; then
  agent="$HOME/Library/LaunchAgents/com.specweave.cliproxy.plist"
  mkdir -p "$(dirname "$agent")"
  cat >"$agent" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>KeepAlive</key>
	<true/>
	<key>Label</key>
	<string>com.specweave.cliproxy</string>
	<key>ProgramArguments</key>
	<array>
		<string>$root/bin/cli-proxy-api</string>
		<string>-config</string>
		<string>$root/config.yaml</string>
		<string>-local-model</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardErrorPath</key>
	<string>$root/logs/service.stderr.log</string>
	<key>StandardOutPath</key>
	<string>$root/logs/service.stdout.log</string>
	<key>ThrottleInterval</key>
	<integer>30</integer>
	<key>WorkingDirectory</key>
	<string>$root</string>
</dict>
</plist>
EOF
  chmod 644 "$agent"
  domain="gui/$(id -u)"
  launchctl print "$domain" >/dev/null 2>&1 || domain="user/$(id -u)"
  launchctl bootout "$domain/com.specweave.cliproxy" 2>/dev/null || true
  launchctl bootstrap "$domain" "$agent"
else
  unit="$HOME/.config/systemd/user/specweave-cliproxy.service"
  mkdir -p "$(dirname "$unit")"
  cat >"$unit" <<EOF
[Unit]
Description=CLIProxyAPI (loopback only)
After=network-online.target

[Service]
WorkingDirectory=$root
ExecStart=$root/bin/cli-proxy-api -config $root/config.yaml -local-model
Restart=always
RestartSec=30
StandardOutput=append:$root/logs/service.stdout.log
StandardError=append:$root/logs/service.stderr.log

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable specweave-cliproxy.service
  # restart, not start: a --force reinstall must load the new binary and config.
  systemctl --user restart specweave-cliproxy.service
  # Keep the user service running after logout on a headless server.
  loginctl enable-linger "$(id -un)" 2>/dev/null || echo 'Run "sudo loginctl enable-linger $USER" so the proxy survives logout.' >&2
fi

for _ in $(seq 1 20); do
  code="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' -H @<(printf 'Authorization: Bearer %s\n' "$client_key") "http://127.0.0.1:$port/v1/models" || true)"
  [ "$code" = 200 ] && break
  sleep 1
done
[ "$code" = 200 ] || { echo "CLIProxyAPI did not answer on 127.0.0.1:$port (last HTTP $code); see $root/logs" >&2; exit 5; }
unauth="$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/v1/models" || true)"
head -1 "$work/help.txt"
echo "CLIProxyAPI is running on 127.0.0.1:$port (keyed request 200, unkeyed $unauth). Accounts: $(find "$root/auth" -name '*.json' | wc -l | tr -d ' ')."
echo "Keys: $root/secrets (client.env holds OPENAI_BASE_URL and OPENAI_API_KEY for API clients)."
