// Machine-onboarding shell scripts, run against a temporary HOME. Nothing here
// downloads, binds 8317/8318 or talks to launchd/systemd: fakes stand in for them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const scripts = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');

async function sandbox(t) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'sw-scripts-test-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const home = join(base, 'home'), fakebin = join(base, 'fakebin');
  await mkdir(home); await mkdir(fakebin);
  return { base, home, fakebin };
}

function run(script, args, env) {
  return new Promise(resolve => {
    // TMPDIR inside the sandbox keeps the scripts' own mktemp folders out of /tmp.
    const child = spawn('bash', [join(scripts, script), ...args], { env: { PATH: process.env.PATH, TMPDIR: dirname(env.HOME), PWDEBUG: '0', PLAYWRIGHT_HTML_OPEN: 'never', ...env } });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function which(name) {
  for (const dir of process.env.PATH.split(':')) {
    try { await stat(join(dir, name)); return join(dir, name); } catch {}
  }
  throw new Error(`${name} not on PATH`);
}

async function proxyInstall(home, port, key) {
  const root = join(home, '.local/share/specweave/proxy');
  for (const dir of ['auth', 'secrets', 'bin']) await mkdir(join(root, dir), { recursive: true });
  const config = `config-version: 8\nserver:\n  host: "127.0.0.1"\n  port: ${port}\n`;
  await writeFile(join(root, 'config.yaml'), config, { mode: 0o600 });
  await writeFile(join(root, 'secrets/client-key.txt'), key + '\n', { mode: 0o600 });
  await writeFile(join(root, 'auth/codex-synthetic.json'), '{"synthetic":true}\n', { mode: 0o600 });
  return { root, config };
}

async function listen(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return server.address().port;
}

test('install-cliproxy --if-missing leaves a running install, its keys and its auth folder untouched', async t => {
  const { base, home, fakebin } = await sandbox(t);
  const key = 'syntheticclientkey0123456789abcdefABCDEF0123456789';
  const port = await listen(t, (req, res) => { res.writeHead(req.headers.authorization === `Bearer ${key}` ? 200 : 401); res.end('{"data":[]}'); });
  const { root, config } = await proxyInstall(home, port, key);
  // Real curl behind a logging wrapper: the header file must work, and argv must not hold the key.
  const log = join(base, 'curl.log');
  await writeFile(join(fakebin, 'curl'), `#!/bin/bash\necho "$*" >> ${JSON.stringify(log)}\nexec ${JSON.stringify(await which('curl'))} "$@"\n`, { mode: 0o755 });
  const result = await run('install-cliproxy.sh', ['--if-missing'], { HOME: home, PATH: `${fakebin}:${process.env.PATH}` });
  assert.equal(result.code, 0, result.stderr);
  const argv = await readFile(log, 'utf8');
  assert.match(argv, /--max-time 5 /);
  assert.ok(!argv.includes(key), 'client key never on curl argv');
  assert.match(result.stdout, new RegExp(`already installed and running on 127\\.0\\.0\\.1:${port}; left as is\\. Accounts: 1\\.`));
  assert.ok(!result.stdout.includes(key) && !result.stderr.includes(key), 'client key never printed');
  assert.equal(await readFile(join(root, 'config.yaml'), 'utf8'), config);
  assert.equal(await readFile(join(root, 'auth/codex-synthetic.json'), 'utf8'), '{"synthetic":true}\n');
  assert.deepEqual(await readdir(join(root, 'bin')), [], 'no binary downloaded or replaced');
  assert.deepEqual((await readdir(home)).sort(), ['.local']);
});

test('install-cliproxy --if-missing refuses an install that does not answer its own key', async t => {
  const { home } = await sandbox(t);
  const port = await listen(t, (req, res) => { res.writeHead(401); res.end(); });
  const { root, config } = await proxyInstall(home, port, 'syntheticotherkey');
  const result = await run('install-cliproxy.sh', ['--if-missing'], { HOME: home });
  assert.equal(result.code, 3);
  assert.match(result.stderr, /installed .* but does not answer .*HTTP 401/);
  assert.equal(await readFile(join(root, 'config.yaml'), 'utf8'), config);
  assert.equal(await readFile(join(root, 'auth/codex-synthetic.json'), 'utf8'), '{"synthetic":true}\n');
});

test('install-cliproxy on Linux writes a loopback systemd user unit and enables linger', async t => {
  const { base, home, fakebin } = await sandbox(t);
  const log = join(base, 'calls.log');
  const fake = (name, body) => writeFile(join(fakebin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  await fake('uname', 'case "$1" in -s) echo Linux;; -m) echo x86_64;; *) echo Linux;; esac');
  await fake('systemctl', `echo "systemctl $*" >> ${JSON.stringify(log)}`);
  await fake('loginctl', `echo "loginctl $*" >> ${JSON.stringify(log)}`);
  await fake('launchctl', `echo "launchctl $*" >> ${JSON.stringify(log)}; exit 1`);
  // Stand-in for the started service: keyed requests answer 200, unkeyed 401.
  // The header arrives as -H @FILE, so look inside the file; a key on argv would fail this test.
  await fake('curl', `echo "curl $*" >> ${JSON.stringify(log)}; for a in "$@"; do case "$a" in @*) grep -q '^Authorization: Bearer ' "\${a#@}" && { echo -n 200; exit 0; };; esac; done; echo -n 401`);
  const release = join(base, 'release');
  await mkdir(join(release, 'bin'), { recursive: true });
  await writeFile(join(release, 'bin/cli-proxy-api'), '#!/bin/sh\necho "CLIProxyAPI Version: 8.0.17, Commit: synthetic"\n', { mode: 0o755 });
  // --force only because this Mac's real proxy may already hold 8317; the sandbox HOME is empty.
  const result = await run('install-cliproxy.sh', ['--from-dir', release, '--force'], { HOME: home, PATH: `${fakebin}:${process.env.PATH}` });
  assert.equal(result.code, 0, result.stderr);
  const root = join(home, '.local/share/specweave/proxy');
  const unit = await readFile(join(home, '.config/systemd/user/specweave-cliproxy.service'), 'utf8');
  assert.match(unit, new RegExp(`^ExecStart=${root}/bin/cli-proxy-api -config ${root}/config.yaml -local-model$`, 'm'));
  assert.match(unit, /^Restart=always$/m);
  assert.match(unit, /^WantedBy=default\.target$/m);
  assert.match(await readFile(join(root, 'config.yaml'), 'utf8'), /host: "127\.0\.0\.1"\n {2}port: 8317\n/);
  const calls = (await readFile(log, 'utf8')).trim().split('\n');
  assert.deepEqual(calls.filter(c => c.startsWith('systemctl')), ['systemctl --user daemon-reload', 'systemctl --user enable specweave-cliproxy.service', 'systemctl --user restart specweave-cliproxy.service']);
  assert.ok(calls.some(c => c.startsWith('loginctl enable-linger ')));
  assert.ok(!calls.some(c => c.startsWith('launchctl')));
  await assert.rejects(stat(join(home, 'Library')), 'no launchd agent on Linux');
  const keyFile = (await readFile(join(root, 'secrets/client-key.txt'), 'utf8')).trim();
  assert.equal(keyFile.length, 48);
  assert.ok(!result.stdout.includes(keyFile) && !result.stderr.includes(keyFile), 'client key never printed');
  const curls = calls.filter(c => c.startsWith('curl '));
  assert.ok(curls.length >= 2 && curls.every(c => c.includes('--max-time 5')), 'every local probe is time-limited');
  assert.ok(!calls.some(c => c.includes(keyFile)), 'client key never on curl argv');
  assert.match(result.stdout, /running on 127\.0\.0\.1:8317 \(keyed request 200, unkeyed 401\)\. Accounts: 0\./);
});

test('worker-bootstrap accepts any fleet id plus --no-proxy and rejects anything else before installing', async t => {
  const { home } = await sandbox(t);
  for (const [args, pattern] of [[[], /Usage/], [['M1'], /Usage/], [['local'], /Usage/], [['linux1', '--proxy'], /Unknown option/]]) {
    const result = await run('worker-bootstrap.sh', args, { HOME: home });
    assert.equal(result.code, 2, args.join(' '));
    assert.match(result.stderr, pattern);
  }
  const unverified = await run('worker-bootstrap.sh', ['linux1', '--no-proxy'], { HOME: home });
  assert.equal(unverified.code, 2);
  assert.match(unverified.stderr, /SPECWEAVE_WORKER_HOST/);
  assert.deepEqual(await readdir(home), [], 'nothing written before the identity check');
});

test('add-machine validates its arguments and its dry run names every step', async t => {
  const { home } = await sandbox(t);
  for (const args of [['m1', 'M1'], ['M1', 'M1', 'a@b', '1'], ['m1', 'M1', 'a@b', '7'], ['m1', 'M1', 'nohost', '1'], ['m1', 'M1', 'a@b', '1', '--pin', 'MD5:xx'], ['m1', 'M1', 'a@b', '1', '--wat']]) {
    const result = await run('add-machine.sh', args, { HOME: home });
    assert.equal(result.code, 2, args.join(' '));
  }
  const plan = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.168.40.150', '3', '--dry-run', '--pin', 'SHA256:' + 'A'.repeat(43)], { HOME: home });
  assert.equal(plan.code, 0, plan.stderr);
  for (const step of [/Pin 192\.168\.40\.150 .* SHA256:A{43}/, /fleet key logs in to anton@192\.168\.40\.150/, /worker-bootstrap\.sh linux1 \(with CLIProxyAPI\)/, /add-peer\.sh linux1 "Linux server" anton@192\.168\.40\.150 3 \(tunnel 127\.0\.0\.1:38318/]) assert.match(plan.stdout, step);
  assert.deepEqual(await readdir(home), [], 'a dry run writes nothing');
});

test('worker-bootstrap is executable, as the README runs it directly', async () => {
  assert.ok((await stat(join(scripts, 'worker-bootstrap.sh'))).mode & 0o100);
});

// add-machine past its argument checks: a stand-in ssh answers the login and the probe, and
// fails loudly on anything else, so none of these runs reach the copy or the bootstrap.
async function machineSandbox(t, { probe = 'Linux\nx86_64\nanton\nsrv1\ncurl\n', login = '', loginCode = 0, tunnels = {} } = {}) {
  const { base, home, fakebin } = await sandbox(t);
  const fleet = join(home, '.local/share/specweave/fleet');
  await mkdir(fleet, { recursive: true });
  await writeFile(join(fleet, 'id_ed25519'), 'synthetic\n', { mode: 0o600 });
  const agents = join(home, 'Library/LaunchAgents');
  await mkdir(agents, { recursive: true });
  for (const [id, target] of Object.entries(tunnels)) {
    await writeFile(join(agents, `com.specweave.switch.tunnel-${id}.plist`), `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>Label</key><string>com.specweave.switch.tunnel-${id}</string><key>ProgramArguments</key><array><string>/usr/bin/ssh</string><string>-N</string><string>${target}</string></array></dict></plist>\n`);
  }
  const log = join(base, 'ssh.log');
  await writeFile(join(base, 'probe.txt'), probe);
  await writeFile(join(base, 'login.txt'), login);
  const ssh = join(fakebin, 'ssh');
  await writeFile(ssh, `#!/bin/bash\ncmd="\${@: -1}"; echo "$cmd" >> ${JSON.stringify(log)}\ncase "$cmd" in\n  true) cat ${JSON.stringify(join(base, 'login.txt'))} >&2; exit ${loginCode};;\n  "uname -s; uname -m;"*) cat ${JSON.stringify(join(base, 'probe.txt'))};;\n  *) echo "unexpected remote command" >&2; exit 99;;\nesac\n`, { mode: 0o755 });
  const env = { HOME: home, SPECWEAVE_FLEET_SSH: ssh, PATH: `${fakebin}:${process.env.PATH}` };
  const calls = async () => (await readFile(log, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
  return { base, home, fleet, fakebin, env, calls };
}

const onMac = process.platform === 'darwin' ? {} : { skip: 'add-machine runs on the main Mac only' };

test('add-machine stops with a message when the worker has no curl', onMac, async t => {
  const m = await machineSandbox(t, { probe: 'Linux\nx86_64\nanton\nsrv1\nnocurl\n' });
  const result = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.0.2.10', '3', '--expect-host', 'srv1'], m.env);
  assert.equal(result.code, 2, result.stderr);
  assert.match(result.stderr, /Install curl on anton@192\.0\.2\.10 first/);
  assert.equal((await m.calls()).length, 2, 'login and probe only');
});

test('add-machine tells an offline machine apart from a missing pin or a rejected key', onMac, async t => {
  const cases = [
    ['ssh: connect to host 192.0.2.10 port 22: Operation timed out', /Cannot reach anton@192\.0\.2\.10.*Nothing was changed[\s\S]*Operation timed out/],
    ['No ED25519 host key is known for 192.0.2.10 and you have requested strict checking.\nHost key verification failed.', /host key is not pinned .* Rerun with --pin/],
    ['anton@192.0.2.10: Permission denied (publickey).', /rejected the fleet key\. Authorize it once: ssh-copy-id/],
  ];
  for (const [login, pattern] of cases) {
    const m = await machineSandbox(t, { login, loginCode: 255, tunnels: { m1: 'anton@192.0.2.10' } });
    const result = await run('add-machine.sh', ['m1', 'M1 Max', 'anton@192.0.2.10', '1'], m.env);
    assert.equal(result.code, 3, login);
    assert.match(result.stderr, pattern);
    if (!login.includes('Host key')) assert.doesNotMatch(result.stderr, /--pin/, login);
    if (!login.includes('Permission')) assert.doesNotMatch(result.stderr, /ssh-copy-id/, login);
  }
});

test('add-machine needs --expect-host for a new machine and refuses a hostname or user mismatch', onMac, async t => {
  let m = await machineSandbox(t);
  let result = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.0.2.10', '3'], m.env);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /no tunnel-linux1 .* Pass --expect-host/);
  assert.deepEqual(await m.calls(), [], 'nothing sent to the worker');

  m = await machineSandbox(t, { probe: 'Darwin\narm64\nanton\nMacBookPro\ncurl\n' });
  result = await run('add-machine.sh', ['m5', 'Mac mini', 'anton@192.0.2.10', '3', '--expect-host', 'Mac-mini'], m.env);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /anton@192\.0\.2\.10 is MacBookPro, not Mac-mini; nothing was changed there\./);
  assert.equal((await m.calls()).length, 2, 'login and probe only');

  m = await machineSandbox(t, { probe: 'Linux\nx86_64\nroot\nsrv1\ncurl\n' });
  result = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.0.2.10', '3', '--expect-host', 'srv1'], m.env);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /logged in as root, not anton/);
});

test('add-machine refuses an address another tunnel already uses', onMac, async t => {
  const m = await machineSandbox(t, { tunnels: { m1: 'anton@192.0.2.10', m3: 'antonabyzov@192.0.2.20' } });
  const result = await run('add-machine.sh', ['m5', 'Mac mini', 'anton@192.0.2.10', '3', '--expect-host', 'Mac-mini'], m.env);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /192\.0\.2\.10 is already connected as m1/);
  assert.deepEqual(await m.calls(), [], 'nothing sent to the worker');
});

test('add-machine --pin refuses a stale entry with another key instead of calling it pinned', onMac, async t => {
  const m = await machineSandbox(t);
  const keys = join(m.base, 'keys');
  await mkdir(keys);
  for (const name of ['old', 'new']) {
    await new Promise((resolve, reject) => spawn('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', join(keys, name)]).on('close', c => c ? reject(new Error('ssh-keygen')) : resolve()));
  }
  const line = async name => '192.0.2.10 ' + (await readFile(join(keys, `${name}.pub`), 'utf8')).split(' ').slice(0, 2).join(' ') + '\n';
  const fingerprint = async name => new Promise(resolve => {
    let out = ''; const c = spawn('ssh-keygen', ['-lf', join(keys, `${name}.pub`)]);
    c.stdout.on('data', d => { out += d; }); c.on('close', () => resolve(out.split(' ')[1]));
  });
  await writeFile(join(m.fleet, 'known_hosts'), await line('old'));
  await writeFile(join(m.fakebin, 'ssh-keyscan'), `#!/bin/bash\nprintf '%s\\n' ${JSON.stringify((await line('new')).trim())}\n`, { mode: 0o755 });
  const pin = await fingerprint('new');
  let result = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.0.2.10', '3', '--expect-host', 'srv1', '--pin', pin], m.env);
  assert.equal(result.code, 3);
  assert.match(result.stderr, /already holds a different key for 192\.0\.2\.10[\s\S]*ssh-keygen -R 192\.0\.2\.10/);
  assert.doesNotMatch(result.stdout, /already pinned/);
  assert.equal(await readFile(join(m.fleet, 'known_hosts'), 'utf8'), await line('old'), 'known_hosts untouched');
  assert.deepEqual(await m.calls(), [], 'nothing sent to the worker');

  // With the matching key already there, it is kept and the run goes on to the probe (no curl stops it).
  await writeFile(join(m.fleet, 'known_hosts'), await line('new'));
  await writeFile(join(m.base, 'probe.txt'), 'Linux\nx86_64\nanton\nsrv1\nnocurl\n');
  result = await run('add-machine.sh', ['linux1', 'Linux server', 'anton@192.0.2.10', '3', '--expect-host', 'srv1', '--pin', pin], m.env);
  assert.match(result.stdout, /192\.0\.2\.10 is already pinned; kept the existing entry\./);
  assert.match(result.stderr, /Install curl/);
});
