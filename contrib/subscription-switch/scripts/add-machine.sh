#!/bin/bash
# Run on the main Mac. Connects a macOS or Linux machine to the Switch fleet in one go:
#
#   add-machine.sh ID "Label" USER@HOST SLOT [--expect-host NAME] [--pin SHA256:...] [--no-proxy] [--dry-run]
#   e.g. add-machine.sh linux1 "Linux server" anton@HOST 3 --expect-host srv1 --pin SHA256:<from the worker>
#
# --expect-host is the worker's macOS LocalHostName or Linux static hostname. It is required
# for a machine this Mac has no tunnel for yet, so a mistyped address cannot add a machine twice.
# 1. Pins the worker's SSH host key in ~/.local/share/specweave/fleet/known_hosts when
#    --pin is given, and only if the scanned key has exactly that fingerprint (read it on
#    the worker: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub). Then checks the fleet
#    key logs in without a prompt.
# 2. Copies this companion to a fresh folder on the worker over that pinned channel.
# 3. Runs scripts/worker-bootstrap.sh there: Codex and Claude CLIs, Switch on 127.0.0.1:8318
#    and CLIProxyAPI on 127.0.0.1:8317 (launchd on macOS, systemd user units on Linux).
# 4. Runs add-peer.sh here: the SSH tunnel to 127.0.0.1:SLOT8318 and the peers.json entry.
# Rerun-safe: whatever already answers on the worker is left as it is.
set -euo pipefail
[ $# -ge 4 ] || { sed -n '2,17p' "$0"; exit 2; }
id="$1"; label="$2"; target="$3"; slot="$4"; shift 4
pin=""; expect_host=""; proxy_flag=""; dry=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pin) pin="${2:?}"; shift 2;;
    --expect-host) expect_host="${2:?}"; shift 2;;
    --no-proxy) proxy_flag=--no-proxy; shift;;
    --dry-run) dry=1; shift;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
done
[[ "$id" =~ ^[a-z0-9-]{1,32}$ && "$id" != local ]] || { echo 'ID must be lowercase letters, digits or dashes' >&2; exit 2; }
[[ "$slot" =~ ^[1-6]$ ]] || { echo 'SLOT must be 1-6' >&2; exit 2; }
[[ "$target" =~ ^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$ ]] || { echo 'Target must be USER@HOST' >&2; exit 2; }
[ -z "$expect_host" ] || [[ "$expect_host" =~ ^[A-Za-z0-9._-]+$ ]] || { echo 'Expected hostname has unexpected characters' >&2; exit 2; }
[ -z "$pin" ] || [[ "$pin" =~ ^SHA256:[A-Za-z0-9+/]{43}$ ]] || { echo 'Fingerprint must look like SHA256:<43 characters>' >&2; exit 2; }
host="${target#*@}"; login_user="${target%@*}"
here="$(cd "$(dirname "$0")/.." && pwd)"
fleet="$HOME/.local/share/specweave/fleet"
state="${SPECWEAVE_SWITCH_STATE:-$HOME/.local/share/specweave/switch}"
agents="$HOME/Library/LaunchAgents"
port="${slot}8318"
ssh_bin="${SPECWEAVE_FLEET_SSH:-/usr/bin/ssh}"   # tests point this at a stand-in

if [ "$dry" = 1 ]; then
  [ -z "$pin" ] || echo "1. Pin $host in $fleet/known_hosts if its ed25519 key is $pin"
  echo "1. Check the fleet key logs in to $target (BatchMode, pinned host key)"
  echo "1. Check $target reports hostname ${expect_host:-(the one its existing tunnel-$id was set up with)} and user $login_user"
  echo "2. Copy $here to a fresh ~/.cache/specweave-switch-src.* folder on $target"
  echo "3. Run scripts/worker-bootstrap.sh $id ${proxy_flag:-(with CLIProxyAPI)} there"
  echo "4. Run scripts/add-peer.sh $id \"$label\" $target $slot (tunnel 127.0.0.1:$port -> $target:8318)"
  exit 0
fi
[ "$(uname -s)" = Darwin ] || { echo 'Run this on the main Mac (it keeps the tunnels in launchd)' >&2; exit 2; }
[ -s "$fleet/id_ed25519" ] || { echo "Fleet key missing: $fleet/id_ed25519" >&2; exit 2; }
# Fail before touching the worker if this slot already shows another machine.
if [ -f "$state/peers.json" ]; then
  owner="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(next((p.get("id","") for p in d.get("peers",[]) if p.get("url")==sys.argv[2] and p.get("id")!=sys.argv[3]),""))' "$state/peers.json" "http://127.0.0.1:$port" "$id")"
  [ -z "$owner" ] || { echo "Slot $slot (port $port) already belongs to $owner; pick another slot." >&2; exit 2; }
fi
# Tunnels this Mac already keeps, as "ID TARGET" lines (the target is the last ssh argument).
tunnels="$(python3 -c '
import glob, os, plistlib, sys
for f in sorted(glob.glob(os.path.join(sys.argv[1], "com.specweave.switch.tunnel-*.plist"))):
    try:
        args = plistlib.load(open(f, "rb")).get("ProgramArguments") or []
    except Exception:
        continue
    if args:
        print(os.path.basename(f)[len("com.specweave.switch.tunnel-"):-len(".plist")], args[-1])
' "$agents")"
known_target="$(awk -v id="$id" '$1 == id { print $2 }' <<<"$tunnels")"
other="$(awk -v id="$id" -v host="$host" '$1 != id { t = $2; sub(/^[^@]*@/, "", t); if (t == host) { print $1; exit } }' <<<"$tunnels")"
[ -z "$other" ] || { echo "$host is already connected as $other; rerun with ID $other, or remove that tunnel first." >&2; exit 2; }
if [ -z "$expect_host" ] && [ "$known_target" != "$target" ]; then
  echo "This Mac has no tunnel-$id to $target yet. Pass --expect-host with the machine's hostname" >&2
  echo "  (macOS: scutil --get LocalHostName; Linux: hostnamectl --static) so the script can confirm it reached that machine." >&2
  exit 2
fi

if [ -n "$pin" ]; then
  scanned="$(ssh-keyscan -T 5 -t ed25519 "$host" 2>/dev/null | grep -v '^#' || true)"
  [ -n "$scanned" ] || { echo "No ed25519 host key from $host; is Remote Login on?" >&2; exit 3; }
  fingerprint="$(printf '%s\n' "$scanned" | ssh-keygen -lf - 2>/dev/null | awk '{print $2}' || true)"
  [ "$fingerprint" = "$pin" ] || { echo "$host offered $fingerprint, not $pin; nothing pinned." >&2; exit 3; }
  pinned="$(ssh-keygen -l -F "$host" -f "$fleet/known_hosts" 2>/dev/null | awk '!/^#/ { print $3 }' || true)"
  if grep -qxF "$pin" <<<"$pinned"; then
    echo "$host is already pinned; kept the existing entry."
  elif [ -n "$pinned" ]; then
    echo "$fleet/known_hosts already holds a different key for $host (a reinstalled machine, or a reused address)." >&2
    echo "  If $pin is right, drop the old entry and rerun: ssh-keygen -R $host -f $fleet/known_hosts" >&2
    exit 3
  else
    printf '%s\n' "$scanned" >>"$fleet/known_hosts"
    echo "Pinned $host ($pin)."
  fi
fi

ssh_opts=(-F /dev/null -i "$fleet/id_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$fleet/known_hosts" -o ConnectTimeout=5 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ControlMaster=no)
remote() { "$ssh_bin" "${ssh_opts[@]}" "$target" "$@"; }
if ! login_err="$(remote true 2>&1 >/dev/null)"; then
  case "$login_err" in
    *"Host key verification failed"*|*"IDENTIFICATION HAS CHANGED"*)
      echo "$host's host key is not pinned in $fleet/known_hosts, or it changed. Rerun with --pin SHA256:..." >&2
      echo "  (read it on the worker: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub)" >&2;;
    *"Permission denied"*)
      echo "$target rejected the fleet key. Authorize it once: ssh-copy-id -i $fleet/id_ed25519.pub $target" >&2;;
    *)
      echo "Cannot reach $target; check it is awake, on the network and has Remote Login on. Nothing was changed." >&2
      [ -z "$login_err" ] || printf '  ssh: %s\n' "$(tail -1 <<<"$login_err")" >&2;;
  esac
  exit 3
fi

probe="$(remote 'uname -s; uname -m; id -un; if [ "$(uname -s)" = Darwin ]; then scutil --get LocalHostName; else hostnamectl --static 2>/dev/null || hostname; fi; if command -v curl >/dev/null; then echo curl; else echo nocurl; fi')"
worker_os="$(sed -n 1p <<<"$probe")"; worker_arch="$(sed -n 2p <<<"$probe")"
worker_user="$(sed -n 3p <<<"$probe")"; worker_host="$(sed -n 4p <<<"$probe")"
case "$worker_os" in Darwin|Linux) ;; *) echo "Unsupported worker OS: $worker_os" >&2; exit 2;; esac
[[ "$worker_user" =~ ^[A-Za-z0-9._-]+$ && "$worker_host" =~ ^[A-Za-z0-9._-]+$ ]] || { echo 'Worker user or hostname has unexpected characters' >&2; exit 2; }
[ "$worker_user" = "$login_user" ] || { echo "$target logged in as $worker_user, not $login_user" >&2; exit 2; }
[ -z "$expect_host" ] || [ "$worker_host" = "$expect_host" ] || { echo "$target is $worker_host, not $expect_host; nothing was changed there." >&2; exit 2; }
[ "$(sed -n 5p <<<"$probe")" = curl ] || { echo "Install curl on $target first" >&2; exit 2; }
echo "Worker $id: $worker_os $worker_arch, user $worker_user, host $worker_host (host key pinned)."

remote_dir="$(remote 'mkdir -p "$HOME/.cache" && mktemp -d "$HOME/.cache/specweave-switch-src.XXXXXX"')"
[[ "$remote_dir" =~ ^/[A-Za-z0-9._/-]+/\.cache/specweave-switch-src\.[A-Za-z0-9]+$ ]] || { echo 'Unexpected staging folder on the worker' >&2; exit 4; }
# Same files install-switch.py bundles; no macOS metadata, so GNU tar on Linux reads it cleanly.
COPYFILE_DISABLE=1 tar -C "$here" --no-xattrs --exclude node_modules --exclude __pycache__ --exclude .DS_Store -cf - . \
  | remote "tar -xf - -C '$remote_dir'"
remote "SPECWEAVE_WORKER_HOST='$worker_host' SPECWEAVE_WORKER_USER='$worker_user' bash '$remote_dir/scripts/worker-bootstrap.sh' '$id' $proxy_flag" \
  || { echo "Bootstrap failed on $target; its copy is kept at $remote_dir for review." >&2; exit 4; }
remote "rm -rf '$remote_dir'"

"$here/scripts/add-peer.sh" "$id" "$label" "$target" "$slot"
# Count the worker's signed-in accounts through the tunnel just made, so a machine that is already set up gets no sign-in chores.
for _ in 1 2 3 4 5 6; do curl -s -o /dev/null --max-time 3 "http://127.0.0.1:${slot}8318/api/state" && break; sleep 2; done
signed_in="$(curl -s --max-time 5 "http://127.0.0.1:${slot}8318/api/state" 2>/dev/null | /usr/bin/python3 -c 'import json,sys
try: print(sum(1 for a in json.load(sys.stdin)["accounts"] if a.get("authenticated") is True))
except Exception: print("")' 2>/dev/null || true)"
if [ -n "$signed_in" ] && [ "$signed_in" -gt 0 ]; then
  echo "$label is connected with $signed_in signed-in account(s). Add more on $target with: ~/.local/bin/specweave-switch account login codex-2"
else
cat <<EOF
$label is connected. Left for you, on $target as $worker_user:
  sign in:   ~/.local/bin/specweave-switch account login codex-1   (then codex-2..4, claude-1)
  no screen: ~/.local/share/specweave/providers/node_modules/.bin/codex login --device-auth
             ~/.local/share/specweave/providers/node_modules/.bin/claude setup-token
  refresh:   ~/.local/bin/specweave-switch refresh
EOF
fi
