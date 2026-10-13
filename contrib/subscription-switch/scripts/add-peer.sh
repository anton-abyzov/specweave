#!/bin/bash
# Run on the main Mac. Shows another machine's Switch on this Mac's dashboard
# through a pinned SSH tunnel kept alive by launchd.
#
#   add-peer.sh ID "Label" USER@HOST SLOT      e.g. add-peer.sh m1 "M1 Max" anton@192.168.40.134 1
#
# SLOT 1-6 picks local port SLOT8318 (M1 = 1, M3 = 2, next machine = 3, ...).
# Uses the fleet key and host pins in ~/.local/share/specweave/fleet; the remote
# host key must already be pinned there. The remote machine needs Switch running
# on its own 127.0.0.1:8318 (worker-bootstrap.sh, or install-switch.py --service).
set -euo pipefail
[ $# -eq 4 ] || { sed -n '2,11p' "$0"; exit 2; }
id="$1"; label="$2"; target="$3"; slot="$4"
[[ "$id" =~ ^[a-z0-9-]{1,32}$ && "$id" != local ]] || { echo 'ID must be lowercase letters, digits or dashes' >&2; exit 2; }
[[ "$slot" =~ ^[1-6]$ ]] || { echo 'SLOT must be 1-6' >&2; exit 2; }
[[ "$target" =~ ^[A-Za-z0-9._-]+@[A-Za-z0-9.:-]+$ ]] || { echo 'Target must be USER@HOST' >&2; exit 2; }
[ "$(uname -s)" = Darwin ] || { echo 'The main host helper uses launchd (macOS)' >&2; exit 2; }
fleet="$HOME/.local/share/specweave/fleet"
state="${SPECWEAVE_SWITCH_STATE:-$HOME/.local/share/specweave/switch}"
port="${slot}8318"
# A port already given to another machine would show that machine's accounts under this label.
if [ -f "$state/peers.json" ]; then
  owner="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(next((p.get("id","") for p in d.get("peers",[]) if p.get("url")==sys.argv[2] and p.get("id")!=sys.argv[3]),""))' "$state/peers.json" "http://127.0.0.1:$port" "$id")"
  [ -z "$owner" ] || { echo "Slot $slot (port $port) already belongs to $owner; pick another slot." >&2; exit 2; }
fi
if ! launchctl print "gui/$(id -u)/com.specweave.switch.tunnel-$id" >/dev/null 2>&1 && (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
  echo "Port $port is already in use on this Mac; pick another slot." >&2; exit 2
fi
ssh_opts=(-F /dev/null -i "$fleet/id_ed25519" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$fleet/known_hosts" -o ConnectTimeout=5 -o ControlMaster=no)
/usr/bin/ssh "${ssh_opts[@]}" "$target" "curl -s -o /dev/null -w '%{http_code}' -H 'Host: 127.0.0.1:$port' http://127.0.0.1:8318/api/state" | grep -q 200 \
  || { echo "Switch is not answering on $target (or the host key is not pinned in $fleet/known_hosts)" >&2; exit 3; }

agent="$HOME/Library/LaunchAgents/com.specweave.switch.tunnel-$id.plist"
python3 - "$agent" "$target" "$port" "$fleet" "$id" <<'PY'
import plistlib, sys
agent, target, port, fleet, id = sys.argv[1:]
home = fleet.rsplit('/.local/', 1)[0]
args = ['/usr/bin/env', '-i', f'HOME={home}', 'PATH=/usr/bin:/bin', '/usr/bin/ssh', '-F', '/dev/null', '-i', f'{fleet}/id_ed25519',
        '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', f'UserKnownHostsFile={fleet}/known_hosts',
        '-o', 'ConnectTimeout=5', '-o', 'ControlMaster=no', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
        '-N', '-L', f'127.0.0.1:{port}:127.0.0.1:8318', target]
with open(agent, 'wb') as f:
    plistlib.dump({'Label': f'com.specweave.switch.tunnel-{id}', 'ProgramArguments': args, 'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 30}, f)
PY
domain="gui/$(id -u)"
launchctl bootout "$domain/com.specweave.switch.tunnel-$id" 2>/dev/null || true
# bootout returns before launchd lets go of the label; bootstrapping too early fails with EIO (5).
for _ in $(seq 1 20); do launchctl print "$domain/com.specweave.switch.tunnel-$id" >/dev/null 2>&1 || break; sleep 0.5; done
ok=0
for _ in 1 2 3 4 5; do
  if launchctl bootstrap "$domain" "$agent" 2>/dev/null; then ok=1; break; fi
  sleep 1
done
[ "$ok" = 1 ] || { echo "Could not start the tunnel agent $agent; run: launchctl bootstrap $domain $agent" >&2; exit 4; }

mkdir -p "$state"
python3 - "$state/peers.json" "$id" "$label" "$port" <<'PY'
import json, os, sys
path, id, label, port = sys.argv[1:]
try:
    data = json.load(open(path))
except FileNotFoundError:
    data = {}
peers = [p for p in data.get('peers', []) if p.get('id') != id]
peers.append({'id': id, 'label': label, 'url': f'http://127.0.0.1:{port}'})
data['peers'] = peers
tmp = path + '.tmp'
with open(tmp, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
os.chmod(tmp, 0o600)
os.replace(tmp, path)
PY
for _ in $(seq 1 10); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/state" || true)"
  [ "$code" = 200 ] && break; sleep 1
done
[ "$code" = 200 ] || { echo "Tunnel to $target did not come up on 127.0.0.1:$port" >&2; exit 4; }
echo "$label is on this Mac's Switch page (tunnel 127.0.0.1:$port -> $target:8318)."
