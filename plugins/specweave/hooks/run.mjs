#!/usr/bin/env node
// SpecWeave hook supervisor: parent deadline remains live while the worker blocks in Git.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const event = process.argv[2];
const worker = path.join(path.dirname(fileURLToPath(import.meta.url)), 'run-worker.mjs');
const budget = event === 'stop' ? 25000 : 7500;
let child, finished = false, input = '', output = '', size = 0;
const started = Date.now();
// Ordinary turns should not resolve npm, import the CLI, or start a second Node
// process. Auto mode is explicit and its small local marker is authoritative.
function hasActiveAutoSession(data) {
  let current = path.resolve(typeof data.cwd === 'string' ? data.cwd : process.cwd());
  for (let depth = 0; depth < 100; depth++) {
    const state = path.join(current, '.specweave', 'state');
    if (existsSync(path.join(current, '.specweave', 'config.json'))) {
      const sessionId = process.env.CLAUDE_SESSION_ID;
      // Match session-state-manager's path-safe IDs, including dots and spaces.
      const scoped = sessionId && !/[/\\]|\.\.|\0/.test(sessionId)
        ? path.join(state, 'sessions', sessionId, 'auto-mode.json') : null;
      const marker = scoped && existsSync(scoped) ? scoped : path.join(state, 'auto-mode.json');
      try { return JSON.parse(readFileSync(marker, 'utf8')).active === true; }
      catch { return false; }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return false;
}
// `specweave task done`/`skip` writes ~/.specweave/close-pending/<session>.json
// when an increment's last task turns terminal; Stop then reminds that session
// once to verify and close it. Only that session spawns the worker: every
// other stop stays on the fast path.
function hasClosePendingFor(data) {
  const session = typeof data.session_id === 'string' ? data.session_id : '';
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(session) || session === '.' || session === '..') return false;
  if (data.stop_hook_active === true) return false;
  try { return existsSync(path.join(homedir(), '.specweave', 'close-pending', `${session}.json`)); }
  catch { return false; }
}
// PreToolUse fast path. Ordinary edits and ordinary shell commands must not
// spawn a worker, resolve npm or import the CLI. Write|Edit only matter inside
// `.specweave/increments/`; Bash only matters when the project opted into the
// Jev guard with a local marker file.
const JEV_GUARD_MARKER = path.join('.specweave', 'state', 'jev-guard.enabled');
const JEV_GUARD_MAX_DEPTH = 8;
// Edits outside increments only matter when the project opted into required
// increments (`specweave require-increment`), which leaves its own marker; a
// session or SpecWithCode thread with a small fix there, or a thread bound to
// an open increment there, skips too.
const REQUIRE_INCREMENT_MARKER = path.join('.specweave', 'state', 'require-increment.enabled');
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
// Main checkout of the linked Git worktree containing `dir`, or null. Keep in
// step with src/utils/main-checkout.ts (a parity test compares them): the
// SpecWithCode worktrees live outside the project, so markers are searched from
// the main checkout too. Sync reads only, no Git process.
const WORKTREE_GITDIR = /^gitdir:\s*(.*?)[\\/]\.git[\\/]worktrees[\\/][^\\/]+[\\/]?\s*$/;
function mainCheckoutOf(dir) {
  let current;
  try { current = path.resolve(dir); } catch { return null; }
  for (let depth = 0; depth < 100; depth++) {
    const dotGit = path.join(current, '.git');
    try {
      const stat = statSync(dotGit, { throwIfNoEntry: false });
      if (stat) {
        if (!stat.isFile()) return null;
        const first = readFileSync(dotGit, 'utf8').split(/\r?\n/, 1)[0] ?? '';
        const match = WORKTREE_GITDIR.exec(first.trim());
        return match && match[1] ? path.resolve(current, match[1]) : null;
      }
    } catch { return null; }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}
function markerStarts(data) {
  const starts = [typeof data.cwd === 'string' ? data.cwd : process.cwd(), process.env.CLAUDE_PROJECT_DIR].filter(Boolean);
  return [...starts, ...starts.map(mainCheckoutOf)];
}
function findMarker(data, marker) {
  for (const start of markerStarts(data)) {
    if (!start) continue;
    let current;
    try { current = path.resolve(start); } catch { continue; }
    for (let depth = 0; depth < JEV_GUARD_MAX_DEPTH; depth++) {
      try { if (existsSync(path.join(current, marker))) return current; } catch { break; }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return null;
}
function hasJevGuardMarker(data) {
  return findMarker(data, JEV_GUARD_MARKER) !== null;
}
// A small fix declared in this project by the session, or (Codex, Pi: no
// session id) by the SpecWithCode thread, keyed `studio-<thread>` and sanitized
// like workSessionFile. Worktrees count as their main checkout.
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;
function sessionWorksIn(data, root) {
  const session = typeof data.session_id === 'string' ? data.session_id : '';
  const thread = (process.env.SPECWEAVE_STUDIO_THREAD_ID ?? '').trim();
  const ids = [session, thread ? `studio-${thread}`.replace(/[^\w.-]/g, '_') : '']
    .filter((id) => SAFE_ID.test(id) && id !== '.' && id !== '..');
  const project = (dir) => path.resolve(mainCheckoutOf(dir) ?? dir);
  for (const id of ids) {
    try {
      const marker = JSON.parse(readFileSync(path.join(homedir(), '.specweave', 'sessions', `${id}.json`), 'utf8'));
      if (marker?.kind !== 'small-fix' || typeof marker.root !== 'string') continue;
      if (path.resolve(marker.root) === root || project(marker.root) === project(root)) return true;
    } catch {}
  }
  return false;
}
// The SpecWithCode thread is bound to an increment of this project that is not
// closed: the guard would pass, so skip the worker. Same rule as the guard's
// binding check, with an exact project match (anything else asks the worker).
const CLOSED_STATUSES = new Set(['completed', 'abandoned', 'cancelled']);
function threadBoundIn(root) {
  const thread = (process.env.SPECWEAVE_STUDIO_THREAD_ID ?? '').trim();
  if (!thread) return false;
  try {
    const file = path.join(homedir(), '.specweave', 'studio', 'threads', `${thread.replace(/[^\w.-]/g, '_')}.json`);
    const binding = JSON.parse(readFileSync(file, 'utf8'));
    const id = binding?.incrementId;
    if (typeof binding?.root !== 'string' || !binding.root || typeof id !== 'string' || !SAFE_ID.test(id) || id === '.' || id === '..') return false;
    const project = (dir) => path.resolve(mainCheckoutOf(dir) ?? dir);
    if (path.resolve(binding.root) !== root && project(binding.root) !== project(root)) return false;
    let status = '';
    try { status = String(JSON.parse(readFileSync(path.join(binding.root, '.specweave', 'increments', id, 'metadata.json'), 'utf8'))?.status ?? ''); }
    catch {}
    return !CLOSED_STATUSES.has(status);
  } catch { return false; }
}
// `--scope user`: the entry `specweave require-increment` writes to
// ~/.claude/settings.json runs in every project. It guards nothing (not even
// increment files) unless an opted-in project's marker is found, and leaves a
// project whose own entry Claude loaded to that entry (no second worker).
const USER_SCOPE = process.argv[3] === '--scope' && process.argv[4] === 'user';
const EDIT_HOOK_MATCHER = 'Edit|Write|MultiEdit|NotebookEdit';
function projectEntryLoaded(data) {
  const dir = process.env.CLAUDE_PROJECT_DIR || (typeof data.cwd === 'string' ? data.cwd : '');
  if (!dir) return false;
  try {
    const groups = JSON.parse(readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'))?.hooks?.PreToolUse;
    return Array.isArray(groups) && groups.some((g) => g?.matcher === EDIT_HOOK_MATCHER && Array.isArray(g.hooks)
      && g.hooks.some((h) => typeof h?.command === 'string' && /hooks\/run\.mjs"?\s+pre-tool-use\s*$/.test(h.command.replace(/\\/g, '/'))));
  } catch { return false; }
}
function skipPreToolUse(data) {
  const tool = typeof data.tool_name === 'string' ? data.tool_name : '';
  if (USER_SCOPE && (tool === 'Bash' || findMarker(data, REQUIRE_INCREMENT_MARKER) === null || projectEntryLoaded(data))) return true;
  if (tool === 'Bash') return !hasJevGuardMarker(data);
  const ti = data.tool_input;
  const filePath = ti && typeof ti === 'object' && typeof ti.file_path === 'string'
    ? ti.file_path.replace(/\\/g, '/') : '';
  if (filePath.includes('.specweave/increments/')) return false;
  if (!EDIT_TOOLS.has(tool)) return true;
  const root = findMarker(data, REQUIRE_INCREMENT_MARKER);
  return root === null || sessionWorksIn(data, root) || threadBoundIn(root);
}
function record(reason) {
  try {
    const dir = path.join(homedir(), '.specweave', 'logs');
    mkdirSync(dir, {recursive:true, mode:0o700});
    appendFileSync(path.join(dir, 'hook-health.jsonl'), JSON.stringify({at:new Date().toISOString(),event,reason,elapsedMs:Date.now()-started})+'\n', {mode:0o600});
  } catch {}
}
function killWorker() {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {timeout:1000, windowsHide:true, stdio:'ignore'});
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try {child.kill('SIGKILL');} catch {} }
  }
}
function finish(result = {}, reason) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  killWorker();
  if (reason) record(reason);
  process.stdout.write(JSON.stringify(result)+'\n',()=>process.exit(0));
}
const deadline = setTimeout(()=>finish({},'deadline_exceeded'),budget);
process.on('SIGTERM',()=>finish({},'terminated'));
process.on('SIGINT',()=>finish({},'interrupted'));
process.on('uncaughtException',()=>finish({},'adapter_error'));
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{
  size += Buffer.byteLength(chunk, 'utf8');
  if(size>1024*1024) return finish({},'input_limit');
  input+=chunk;
});
process.stdin.on('error',()=>finish({},'stdin_error'));
process.stdin.on('end',()=>{
  let data;
  try {data=JSON.parse(input);if(!data || typeof data!=='object'||Array.isArray(data))throw Error();}
  catch {return finish({},'invalid_input');}
  if(!['session-start','pre-tool-use','pre-compact','stop'].includes(event))return finish({});
  if(process.env.SPECWEAVE_DISABLE_HOOKS === '1')return finish({});
  if(event === 'stop' && !hasActiveAutoSession(data) && !hasClosePendingFor(data))return finish({});
  if(event === 'pre-tool-use' && skipPreToolUse(data))return finish({});
  const env={...process.env};
  child=spawn(process.execPath,[worker,event],{env,detached:process.platform !== 'win32',stdio:['pipe','pipe','pipe']});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{
    output+=chunk;
    if(output.length>1024*1024)finish({},'output_limit');
  });
  child.stderr.resume();
  child.stdin.on('error',()=>{});
  child.on('error',()=>finish({},'worker_spawn_failed'));
  child.on('close',code=>{
    if(finished)return;
    if(code!==0)return finish({},'worker_failed');
    try {
      const result=JSON.parse(output);
      if(!result||typeof result!=='object'||Array.isArray(result))throw Error();
      finish(result);
    } catch {finish({},'invalid_worker_output');}
  });
  child.stdin.end(input);
});
