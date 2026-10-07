#!/usr/bin/env python3
"""Install a private reviewed bundle; update only its verified launcher/service."""
import argparse
import hashlib
import json
import os
import pathlib
import plistlib
import re
import shutil
import subprocess
import tempfile
import time

LABEL = 'com.specweave.switch'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def owned_file(path):
    require(path.is_file() and not path.is_symlink() and path.stat().st_uid == os.getuid(), 'Unverified owned file: ' + str(path))


def owned_directory(path):
    require(path.is_dir() and not path.is_symlink() and path.stat().st_uid == os.getuid(), 'Unverified owned directory: ' + str(path))


def bundle_files(source):
    files = []
    for path in sorted(source.rglob('*')):
        if '__pycache__' in path.parts or 'node_modules' in path.parts:
            continue
        require(not path.is_symlink(), 'Bundle symlink denied: ' + str(path))
        if path.is_file():
            files.append(path)
        else:
            require(path.is_dir(), 'Nonregular bundle member denied: ' + str(path))
    return files


def bundle_digest(source, files=None):
    digest = hashlib.sha256()
    for path in bundle_files(source) if files is None else files:
        digest.update(str(path.relative_to(source)).encode() + b'\0' + path.read_bytes())
    return digest.hexdigest()


def launcher_bytes(node, release):
    for path in (str(node), str(release), str(node.parent)):
        require(not any(c in path for c in '`$\\\n\r"'), 'Runtime path contains unsupported shell characters')
    return ('#!/bin/bash\nexport PATH=' + json.dumps(str(node.parent) + ':') + '"$PATH"\nexec ' + json.dumps(str(node)) + ' ' + json.dumps(str(release / 'bin/specweave-switch.mjs')) + ' "$@"\n').encode()


def service_config(node, release, root, domain):
    logs = root / 'logs'
    config = {'Label': LABEL, 'ProgramArguments': [str(node), str(release / 'bin/specweave-switch.mjs'), 'serve', '--port', '8318'],
              'RunAtLoad': True, 'KeepAlive': True, 'WorkingDirectory': str(release),
              'EnvironmentVariables': {'PATH': str(node.parent) + ':/usr/bin:/bin:/usr/sbin:/sbin', 'PWDEBUG': '0', 'PLAYWRIGHT_HTML_OPEN': 'never'},
              'StandardOutPath': str(logs / 'stdout.log'), 'StandardErrorPath': str(logs / 'stderr.log')}
    if domain.startswith('user/'):
        config['LimitLoadToSessionType'] = ['Background']
    return config


def launchctl(*args, check=False):
    return subprocess.run(['launchctl'] + list(args), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15, check=check)


def absent_service(result):
    return result.returncode != 0 and 'Could not find service' in result.stderr


def loaded_identity(domain, agent, node, release, allow_absent=False, result=None):
    result = result if result is not None else launchctl('print', domain + '/' + LABEL)
    if result.returncode:
        require(allow_absent and absent_service(result), 'Service absence is unverified in its recorded domain')
        return False
    fields = {}
    arguments = []
    inside_arguments = False
    for line in result.stdout.splitlines():
        if re.match(r'\s*arguments = \{\s*$', line):
            inside_arguments = True
            continue
        if inside_arguments:
            if line.strip() == '}':
                inside_arguments = False
            else:
                arguments.append(line.strip())
            continue
        match = re.match(r'^\s*(path|program) = (.+)$', line)
        if match and match.group(1) not in fields:
            fields[match.group(1)] = match.group(2).strip()
    require(fields.get('path') == str(agent) and fields.get('program') == str(node) and arguments == [str(node), str(release / 'bin/specweave-switch.mjs'), 'serve', '--port', '8318'], 'Loaded service identity differs; preserve it for review')
    return True


def wait_unloaded(domain, agent, node, release, timeout=10, poll=0.1):
    """bootout can acknowledge before launchd finishes removing the job."""
    deadline = time.monotonic() + timeout
    while True:
        result = launchctl('print', domain + '/' + LABEL)
        if absent_service(result):
            return
        # Never treat permission/connection failures, or a different job with
        # this label, as permission to replace a service.
        loaded_identity(domain, agent, node, release, result=result)
        remaining = deadline - time.monotonic()
        require(remaining > 0, 'Timed out waiting for verified service teardown')
        time.sleep(min(poll, remaining))


def atomic_bytes(path, data, mode):
    require(not path.is_symlink(), 'Symlink destination denied: ' + str(path))
    fd, name = tempfile.mkstemp(prefix=path.name + '.install-', dir=path.parent)
    temporary = pathlib.Path(name)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.chmod(mode)
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def install(args):
    node = pathlib.Path(args.node).resolve(strict=True)
    require(subprocess.check_output([str(node), '-p', 'process.versions.node.split(".")[0]'], text=True, timeout=15).strip() == '22', 'Node 22 required')
    source = pathlib.Path(__file__).resolve().parent.parent
    home = pathlib.Path.home()
    root = home / '.local/share/specweave/subscription-switch'
    wrapper = home / '.local/bin/specweave-switch'
    agent = home / 'Library/LaunchAgents' / (LABEL + '.plist')
    receipt_file = root / 'install-receipt.json'
    previous = None
    old_agent = None
    old_wrapper = None
    old_receipt = None
    domain = None
    if args.update:
        owned_file(receipt_file)
        old_receipt = receipt_file.read_bytes()
        previous = json.loads(old_receipt)
        require(isinstance(previous, dict), 'Prior receipt must be an object')
        old_release = pathlib.Path(previous['release'])
        require(re.fullmatch(r'[0-9a-f]{64}', previous['bundleSha256']) and old_release.parent == root / 'versions' and old_release.name == previous['bundleSha256'], 'Prior release path is unverified')
        owned_directory(root)
        owned_directory(old_release.parent)
        owned_directory(old_release)
        require(bundle_digest(old_release) == previous['bundleSha256'], 'Prior bundle digest changed; preserve it for review')
        require(previous['launcher'] == str(wrapper), 'Prior launcher path changed')
        owned_file(wrapper)
        old_node = pathlib.Path(previous['node'])
        old_wrapper = wrapper.read_bytes()
        require(old_wrapper == launcher_bytes(old_node, old_release), 'Prior launcher changed; preserve it for review')
        require(type(previous['serviceInstalled']) is bool and previous['serviceInstalled'] == args.service, 'Update must preserve prior service installation choice')
        if args.service:
            owned_file(agent)
            old_agent = agent.read_bytes()
            domain = previous['serviceDomain']
            require(domain in ['gui/' + str(os.getuid()), 'user/' + str(os.getuid())], 'Prior launchd domain is unverified')
            require(not args.domain or domain.startswith(args.domain + '/'), 'Update must preserve its launchd domain')
            require(plistlib.loads(old_agent) == service_config(old_node, old_release, root, domain), 'Prior service configuration changed; preserve it for review')
            loaded_identity(domain, agent, old_node, old_release)
    else:
        require(not wrapper.exists() and not wrapper.is_symlink() and not receipt_file.exists() and not receipt_file.is_symlink(), 'Existing companion launcher/receipt preserved; use a verified update')
        if args.service:
            require(not agent.exists() and not agent.is_symlink(), 'Existing companion service preserved for review')
    if args.service:
        candidates = [domain.split('/')[0]] if domain else ([args.domain] if args.domain else ['gui', 'user'])
        domain = next((kind + '/' + str(os.getuid()) for kind in candidates if launchctl('print', kind + '/' + str(os.getuid())).returncode == 0), None)
        require(domain is not None, 'No requested launchd domain is available')
        if not previous:
            require(absent_service(launchctl('print', domain + '/' + LABEL)), 'Service absence unverified; preserve any loaded service for review')
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    owned_directory(root)
    lock = root / '.install.lock'
    # Exclusive, never silently removes a prior installer's lock.
    with lock.open('x') as handle:
        handle.write(str(os.getpid()) + '\n')
    lock.chmod(0o600)
    try:
        # Recheck identities inside the lock before staging or stopping anything.
        if previous:
            require(wrapper.read_bytes() == old_wrapper and receipt_file.read_bytes() == old_receipt, 'Installation changed during preflight')
            if args.service:
                require(agent.read_bytes() == old_agent, 'Service changed during preflight')
                loaded_identity(domain, agent, old_node, old_release)
        files = bundle_files(source)
        bundle_hash = bundle_digest(source, files)
        release = root / 'versions' / bundle_hash
        release.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        owned_directory(release.parent)
        if release.exists() or release.is_symlink():
            owned_directory(release)
            require(bundle_digest(release) == bundle_hash, 'Existing release differs; preserve it for review')
        else:
            staging = pathlib.Path(tempfile.mkdtemp(prefix='install-', dir=release.parent))
            try:
                for path in files:
                    target = staging / path.relative_to(source)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(path, target)
                staging.rename(release)
            finally:
                if staging.exists():
                    shutil.rmtree(staging)
        new_wrapper = launcher_bytes(node, release)
        # Init uses the reviewed absolute bundle before any launcher/service mutation.
        # Existing native authentication/profile state is read back, never migrated.
        subprocess.run([str(node), str(release / 'bin/specweave-switch.mjs'), 'init'], stdout=subprocess.DEVNULL, check=True, timeout=30)
        wrapper.parent.mkdir(parents=True, exist_ok=True)
        pending = wrapper.with_name('specweave-switch.installing')
        require(not pending.exists() and not pending.is_symlink(), 'Unfinished launcher update preserved for review')
        new_agent = None
        if args.service:
            logs = root / 'logs'
            logs.mkdir(mode=0o700, exist_ok=True)
            owned_directory(logs)
            for name in ('stdout.log', 'stderr.log'):
                path = logs / name
                require(not path.is_symlink(), 'Symlink log path denied')
                path.touch(mode=0o600, exist_ok=True)
                path.chmod(0o600)
            agent.parent.mkdir(parents=True, exist_ok=True)
            new_agent = plistlib.dumps(service_config(node, release, root, domain))
        if previous:
            backups = root / 'previous'
            backups.mkdir(mode=0o700, exist_ok=True)
            owned_directory(backups)
            backup = pathlib.Path(tempfile.mkdtemp(prefix=previous['bundleSha256'] + '-', dir=backups))
            atomic_bytes(backup / 'launcher', old_wrapper, 0o600)
            atomic_bytes(backup / 'receipt.json', old_receipt, 0o600)
            if old_agent:
                atomic_bytes(backup / 'service.plist', old_agent, 0o600)
        receipt = {'bundleSha256': bundle_hash, 'release': str(release), 'launcher': str(wrapper), 'node': str(node), 'serviceInstalled': args.service, 'serviceDomain': domain}
        stopped = False
        old_teardown_accepted = False
        new_service_attempted = False
        launcher_changed = False
        agent_changed = False
        receipt_changed = False
        try:
            if previous and args.service:
                loaded_identity(domain, agent, old_node, old_release)
                stopped = True
                launchctl('bootout', domain + '/' + LABEL, check=True)
                old_teardown_accepted = True
                wait_unloaded(domain, agent, old_node, old_release)
            atomic_bytes(wrapper, new_wrapper, 0o755)
            launcher_changed = True
            if args.service:
                atomic_bytes(agent, new_agent, 0o600)
                agent_changed = True
                new_service_attempted = True
                launchctl('bootstrap', domain, str(agent), check=True)
                loaded_identity(domain, agent, node, release)
            atomic_bytes(receipt_file, (json.dumps(receipt, indent=2) + '\n').encode(), 0o600)
            receipt_changed = True
        except BaseException as failure:
            rollback_errors = []
            try:
                if new_service_attempted and loaded_identity(domain, agent, node, release, allow_absent=True):
                    launchctl('bootout', domain + '/' + LABEL, check=True)
                    wait_unloaded(domain, agent, node, release)
                if launcher_changed:
                    if previous:
                        atomic_bytes(wrapper, old_wrapper, 0o755)
                    else:
                        wrapper.unlink()
                if agent_changed:
                    if previous:
                        atomic_bytes(agent, old_agent, 0o600)
                    else:
                        agent.unlink()
                if previous:
                    # Also restores receipt after a partially completed receipt write.
                    atomic_bytes(receipt_file, old_receipt, 0o600)
                elif receipt_changed:
                    receipt_file.unlink()
                if stopped:
                    if old_teardown_accepted:
                        wait_unloaded(domain, agent, old_node, old_release)
                    if not loaded_identity(domain, agent, old_node, old_release, allow_absent=True):
                        launchctl('bootstrap', domain, str(agent), check=True)
                        loaded_identity(domain, agent, old_node, old_release)
            except BaseException as rollback_failure:
                rollback_errors.append(str(rollback_failure))
            if rollback_errors:
                raise RuntimeError('Install failed; rollback needs review: ' + '; '.join(rollback_errors)) from failure
            raise
        return receipt
    finally:
        lock.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--node', required=True, help='Absolute path to verified Node 22')
    parser.add_argument('--service', action='store_true', help='Start private dashboard through launchd')
    parser.add_argument('--domain', choices=['gui', 'user'], help='Worker SSH accounts may require the user launchd domain')
    parser.add_argument('--update', action='store_true', help='Replace only a verified prior companion installation')
    args = parser.parse_args(argv)
    try:
        receipt = install(args)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        parser.error(str(error))
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
