#!/usr/bin/env python3
"""Install the pinned T3 nightly beside the stable runtime. No credential changes."""
import hashlib,json,os,subprocess,tarfile,tempfile
from pathlib import Path
TAG='0.0.46-nightly.20261007.2761'
NAME=f't3-{TAG}-darwin-arm64.tar.gz'
URL=f'https://github.com/pingdotgg/t3code/releases/download/v{TAG}/{NAME}'
SHA='02c191e2a3ed5c3d8c9808d6039884cda18e72426130d062bfbd1b024a5dc3fe'
root=Path.home()/'.local/share/specweave/t3-nightly'
version=root/'versions'/TAG
root.mkdir(parents=True,exist_ok=True,mode=0o700)
archive=root/NAME
if not archive.exists():
    with tempfile.TemporaryDirectory(dir=root) as download:
        candidate=Path(download)/NAME
        subprocess.run(['/usr/bin/curl','--fail','--location','--silent','--show-error','--max-time','120','--max-filesize','200000000',URL,'-o',str(candidate)],check=True)
        if hashlib.sha256(candidate.read_bytes()).hexdigest()!=SHA: raise RuntimeError('Asset SHA256 mismatch')
        os.replace(candidate,archive)
if hashlib.sha256(archive.read_bytes()).hexdigest()!=SHA: raise RuntimeError('Asset SHA256 mismatch')
if not version.exists():
    version.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=root) as tmp:
        with tarfile.open(archive) as tar:
            tar.extractall(tmp,filter='data')
        os.rename(tmp,version)
print(json.dumps({'tag':TAG,'sha256':SHA,'asset':str(archive),'installedAt':str(version),'stablePreserved':True}))
