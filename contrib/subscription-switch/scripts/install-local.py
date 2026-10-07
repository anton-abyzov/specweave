#!/usr/bin/env python3
"""Install pinned T3 nightly beside stable, with Python 3.9-safe extraction."""
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

TAG = '0.0.46-nightly.20261007.2761'
NAME = 't3-' + TAG + '-darwin-arm64.tar.gz'
URL = 'https://github.com/pingdotgg/t3code/releases/download/v' + TAG + '/' + NAME
SHA = '02c191e2a3ed5c3d8c9808d6039884cda18e72426130d062bfbd1b024a5dc3fe'


def safe_extract(tar, destination):
    """Validate every member first; extract only regular files/directories."""
    root = Path(destination).resolve(strict=True)
    members = tar.getmembers()
    seen = set()
    total = 0
    for member in members:
        name = PurePosixPath(member.name)
        if '\x00' in member.name or '\\' in member.name or name.is_absolute() or '..' in name.parts:
            raise ValueError('Unsafe archive path denied')
        if not (member.isdir() or member.isreg()):
            raise ValueError('Archive links/special files denied')
        if not name.parts and not member.isdir():
            raise ValueError('Invalid archive root member')
        target = root.joinpath(*name.parts)
        if target != root and root not in target.resolve().parents:
            raise ValueError('Archive path escapes destination')
        if target in seen and target != root:
            raise ValueError('Duplicate archive path denied')
        seen.add(target)
        if member.isreg():
            if member.size < 0 or member.size > 500_000_000:
                raise ValueError('Archive member size denied')
            total += member.size
            if total > 1_000_000_000:
                raise ValueError('Archive total size denied')
    # Fresh private destination has no existing links; validation rejects links
    # in this archive before any file is created. No tar.extractall/filter API.
    for member in members:
        target = root.joinpath(*PurePosixPath(member.name).parts)
        if member.isdir():
            target.mkdir(parents=True, exist_ok=True, mode=0o700)
        else:
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with tar.extractfile(member) as source, target.open('xb') as output:
                shutil.copyfileobj(source, output)
            target.chmod(member.mode & 0o777 or 0o600)


def main():
    root = Path.home() / '.local/share/specweave/t3-nightly'
    version = root / 'versions' / TAG
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    archive = root / NAME
    if archive.is_symlink():
        raise ValueError('Existing archive symlink preserved for review')
    if not archive.exists():
        with tempfile.TemporaryDirectory(dir=root) as download:
            candidate = Path(download) / NAME
            subprocess.run(['/usr/bin/curl', '--fail', '--location', '--silent', '--show-error', '--max-time', '120', '--max-filesize', '200000000', URL, '-o', str(candidate)], check=True)
            if hashlib.sha256(candidate.read_bytes()).hexdigest() != SHA:
                raise RuntimeError('Asset SHA256 mismatch')
            os.replace(candidate, archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != SHA:
        raise RuntimeError('Asset SHA256 mismatch')
    if version.is_symlink():
        raise ValueError('Existing nightly symlink preserved for review')
    if not version.exists():
        version.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            with tarfile.open(archive) as tar:
                safe_extract(tar, tmp)
            os.rename(tmp, version)
    print(json.dumps({'tag': TAG, 'sha256': SHA, 'asset': str(archive), 'installedAt': str(version), 'stablePreserved': True}))


if __name__ == '__main__':
    main()
