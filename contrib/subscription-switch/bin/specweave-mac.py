#!/usr/bin/env python3
"""Explicit native execution on a verified worker, using pinned SSH transport."""
import json
import os
import pathlib
import re
import shlex
import subprocess
import sys

if len(sys.argv) < 3 or sys.argv[1] not in ('m1', 'm3') or sys.argv[2] not in ('status', 'refresh', 'doctor', 'run', 'dashboard'):
    raise SystemExit('Usage: specweave-mac m1|m3 status|refresh|doctor|run|dashboard [native run options]')
role, command = sys.argv[1:3]
root = pathlib.Path.home() / '.local/share/specweave/fleet'
config = root / 'hosts.json'
if config.is_symlink() or config.stat().st_uid != os.getuid() or config.stat().st_mode & 0o077:
    raise SystemExit('Fleet references must be private, locally owned and nonsymlinked')
host = json.loads(config.read_text())[role]
if not re.fullmatch(r'[0-9.]+', host['host']) or not re.fullmatch(r'[a-zA-Z0-9_-]+', host['user']) or not re.fullmatch(r'/Users/[a-zA-Z0-9_-]+', host['home']):
    raise SystemExit('Invalid verified worker reference')
key, pins = root / 'id_ed25519', root / 'known_hosts'
if not key.is_file() or not pins.is_file() or key.stat().st_mode & 0o077:
    raise SystemExit('Dedicated private SSH key and verified host pins are required')
options = ['ssh', '-i', str(key), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + str(pins), '-o', 'ConnectTimeout=8']
target = host['user'] + '@' + host['host']
if command == 'dashboard':
    if len(sys.argv) != 3:
        raise SystemExit('Dashboard accepts no run options')
    port = 18318 if role == 'm1' else 28318
    print('Private worker dashboard: http://127.0.0.1:' + str(port), flush=True)
    args = options + ['-o', 'ExitOnForwardFailure=yes', '-N', '-L', '127.0.0.1:' + str(port) + ':127.0.0.1:8318', target]
else:
    if command != 'run' and len(sys.argv) != 3:
        raise SystemExit('Only run accepts native run options')
    # Each argument is a literal remote shell word. Prompt text cannot become a
    # shell operation; the remote companion enforces native sandbox and leases.
    remote = [host['home'] + '/.local/bin/specweave-switch', command] + sys.argv[3:]
    args = options + [target, shlex.join(remote)]
raise SystemExit(subprocess.call(args))
