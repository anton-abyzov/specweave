import { realpath, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureState, mutateState } from './state.mjs';
import { accountStatus, recommend } from './policy.mjs';
import { nativeEnv, nativeRunArgs } from './native.mjs';
import { execute, atomicJSON, hash, id, iso, redact } from './util.mjs';
import { checkpoint, dirtyTracked, repository } from './checkpoint.mjs';

export async function acquireLease(root, cwd) {
  const canonical = await realpath(cwd);
  await mkdir(join(root, 'leases'), { recursive: true, mode: 0o700 });
  const file = join(root, 'leases', hash(canonical) + '.json'), token = id();
  let handle;
  try { handle = await open(file, 'wx', 0o600); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('Workspace already has an exclusive lease; inspect the owning run before any recovery'); throw e; }
  await handle.writeFile(JSON.stringify({ token, pid: process.pid, cwd: canonical, at: iso() })); await handle.close();
  return { cwd: canonical, release: async () => {
    const lease = JSON.parse(await readFile(file, 'utf8'));
    if (lease.token !== token) throw new Error('Lease owner changed; refusing release');
    await unlink(file);
  } };
}
export function classifyOutcome(result, provider) {
  if (result.timedOut) return { status: 'timed-out', error: 'Native run exceeded its timeout', model: null };
  if (result.error || result.truncated) return { status: 'failed', error: result.error || 'Native output exceeded its bounded limit', model: null };
  let completed = false, failed = result.exitCode !== 0, errorText = '', model = null;
  for (const line of result.stdout.split('\n')) {
    let event; try { event = JSON.parse(line); } catch { continue; }
    if (typeof event.model === 'string') model = event.model;
    if (provider === 'codex' && event.type === 'turn.completed') completed = true;
    if (provider === 'claude' && event.type === 'result' && event.subtype === 'success' && event.is_error !== true) completed = true;
    if (event.type === 'turn.failed' || event.type === 'error' || event.is_error === true || (event.type === 'result' && event.subtype?.startsWith('error'))) {
      failed = true; errorText += ` ${event.error?.message || event.message || event.result || event.error?.code || event.subtype || ''}`;
    }
  }
  if (failed && !errorText) errorText = result.stderr || result.stdout;
  if (failed && /\b(?:429|usage_limit_reached|rate_limit_exceeded|rate_limit_error)\b|(?:hit|reached|exceeded|exhausted).{0,35}(?:usage|weekly|rate|token|quota).{0,20}limit|(?:usage|weekly|quota).{0,20}(?:limit|exhausted)/i.test(errorText)) return { status: 'quota-exhausted', error: redact(errorText.trim().slice(0, 500)), model };
  if (failed || !completed) return { status: 'failed', error: redact(errorText.trim().slice(0, 500)) || 'Native process did not report a completed successful turn', model };
  return { status: 'success', error: null, model };
}
export function managedPrompt(prompt, sandbox) {
  return `Managed execution rules: All automated browser tests, screenshots, scrapers and delegated browser runs must explicitly use headless: true (Python headless=True). Keep PWDEBUG=0 and PLAYWRIGHT_HTML_OPEN=never and HTML reporters open:'never'. Save evidence to files. Do not open a personal/visible browser. Preserve unrelated work, native credentials and other sessions. This run uses ${sandbox}; obey the native permission boundary. A denied operation remains denied.\n\nUser task:\n${prompt}`;
}
export async function run(root, { cwd = process.cwd(), prompt, accountId, provider, allowUnknown = false, model, sandbox = 'read-only', timeoutMs = 120000, failover = false, maxAttempts = 3, files = [] } = {}) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 128 * 1024) throw new Error('Run requires a bounded nonempty prompt');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30 * 60 * 1000) throw new Error('Run timeout must be 1000-1800000 ms');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 7) throw new Error('Run attempts must be 1-7');
  if (failover && sandbox !== 'read-only') throw new Error('Automatic failover currently supports read-only runs; write runs require explicit checkpoint/restore and resume');
  const repo = await repository(cwd); // use the repository root as the lease scope
  const lease = await acquireLease(root, repo.root);
  const groupId = id(), attempts = [], excluded = [];
  let savedCheckpoint = null;
  try {
    for (let attempt = 0; attempt < (failover ? maxAttempts : 1); attempt++) {
      const state = await ensureState(root);
      const selectionState = attempt > 0 ? { ...state, policy: { ...state.policy, selectedAccount: null } } : state;
      const chosen = recommend(selectionState, { provider, accountId: attempt === 0 ? accountId : undefined, allowUnknown: attempt === 0 && allowUnknown, exclude: excluded });
      if (!chosen.id) {
        if (attempts.length) return { id: groupId, status: attempts.at(-1).status, attempts, checkpointId: savedCheckpoint?.id || null, stoppedReason: chosen.reason };
        throw new Error(chosen.reason);
      }
      const account = state.accounts.find(a => a.id === chosen.id), runId = id();
      const record = { id: runId, groupId, accountId: account.id, provider: account.provider, cwd: lease.cwd, startedAt: iso(), endedAt: null, status: 'running', exitCode: null, model: null, requestedModel: model || null, sandbox, checkpointId: savedCheckpoint?.id || null };
      await mutateState(root, current => {
        const present = current.accounts.find(a => a.id === account.id);
        const status = present && accountStatus(present, current.runs);
        if (!present || present.authenticated !== true || !['ready', ...(attempt === 0 && allowUnknown && accountId === account.id ? ['unknown'] : [])].includes(status)) throw new Error('Profile became unavailable before launch');
        current.runs.push(record);
      });
      let result, outcome;
      try {
        const args = nativeRunArgs(account, prompt, { model, sandbox });
        result = await execute(account.binary, args, { cwd: lease.cwd, env: nativeEnv(account), timeoutMs, input: managedPrompt(prompt, sandbox) + '\n' });
        outcome = classifyOutcome(result, account.provider);
      } catch (error) { result = { exitCode: null, stdout: '', stderr: '', error: error.message }; outcome = { status: 'failed', error: redact(error.message), model: null }; }
      await atomicJSON(join(root, 'runs', `${runId}.json`), { ...record, ...outcome, endedAt: iso(), exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr, timedOut: !!result.timedOut });
      await mutateState(root, current => {
        const r = current.runs.find(r => r.id === runId); Object.assign(r, outcome, { endedAt: iso(), exitCode: result.exitCode });
        if (outcome.status === 'quota-exhausted') current.accounts.find(a => a.id === account.id).lastQuotaErrorAt = r.endedAt;
      });
      attempts.push({ id: runId, accountId: account.id, provider: account.provider, ...outcome, exitCode: result.exitCode });
      excluded.push(account.id);
      if (outcome.status !== 'quota-exhausted' || !failover || attempt + 1 >= maxAttempts) return { id: groupId, status: outcome.status, attempts, checkpointId: savedCheckpoint?.id || null };
      // execute resolves after close, so the prior native process has fully
      // exited. Preserve dirty tracked files before selecting a new account.
      const dirty = await dirtyTracked(repo.root);
      if (dirty.length) {
        if (!files.length) return { id: groupId, status: outcome.status, attempts, stoppedReason: 'Dirty tracked changes require an explicit --files allowlist before failover' };
        try { savedCheckpoint = await checkpoint(root, repo.root, files); }
        catch (error) { return { id: groupId, status: outcome.status, attempts, stoppedReason: redact(`Checkpoint failed; failover stopped: ${error.message}`) }; }
        await mutateState(root, current => { current.runs.find(r => r.id === runId).checkpointId = savedCheckpoint.id; });
      }
    }
  } finally { await lease.release(); }
}
