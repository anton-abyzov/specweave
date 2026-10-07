#!/usr/bin/env python3
"""Install this reviewed bundle privately, with an absolute Node 22 launcher."""
import argparse
import hashlib
import json
import os
import pathlib
import plistlib
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--node', required=True, help='Absolute path to verified Node 22')
parser.add_argument('--service', action='store_true', help='Start private dashboard through launchd')
parser.add_argument('--domain', choices=['gui', 'user'], help='Worker SSH accounts may require the user launchd domain')
args = parser.parse_args()
node = pathlib.Path(args.node).resolve(strict=True)
if subprocess.check_output([str(node), '-p', 'process.versions.node.split(".")[0]'], text=True).strip() != '22':
    parser.error('Node 22 required')
source = pathlib.Path(__file__).resolve().parent.parent
home = pathlib.Path.home()
root = home / '.local/share/specweave/subscription-switch'
wrapper = home / '.local/bin/specweave-switch'
agent = home / 'Library/LaunchAgents/com.specweave.switch.plist'
if wrapper.exists() or wrapper.is_symlink() or (args.service and agent.exists()):
    parser.error('Existing companion launcher/service preserved; review before updating')
digest = hashlib.sha256()
files = sorted(p for p in source.rglob('*') if p.is_file() and '__pycache__' not in p.parts and 'node_modules' not in p.parts)
for path in files:
    digest.update(str(path.relative_to(source)).encode() + b'\0' + path.read_bytes())
bundle_hash = digest.hexdigest()
release = root / 'versions' / bundle_hash
root.mkdir(parents=True, exist_ok=True, mode=0o700)
release.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
if release.exists():
    parser.error('Existing release preserved; review before updating')
staging = pathlib.Path(tempfile.mkdtemp(prefix='install-', dir=release.parent))
try:
    for path in files:
        target = staging / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    staging.rename(release)
except BaseException:
    shutil.rmtree(staging)
    raise
wrapper.parent.mkdir(parents=True, exist_ok=True)
# json.dumps is only used for bash double-quoted paths after rejecting expansion
# characters. Paths on either host contain no shell metacharacters.
for path in (str(node), str(release), str(node.parent)):
    if any(c in path for c in '`$\\\n\r"'):
        parser.error('Runtime path contains unsupported shell characters')
wrapper.write_text('#!/bin/bash\nexport PATH=' + json.dumps(str(node.parent) + ':') + '"$PATH"\nexec ' + json.dumps(str(node)) + ' ' + json.dumps(str(release / 'bin/specweave-switch.mjs')) + ' "$@"\n')
wrapper.chmod(0o755)
subprocess.run([str(wrapper), 'init'], stdout=subprocess.DEVNULL, check=True)
if args.service:
    candidates = [args.domain] if args.domain else ['gui', 'user']
    domain = next((kind + '/' + str(os.getuid()) for kind in candidates if subprocess.run(['launchctl', 'print', kind + '/' + str(os.getuid())], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0), None)
    if domain is None:
        parser.error('No requested launchd domain is available; installed launcher preserved')
    logs = root / 'logs'
    logs.mkdir(mode=0o700, exist_ok=True)
    for name in ('stdout.log', 'stderr.log'):
        path = logs / name
        path.touch(mode=0o600, exist_ok=True)
        path.chmod(0o600)
    agent.parent.mkdir(parents=True, exist_ok=True)
    config = {'Label': 'com.specweave.switch', 'ProgramArguments': [str(node), str(release / 'bin/specweave-switch.mjs'), 'serve', '--port', '8318'],
              'RunAtLoad': True, 'KeepAlive': True, 'WorkingDirectory': str(release),
              'EnvironmentVariables': {'PATH': str(node.parent) + ':/usr/bin:/bin:/usr/sbin:/sbin', 'PWDEBUG': '0', 'PLAYWRIGHT_HTML_OPEN': 'never'},
              'StandardOutPath': str(logs / 'stdout.log'), 'StandardErrorPath': str(logs / 'stderr.log')}
    with agent.open('wb') as handle:
        plistlib.dump(config, handle)
    agent.chmod(0o600)
    subprocess.run(['launchctl', 'bootstrap', domain, str(agent)], check=True)
receipt = {'bundleSha256': bundle_hash, 'release': str(release), 'launcher': str(wrapper), 'node': str(node), 'serviceInstalled': args.service, 'serviceDomain': domain if args.service else None}
receipt_file = root / 'install-receipt.json'
receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
receipt_file.chmod(0o600)
print(json.dumps(receipt, indent=2))
