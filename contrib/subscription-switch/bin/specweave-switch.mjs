#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { stateRoot, ensureState, initState, mutateState, findBinary } from '../lib/state.mjs';
import { publicState, recommend, setPolicy, selectAccount, validateQuota, QUOTA_TTL_MS } from '../lib/policy.mjs';
import { refresh, nativeEnv, inspectAuth } from '../lib/native.mjs';
import { run } from '../lib/runner.mjs';
import { checkpoint, restore } from '../lib/checkpoint.mjs';
import { execute, redact, iso } from '../lib/util.mjs';
import { serve } from '../lib/server.mjs';

const usage = `SpecWeave Switch — native account selection and isolated Git restoration

init                       Create seven profile slots; preserve native auth/config
status                     Current profile, quota, host and run observations (JSON)
refresh                    Native auth and supported Codex quota readback (JSON)
policy MODE [--provider codex|claude|any]
select ACCOUNT|automatic   Prefer this account or return to automatic routing
recommend [--provider PROVIDER] [--account ID --allow-unknown]
account login ID           Launch native interactive sign-in for this profile
account observe ID --quota JSON
                           Manual observation: window/weekly usedPercent,resetsAt;
                           clearly sourced, expires after 15 minutes
run --prompt TEXT [--cwd PATH] [--account ID --allow-unknown]
    [--provider codex|claude] [--model ID] [--timeout-ms 120000]
    [--failover --max-attempts 3 --files src/a.js,src/b.js]
    [--sandbox read-only|workspace-write]
checkpoint --cwd PATH --files src/a.js,src/b.js
restore ID --to NEW_PATH [--base EXPECTED_SHA]
doctor                     Read-only versions, native auth/quota and service probes
serve [--port 8318]         Loopback dashboard; state/policy/select/refresh only

State: SPECWEAVE_SWITCH_STATE or ~/.local/share/specweave/switch
Native credentials remain in CODEX_HOME / CLAUDE_CONFIG_DIR. No HOME changes.
Automatic failover is read-only and begins only after the prior process exits.
Dirty tracked changes need an explicit file allowlist; untracked files are excluded.
`;
function parse(argv) {
  const values = {}, positionals = [];
  const flags = new Set(['allow-unknown', 'failover']);
  const options = new Set(['cwd', 'prompt', 'account', 'provider', 'model', 'timeout-ms', 'max-attempts', 'files', 'sandbox', 'to', 'base', 'port', 'quota']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const key = arg.slice(2);
    if (flags.has(key)) { values[key] = true; continue; }
    if (!options.has(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Unknown or missing option: ${arg}`);
    values[key] = argv[++i];
  }
  return { values, positionals };
}
const out = value => process.stdout.write(JSON.stringify(value, null, 2) + '\n');
async function main(argv) {
  if (!argv.length || argv.includes('--help') || argv[0] === 'help') { process.stdout.write(usage); return; }
  if (argv[0] === '--version') { process.stdout.write('0.1.0\n'); return; }
  const [command, ...args] = argv, { values: v, positionals: p } = parse(args), root = stateRoot();
  if (command === 'init') { out(publicState(await initState(root))); return; }
  const state = await ensureState(root);
  if (command === 'status') out(publicState(state));
  else if (command === 'refresh') out(publicState(await refresh(root)));
  else if (command === 'policy') out(publicState(await mutateState(root, s => setPolicy(s, { mode: p[0], ...(v.provider ? { preferredProvider: v.provider === 'any' ? null : v.provider } : {}) }))));
  else if (command === 'select') out(publicState(await mutateState(root, s => selectAccount(s, { id: ['automatic', 'auto'].includes(p[0]) ? null : p[0] }))));
  else if (command === 'recommend') out(recommend(state, { provider: v.provider, accountId: v.account, allowUnknown: !!v['allow-unknown'] }));
  else if (command === 'account') {
    const account = state.accounts.find(a => a.id === p[1]); if (!account) throw new Error('Unknown profile');
    if (p[0] === 'login') {
      const binary = findBinary(account.provider), args = account.provider === 'codex' ? ['login'] : ['auth', 'login'];
      const observed = await inspectAuth({ ...account, binary });
      await mutateState(root, s => Object.assign(s.accounts.find(a => a.id === account.id), observed));
      if (observed.authError === 'profile-isolation-unverified') throw new Error('Claude profile isolation is unverified: native oauth_token status may reuse the default keychain login. Sign-in for this isolated slot is blocked until a supported independent profile binding is verified; authenticate a supported consumer subscription in the native default claude-1 profile instead. Native sign-in was not started.');
      const child = spawn(binary, args, { env: nativeEnv(account), stdio: 'inherit' });
      const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
      process.exitCode = code || 0;
      if (code === 0) out(publicState(await refresh(root)));
    } else if (p[0] === 'observe') {
      if (!v.quota) throw new Error('Manual observation requires --quota JSON');
      const observation = JSON.parse(v.quota), now = Date.now();
      if (!observation || Object.keys(observation).some(k => !['window', 'weekly'].includes(k))) throw new Error('Manual quota only accepts window and weekly');
      const quota = validateQuota({ window: observation.window || null, weekly: observation.weekly || null, observedAt: new Date(now).toISOString(), expiresAt: new Date(now + QUOTA_TTL_MS).toISOString(), source: 'manual' });
      out(publicState(await mutateState(root, s => { s.accounts.find(a => a.id === account.id).quota = quota; })));
    } else throw new Error('Use account login or account observe');
  } else if (command === 'run') {
    let prompt = v.prompt;
    if (!prompt) { prompt = ''; for await (const chunk of process.stdin) { prompt += chunk.toString(); if (prompt.length > 128 * 1024) throw new Error('Prompt input exceeds 128 KiB'); } }
    const result = await run(root, { cwd: v.cwd, prompt, accountId: v.account, provider: v.provider, allowUnknown: !!v['allow-unknown'], model: v.model, sandbox: v.sandbox,
      timeoutMs: v['timeout-ms'] ? Number(v['timeout-ms']) : undefined, failover: !!v.failover, maxAttempts: v['max-attempts'] ? Number(v['max-attempts']) : undefined, files: v.files?.split(',') || [] });
    out(result); if (result.status !== 'success') process.exitCode = 1;
  } else if (command === 'checkpoint') out(await checkpoint(root, v.cwd || process.cwd(), v.files?.split(',') || []));
  else if (command === 'restore') { if (!v.to) throw new Error('Restore requires --to NEW_PATH'); out(await restore(root, p[0], v.to, { expectedBase: v.base })); }
  else if (command === 'doctor') {
    const versions = await Promise.all(['codex', 'claude'].map(async provider => {
      const binary = findBinary(provider), result = await execute(binary, ['--version'], { timeoutMs: 5000 });
      return { provider, binary, version: result.exitCode === 0 ? result.stdout.trim() : null, status: result.exitCode === 0 ? 'available' : 'unavailable' };
    }));
    out({ checkedAt: iso(), node: process.version, stateRoot: root, providers: versions, state: publicState(await refresh(root)), notes: ['Quota unknown means unavailable, not zero usage', 'Worker TCP/SSH reachability is not authenticated installation proof', 'App installation does not prove Tailscale connection'] });
    if (versions.some(v => v.status !== 'available')) process.exitCode = 1;
  } else if (command === 'serve') {
    const port = v.port ? Number(v.port) : 8318; if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
    const server = await serve(root, { port }); process.stdout.write(`SpecWeave Switch: http://127.0.0.1:${server.address().port}\n`);
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close(() => process.exit(0)));
  } else throw new Error(`Unknown command: ${command}`);
}
main(process.argv.slice(2)).catch(error => { process.stderr.write(redact(error.message) + '\n'); process.exitCode = 1; });
