import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, rename, open, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { spawn } from 'node:child_process';

export const iso = () => new Date().toISOString();
export const id = () => randomUUID();
export const hash = data => createHash('sha256').update(data).digest('hex');
export const SECRET = /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|\b(?:sk-(?:ant-|proj-|or-v1-)?[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,})\b|\b(?:api[_-]?key|(?:access|refresh|auth)[_-]?token|client[_-]?secret|secret[_-]?key|secret|password|token)(?:\\*["'])?\s*[=:]\s*(?:\\*["'])?[^\s"'\\]{8,}|\bBearer\s+[A-Za-z0-9._~+/-]{12,}/i;
export function redact(text) {
  return String(text).replace(/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z ]+ )?PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/\b(?:sk-(?:ant-|proj-|or-v1-)?[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,})\b/g, '[REDACTED]')
    .replace(/((?:api[_-]?key|(?:access|refresh|auth)[_-]?token|client[_-]?secret|secret[_-]?key|secret|password|token)(?:\\*["'])?\s*[=:]\s*(?:\\*["'])?)[^\s"',}\\]+/gi, '$1[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]{8,}/gi, 'Bearer [REDACTED]');
}
const sensitiveKey = /^(?:api[_-]?key|(?:access|refresh|auth)[_-]?token|client[_-]?secret|secret[_-]?key|secret|password|token)$/i;
function redactValue(value, depth = 0) {
  if (depth > 20) return '[REDACTED: nesting limit]';
  if (typeof value === 'string') {
    const cleaned = redact(value);
    if (/^\s*[\[{]/.test(cleaned)) { try { return JSON.stringify(redactValue(JSON.parse(cleaned), depth + 1)); } catch {} }
    return cleaned;
  }
  if (Array.isArray(value)) return value.map(v => redactValue(v, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sensitiveKey.test(k) ? '[REDACTED]' : redactValue(v, depth + 1)]));
  return value;
}
// Parse real native NDJSON envelopes before sanitizing model text. Escaped JSON
// inside item.text is not a plain credential assignment in the raw outer line.
export function redactNativeOutput(text) {
  return String(text).split('\n').map(line => {
    try { return JSON.stringify(redactValue(JSON.parse(line))); } catch { return redact(line); }
  }).join('\n');
}
export async function atomicJSON(file, value) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${id()}.tmp`;
  try { await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); await rename(tmp, file); }
  finally { await unlink(tmp).catch(() => {}); }
}
export async function withLock(file, fn) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  let handle;
  try { handle = await open(file, 'wx', 0o600); }
  catch (e) { if (e.code === 'EEXIST') throw new Error('State is busy; retry after the current operation finishes'); throw e; }
  try { await handle.writeFile(JSON.stringify({ pid: process.pid, at: iso() })); return await fn(); }
  finally { await handle.close(); await unlink(file).catch(() => {}); }
}
// Bounded native subprocess. Resolve only after close: a timeout never permits a
// replacement account to start while its previous process still has open pipes.
export function execute(binary, args, { cwd, env = process.env, timeoutMs = 15000, input, maxBytes = 4 * 1024 * 1024 } = {}) {
  return new Promise(resolve => {
    let stdout = '', stderr = '', timedOut = false, truncated = false, error = null;
    let child;
    try { child = spawn(binary, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { resolve({ exitCode: null, stdout: '', stderr: redact(e.message), error: e.code, timedOut: false }); return; }
    let hardTimer;
    const stop = () => { child.kill('SIGTERM'); hardTimer = setTimeout(() => child.kill('SIGKILL'), 1500); hardTimer.unref(); };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    const append = key => data => {
      if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) + data.length > maxBytes) { if (!truncated) { truncated = true; stop(); } return; }
      if (key === 'stdout') stdout += data.toString(); else stderr += data.toString();
    };
    child.stdout.on('data', append('stdout')); child.stderr.on('data', append('stderr'));
    child.on('error', e => { error = e.code || e.message; stderr += e.message; });
    child.on('close', (code, signal) => { clearTimeout(timer); clearTimeout(hardTimer); resolve({ exitCode: code, signal, stdout: redactNativeOutput(stdout), stderr: redactNativeOutput(stderr), timedOut, truncated, error }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
