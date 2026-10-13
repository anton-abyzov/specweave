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



FAKE_SYSTEMCTL = r"""#!/usr/bin/env python3
import json, os, pathlib, re, sys
root=pathlib.Path(os.environ['FAKE_RUNTIME'])
with (root/'calls.jsonl').open('a') as f: f.write(json.dumps(['systemctl']+sys.argv[1:])+'\n')
assert sys.argv[1]=='--user'
args=sys.argv[2:]
unit=pathlib.Path(os.environ['HOME'])/'.config/systemd/user/specweave-switch.service'
state_file=root/'systemd.json'
state=json.loads(state_file.read_text()) if state_file.exists() else {'loaded':None,'active':False,'enabled':False}
def save(): state_file.write_text(json.dumps(state))
command=args[0]
if command=='show-environment':
 sys.exit(1 if os.environ.get('FAKE_NO_USER_MANAGER')=='1' else 0)
if command=='daemon-reload':
 if unit.exists():
  line=next(l for l in unit.read_text().splitlines() if l.startswith('ExecStart='))
  state['loaded']={'fragment':str(unit),'argv':line.split('=',1)[1]}
 else: state['loaded']=None
 save(); sys.exit(0)
if command=='show':
 loaded=state['loaded']
 print('LoadState='+('loaded' if loaded else 'not-found'))
 print('ActiveState='+('active' if state['active'] else 'inactive'))
 print('FragmentPath='+(loaded['fragment'] if loaded else ''))
 print('ExecStart='+('{ path='+loaded['argv'].split()[0]+' ; argv[]='+loaded['argv']+' ; ignore_errors=no ; start_time=[n/a] ; pid=0 ; code=(null) ; status=0/0 }' if loaded and state['active'] else ''))
 sys.exit(0)
if command=='enable' and args[1:]==['--now','specweave-switch.service']:
 marker=root/'start.failed'
 if os.environ.get('FAKE_START_FAIL')=='1' and not marker.exists():
  marker.touch(); state['enabled']=True; save(); sys.exit(1)
 if not state['loaded']: sys.exit(5)
 state['enabled']=True; state['active']=True; save(); sys.exit(0)
if command=='disable':
 state['enabled']=False
 if '--now' in args: state['active']=False
 save(); sys.exit(0)
sys.exit(1)
"""


class LinuxInstallerTests(unittest.TestCase):
    """The systemd user-unit branch, driven on any host with a fake systemctl."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='switch-install-linux-')
        self.scratch = pathlib.Path(self.temp.name)
        self.home = self.scratch / 'home'
        self.home.mkdir()
        self.source = self.scratch / 'source'
        (self.source / 'scripts').mkdir(parents=True)
        self.script = self.source / 'scripts/install-switch.py'
        shutil.copy2(SCRIPTS / 'install-switch.py', self.script)
        (self.source / 'bin').mkdir()
        (self.source / 'bin/specweave-switch.mjs').write_text('// synthetic linux bundle\n')
        fakebin = self.scratch / 'fakebin'
        fakebin.mkdir()
        self.node = fakebin / 'node'
        self.node.write_text('#!/bin/sh\nif [ "$1" = "-p" ]; then echo 22; exit 0; fi\nexit 0\n')
        self.node.chmod(0o755)
        for name, body in (('systemctl', FAKE_SYSTEMCTL),
                           ('loginctl', '#!/bin/sh\necho "[\\"loginctl\\", \\"$1\\", \\"$2\\"]" >> "$FAKE_RUNTIME/calls.jsonl"\nexit "${FAKE_LINGER_STATUS:-0}"\n'),
                           ('launchctl', '#!/bin/sh\necho "[\\"launchctl\\"]" >> "$FAKE_RUNTIME/calls.jsonl"\nexit 1\n')):
            (fakebin / name).write_text(body)
            (fakebin / name).chmod(0o755)
        self.env = dict(os.environ, HOME=str(self.home), PATH=str(fakebin)+':'+os.environ['PATH'], FAKE_RUNTIME=str(self.scratch), PWDEBUG='0', PLAYWRIGHT_HTML_OPEN='never')
        self.unit = self.home / '.config/systemd/user/specweave-switch.service'
        self.wrapper = self.home / '.local/bin/specweave-switch'
        self.receipt = self.home / '.local/share/specweave/subscription-switch/install-receipt.json'

    def tearDown(self):
        self.temp.cleanup()

    def install(self, update=False, **environment):
        module = load('linux_installer_' + str(len(self.calls())), self.script)
        args = type('Args', (), dict(node=str(self.node), update=update, service=True, domain=None))()
        with mock.patch.dict(os.environ, dict(self.env, **environment)), \
                mock.patch.object(module.platform, 'system', return_value='Linux'), \
                mock.patch.object(module.pathlib.Path, 'home', return_value=self.home):
            return module.install(args)

    def calls(self):
        log = self.scratch / 'calls.jsonl'
        return [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []

    def test_fresh_install_writes_user_unit_and_enables_linger(self):
        receipt = self.install()
        self.assertEqual(receipt['serviceDomain'], 'systemd-user')
        release = pathlib.Path(receipt['release'])
        text = self.unit.read_text()
        self.assertIn('ExecStart=' + str(self.node.resolve()) + ' ' + str(release / 'bin/specweave-switch.mjs') + ' serve --port 8318\n', text)
        for line in ('Restart=always\n', 'WorkingDirectory=' + str(release) + '\n', 'Environment=PWDEBUG=0\n', 'Environment=PLAYWRIGHT_HTML_OPEN=never\n',
                     'StandardOutput=append:' + str(release.parent.parent / 'logs/stdout.log') + '\n', 'WantedBy=default.target\n'):
            self.assertIn(line, text)
        self.assertEqual(self.unit.stat().st_mode & 0o777, 0o600)
        self.assertFalse((self.home / 'Library').exists())
        names = [call[:3] for call in self.calls()]
        self.assertIn(['systemctl', '--user', 'daemon-reload'], names)
        self.assertIn(['systemctl', '--user', 'enable'], names)
        self.assertIn(['loginctl', 'enable-linger', pwd_name()], [call[:3] for call in self.calls()])
        self.assertFalse(any(call[0] == 'launchctl' for call in self.calls()))
        self.assertTrue(json.loads((self.scratch / 'systemd.json').read_text())['active'])

    def test_update_swaps_unit_to_new_release(self):
        first = self.install()
        (self.source / 'bin/specweave-switch.mjs').write_text('// synthetic linux bundle v2\n')
        second = self.install(update=True)
        self.assertNotEqual(first['release'], second['release'])
        self.assertIn(second['release'] + '/bin/specweave-switch.mjs', self.unit.read_text())
        self.assertIn(['systemctl', '--user', 'disable', '--now', 'specweave-switch.service'], self.calls())
        self.assertTrue(json.loads((self.scratch / 'systemd.json').read_text())['active'])
        self.assertTrue(pathlib.Path(first['release']).is_dir())

    def test_start_failure_rolls_back_fresh_install(self):
        with self.assertRaises(subprocess.CalledProcessError):
            self.install(FAKE_START_FAIL='1')
        self.assertFalse(self.unit.exists())
        self.assertFalse(self.wrapper.exists())
        self.assertFalse(self.receipt.exists())
        state = json.loads((self.scratch / 'systemd.json').read_text())
        self.assertEqual([state['active'], state['enabled'], state['loaded']], [False, False, None])

    def test_missing_user_manager_or_existing_unit_installs_nothing(self):
        with self.assertRaisesRegex(ValueError, 'No systemd user manager'):
            self.install(FAKE_NO_USER_MANAGER='1')
        self.assertFalse(self.wrapper.exists())
        self.unit.parent.mkdir(parents=True)
        self.unit.write_text('[Service]\nExecStart=/somebody/else\n')
        with self.assertRaisesRegex(ValueError, 'Existing companion service preserved'):
            self.install()
        self.assertEqual(self.unit.read_text(), '[Service]\nExecStart=/somebody/else\n')

    def test_linger_refusal_is_reported_not_fatal(self):
        stderr = io.StringIO()
        with mock.patch.object(sys, 'stderr', stderr):
            receipt = self.install(FAKE_LINGER_STATUS='1')
        self.assertEqual(receipt['serviceDomain'], 'systemd-user')
        self.assertIn('sudo loginctl enable-linger', stderr.getvalue())

    def test_unit_rejects_paths_systemd_would_split(self):
        with self.assertRaisesRegex(ValueError, 'systemd unit'):
            installer.systemd_unit(pathlib.Path('/opt/my node/bin/node'), pathlib.Path('/r'), pathlib.Path('/root'))
        with self.assertRaisesRegex(ValueError, 'systemd unit'):
            installer.systemd_unit(pathlib.Path('/opt/node/bin/node'), pathlib.Path('/r/%h'), pathlib.Path('/root'))


def pwd_name():
    import pwd
    return pwd.getpwuid(os.getuid()).pw_name


if __name__=='__main__':
    unittest.main(verbosity=2)
