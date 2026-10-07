#!/usr/bin/env python3
"""Installer regressions: temporary HOME, synthetic profiles, fake launchctl/Node."""
import importlib.util
import io
import json
import os
import pathlib
import plistlib
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

SCRIPTS = pathlib.Path(__file__).resolve().parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


installer = load('switch_installer', SCRIPTS / 'install-switch.py')
nightly = load('nightly_installer', SCRIPTS / 'install-local.py')


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='switch-install-test-')
        self.scratch = pathlib.Path(self.temp.name)
        self.home = self.scratch / 'home'
        self.source = self.scratch / 'source'
        (self.source / 'scripts').mkdir(parents=True)
        self.script = self.source / 'scripts/install-switch.py'
        shutil.copy2(SCRIPTS / 'install-switch.py', self.script)
        (self.source / 'bin').mkdir()
        (self.source / 'bin/specweave-switch.mjs').write_text('// synthetic new bundle\n')
        fakebin = self.scratch / 'fakebin'
        fakebin.mkdir()
        self.node = fakebin / 'node'
        self.node.write_text('#!/bin/sh\nif [ "$1" = "-p" ]; then echo 22; exit 0; fi\nexit "${FAKE_INIT_STATUS:-0}"\n')
        self.node.chmod(0o755)
        fake_launchctl = fakebin / 'launchctl'
        fake_launchctl.write_text('''#!/usr/bin/env python3
import json, os, pathlib, plistlib, sys
root=pathlib.Path(os.environ['FAKE_RUNTIME'])
with (root/'calls.jsonl').open('a') as f: f.write(json.dumps(sys.argv[1:])+'\\n')
state=root/'active.json'
command=sys.argv[1]
if command=='print':
 if '/' not in sys.argv[2].split('/',1)[1]:
  sys.exit(1 if os.environ.get('FAKE_NO_DOMAIN')=='1' else 0)
 teardown=root/'teardown.pending'
 if teardown.exists():
  remaining=int(teardown.read_text())-1
  if remaining<=0:
   teardown.unlink()
   if state.exists(): state.unlink()
  else: teardown.write_text(str(remaining))
 if not state.exists():
  print('Could not find service "com.specweave.switch"', file=sys.stderr); sys.exit(113)
 data=json.loads(state.read_text())
 print('path = '+data['path'])
 print('program = '+data['args'][0])
 print('arguments = {')
 for arg in data['args']: print(arg)
 print('}')
 sys.exit(0)
if command=='bootout':
 if os.environ.get('FAKE_BOOTOUT_FAIL')=='1': sys.exit(1)
 if os.environ.get('FAKE_TEARDOWN_POLLS'):
  (root/'teardown.pending').write_text(os.environ['FAKE_TEARDOWN_POLLS'])
 elif state.exists(): state.unlink()
 sys.exit(0)
if command=='bootstrap':
 if state.exists(): sys.exit(5)
 marker=root/'bootstrap.failed'
 if os.environ.get('FAKE_BOOTSTRAP_FAIL')=='1' and not marker.exists():
  marker.touch(); sys.exit(1)
 config=plistlib.loads(pathlib.Path(sys.argv[3]).read_bytes())
 state.write_text(json.dumps({'path':sys.argv[3], 'args':config['ProgramArguments']}))
 sys.exit(0)
sys.exit(1)
''')
        fake_launchctl.chmod(0o755)
        self.root = self.home / '.local/share/specweave/subscription-switch'
        old_staging = self.scratch / 'old-source'
        (old_staging / 'bin').mkdir(parents=True)
        (old_staging / 'bin/specweave-switch.mjs').write_text('// synthetic old bundle\n')
        old_digest = installer.bundle_digest(old_staging)
        self.old_release = self.root / 'versions' / old_digest
        self.old_release.parent.mkdir(parents=True)
        shutil.copytree(old_staging, self.old_release)
        self.wrapper = self.home / '.local/bin/specweave-switch'
        self.wrapper.parent.mkdir(parents=True)
        self.old_wrapper = installer.launcher_bytes(self.node, self.old_release)
        self.wrapper.write_bytes(self.old_wrapper)
        self.wrapper.chmod(0o755)
        self.agent = self.home / 'Library/LaunchAgents/com.specweave.switch.plist'
        self.agent.parent.mkdir(parents=True)
        self.domain = 'gui/' + str(os.getuid())
        self.old_agent = plistlib.dumps(installer.service_config(self.node, self.old_release, self.root, self.domain))
        self.agent.write_bytes(self.old_agent)
        self.receipt_path = self.root / 'install-receipt.json'
        self.receipt = {'bundleSha256':old_digest, 'release':str(self.old_release), 'launcher':str(self.wrapper), 'node':str(self.node), 'serviceInstalled':True, 'serviceDomain':self.domain}
        self.old_receipt = json.dumps(self.receipt).encode()
        self.receipt_path.write_bytes(self.old_receipt)
        self.active = self.scratch / 'active.json'
        self.old_active = json.dumps({'path':str(self.agent),'args':[str(self.node),str(self.old_release/'bin/specweave-switch.mjs'),'serve','--port','8318']})
        self.active.write_text(self.old_active)
        self.env = dict(os.environ, HOME=str(self.home), PATH=str(fakebin)+':'+os.environ['PATH'], FAKE_RUNTIME=str(self.scratch), PWDEBUG='0', PLAYWRIGHT_HTML_OPEN='never')
        # Synthetic fixture only; production installer never opens native auth.
        self.profile = self.home / '.codex/auth.json'
        self.profile.parent.mkdir()
        self.profile.write_text('synthetic-native-profile-preservation-fixture\n')

    def tearDown(self):
        self.temp.cleanup()

    def run_install(self, optimized=False, **environment):
        cmd=[sys.executable]+(['-O'] if optimized else [])+[str(self.script),'--node',str(self.node),'--update','--service']
        return subprocess.run(cmd, env=dict(self.env, **environment), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)

    def calls(self):
        log=self.scratch/'calls.jsonl'
        return [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []

    def assert_preserved(self):
        self.assertEqual(self.wrapper.read_bytes(),self.old_wrapper)
        self.assertEqual(self.agent.read_bytes(),self.old_agent)
        self.assertEqual(self.receipt_path.read_bytes(),self.old_receipt)
        self.assertEqual((self.old_release/'bin/specweave-switch.mjs').read_text(),'// synthetic old bundle\n')
        self.assertEqual(self.profile.read_text(),'synthetic-native-profile-preservation-fixture\n')

    def test_unknown_launcher_preserved_even_optimized(self):
        self.old_wrapper=b'#!/bin/sh\n# unrelated native launcher\nexit 0\n'
        self.wrapper.write_bytes(self.old_wrapper)
        for optimized in (False,True):
            result=self.run_install(optimized)
            self.assertNotEqual(result.returncode,0,result.stdout)
            self.assert_preserved()
            self.assertFalse(any(call[0]=='bootout' for call in self.calls()))

    def test_modified_service_and_loaded_foreign_identity_preserved(self):
        config=plistlib.loads(self.old_agent)
        config['EnvironmentVariables']['CUSTOM']='preserve-me'
        self.old_agent=plistlib.dumps(config)
        self.agent.write_bytes(self.old_agent)
        self.assertNotEqual(self.run_install().returncode,0)
        self.assert_preserved()
        self.old_agent=plistlib.dumps(installer.service_config(self.node,self.old_release,self.root,self.domain))
        self.agent.write_bytes(self.old_agent)
        data=json.loads(self.old_active)
        data['args'][0]='/unrelated/program'
        self.active.write_text(json.dumps(data))
        self.assertNotEqual(self.run_install().returncode,0)
        self.assert_preserved()
        self.assertFalse(any(call[0]=='bootout' for call in self.calls()))

    def test_changed_old_bundle_preserved(self):
        (self.old_release/'bin/specweave-switch.mjs').write_text('// modified old bundle\n')
        self.assertNotEqual(self.run_install().returncode,0)
        self.assertEqual(self.wrapper.read_bytes(),self.old_wrapper)
        self.assertEqual((self.old_release/'bin/specweave-switch.mjs').read_text(),'// modified old bundle\n')
        self.assertFalse(any(call[0]=='bootout' for call in self.calls()))

    def test_init_failure_and_missing_domain_do_not_stop_service(self):
        for env in ({'FAKE_INIT_STATUS':'1'},{'FAKE_NO_DOMAIN':'1'}):
            result=self.run_install(**env)
            self.assertNotEqual(result.returncode,0,result.stdout)
            self.assert_preserved()
            self.assertFalse(any(call[0]=='bootout' for call in self.calls()))

    def test_bootstrap_failure_rolls_back_exact_service(self):
        result=self.run_install(FAKE_BOOTSTRAP_FAIL='1')
        self.assertNotEqual(result.returncode,0,result.stdout)
        self.assert_preserved()
        self.assertEqual(json.loads(self.active.read_text()),json.loads(self.old_active))
        self.assertEqual(sum(call[0]=='bootstrap' for call in self.calls()),2)
        backup=list((self.root/'previous').iterdir())[0]
        self.assertEqual((backup/'receipt.json').read_bytes(),self.old_receipt)

    def test_failed_bootout_keeps_loaded_prior_service(self):
        result=self.run_install(FAKE_BOOTOUT_FAIL='1')
        self.assertNotEqual(result.returncode,0,result.stdout)
        self.assert_preserved()
        self.assertEqual(json.loads(self.active.read_text()),json.loads(self.old_active))
        self.assertFalse(any(call[0]=='bootstrap' for call in self.calls()))

    def test_asynchronous_teardown_waits_before_replacement(self):
        result=self.run_install(FAKE_TEARDOWN_POLLS='4')
        self.assertEqual(result.returncode,0,result.stderr)
        calls=self.calls()
        stop=next(i for i,call in enumerate(calls) if call[0]=='bootout')
        start=next(i for i,call in enumerate(calls) if call[0]=='bootstrap')
        self.assertGreaterEqual(sum(call[0]=='print' for call in calls[stop+1:start]),4)
        self.assertEqual(sum(call[0]=='bootstrap' for call in calls),1)
        self.assertFalse((self.scratch/'teardown.pending').exists())

    def test_wait_is_bounded_and_rejects_unknown_errors(self):
        printed='path = '+str(self.agent)+'\nprogram = '+str(self.node)+'\narguments = {\n'+'\n'.join(json.loads(self.old_active)['args'])+'\n}\n'
        result=subprocess.CompletedProcess(['launchctl'],0,printed,'')
        with mock.patch.object(installer,'launchctl',return_value=result):
            with self.assertRaisesRegex(ValueError,'Timed out'):
                installer.wait_unloaded(self.domain,self.agent,self.node,self.old_release,timeout=0.02,poll=0.001)
        unknown=subprocess.CompletedProcess(['launchctl'],1,'','Permission denied')
        with mock.patch.object(installer,'launchctl',return_value=unknown):
            with self.assertRaisesRegex(ValueError,'absence is unverified'):
                installer.wait_unloaded(self.domain,self.agent,self.node,self.old_release)

    def test_receipt_failure_after_bootstrap_rolls_back(self):
        module=load('receipt_failure_installer',self.script)
        original=module.atomic_bytes
        injected=[False]
        def fail_once(path,data,mode):
            if path==self.receipt_path and not injected[0]:
                injected[0]=True
                raise OSError('synthetic receipt write failure')
            return original(path,data,mode)
        args=type('Args',(),dict(node=str(self.node),update=True,service=True,domain=None))()
        with mock.patch.dict(os.environ,dict(self.env,FAKE_TEARDOWN_POLLS='3')),mock.patch.object(module.pathlib.Path,'home',return_value=self.home),mock.patch.object(module,'atomic_bytes',side_effect=fail_once):
            with self.assertRaisesRegex(OSError,'synthetic receipt'):
                module.install(args)
        self.assert_preserved()
        self.assertEqual(json.loads(self.active.read_text()),json.loads(self.old_active))
        self.assertEqual(sum(call[0]=='bootout' for call in self.calls()),2)
        self.assertEqual(sum(call[0]=='bootstrap' for call in self.calls()),2)

    def test_update_success_preserves_profiles_and_previous_bundle(self):
        result=self.run_install()
        self.assertEqual(result.returncode,0,result.stderr)
        receipt=json.loads(result.stdout)
        self.assertNotEqual(receipt['release'],str(self.old_release))
        self.assertEqual(receipt['serviceDomain'],self.domain)
        self.assertEqual(self.profile.read_text(),'synthetic-native-profile-preservation-fixture\n')
        self.assertEqual((self.old_release/'bin/specweave-switch.mjs').read_text(),'// synthetic old bundle\n')
        self.assertEqual(json.loads(self.active.read_text())['args'][1],receipt['release']+'/bin/specweave-switch.mjs')
        self.assertEqual(self.receipt_path.stat().st_mode & 0o777,0o600)
        self.assertFalse((self.root/'.install.lock').exists())

    def test_existing_install_lock_preserved(self):
        lock=self.root/'.install.lock'
        lock.write_text('another installer owns this\n')
        self.assertNotEqual(self.run_install().returncode,0)
        self.assert_preserved()
        self.assertEqual(lock.read_text(),'another installer owns this\n')
        self.assertFalse(any(call[0]=='bootout' for call in self.calls()))


class ArchiveTests(unittest.TestCase):
    def archive(self, members):
        stream=io.BytesIO()
        with tarfile.open(fileobj=stream,mode='w') as tar:
            for name,kind in members:
                member=tarfile.TarInfo(name)
                if kind=='file':
                    member.size=3; member.mode=0o755
                    tar.addfile(member,io.BytesIO(b't3\n'))
                elif kind=='dir':
                    member.type=tarfile.DIRTYPE; tar.addfile(member)
                elif kind=='link':
                    member.type=tarfile.SYMTYPE; member.linkname='../outside'; tar.addfile(member)
                elif kind=='hardlink':
                    member.type=tarfile.LNKTYPE; member.linkname='t3'; tar.addfile(member)
                else:
                    member.type=tarfile.FIFOTYPE; tar.addfile(member)
        stream.seek(0)
        return tarfile.open(fileobj=stream,mode='r')

    def test_regular_archive_and_executable_mode(self):
        with tempfile.TemporaryDirectory() as root,self.archive([('.', 'dir'),('./bin','dir'),('./bin/t3','file')]) as tar:
            nightly.safe_extract(tar,root)
            path=pathlib.Path(root)/'bin/t3'
            self.assertEqual(path.read_bytes(),b't3\n')
            self.assertEqual(path.stat().st_mode & 0o777,0o755)

    def test_unsafe_archive_rejected_before_any_file_created(self):
        cases=[('../escape','file'),('/absolute','file'),('dir\\escape','file'),('link','link'),('hard','hardlink'),('fifo','fifo')]
        for member in cases:
            with self.subTest(member=member),tempfile.TemporaryDirectory() as root,self.archive([('safe','file'),member]) as tar:
                with self.assertRaises(ValueError): nightly.safe_extract(tar,root)
                self.assertEqual(list(pathlib.Path(root).iterdir()),[])

    def test_duplicate_members_rejected(self):
        with tempfile.TemporaryDirectory() as root,self.archive([('t3','file'),('./t3','file')]) as tar:
            with self.assertRaises(ValueError): nightly.safe_extract(tar,root)
            self.assertEqual(list(pathlib.Path(root).iterdir()),[])


if __name__=='__main__':
    unittest.main(verbosity=2)
