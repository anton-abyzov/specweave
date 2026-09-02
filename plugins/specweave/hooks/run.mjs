#!/usr/bin/env node
/**
 * SpecWeave hook launcher (zero-dependency, cross-platform).
 *
 * Invoked by Claude Code in exec form (no shell):
 *   node ${CLAUDE_PLUGIN_ROOT}/hooks/run.mjs <event>
 *
 * Contract:
 *   - reads the hook JSON from stdin (5 s cap), normalizes backslashes in
 *     tool_input.file_path, locates the installed `specweave` CLI, imports its
 *     built hook router and prints exactly ONE JSON object;
 *   - always exits 0; on ANY failure prints `{}` (pass) — except SessionStart,
 *     which prints an additionalContext line telling the user the CLI is missing.
 *
 * CLI root resolution order:
 *   1. $SPECWEAVE_HOME
 *   2. <plugin root>/../..  (plugin shipped inside the npm package / repo checkout)
 *   3. require.resolve('specweave/package.json') from $CLAUDE_PROJECT_DIR / cwd
 *   4. `npm root -g` (result cached in a per-user private file under ~/.specweave)
 *
 * Fast path: PreToolUse for a file outside `.specweave/increments/` prints `{}`
 * without loading the CLI at all (the guards only concern increment files).
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EVENTS = new Set(['session-start', 'pre-tool-use', 'stop', 'pre-compact']);
const STDIN_CAP_MS = 5000;
const ROUTER_REL = path.join('dist', 'src', 'core', 'hooks', 'handlers', 'hook-router.js');
/**
 * Per-user cache path. NEVER the shared OS temp dir: run.mjs `import()`s the
 * path it reads back, so a world-writable cache is arbitrary code execution on
 * every SessionStart/Stop/PreCompact of every session on the machine.
 */
const CACHE_DIR = safeHomeDir() ? path.join(safeHomeDir(), '.specweave') : null;
const CACHE_FILE = CACHE_DIR ? path.join(CACHE_DIR, 'hook-cli-root') : null;

function safeHomeDir() {
  try {
    const home = homedir();
    return home && path.isAbsolute(home) ? home : null;
  } catch {
    return null;
  }
}

/** True only for a regular file (not a symlink) owned by the current user. */
function isPrivateOwnedFile(file) {
  try {
    const st = lstatSync(file);
    if (!st.isFile()) return false;
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    return uid === null || st.uid === uid;
  } catch {
    return false;
  }
}

const event = process.argv[2] ?? '';

function inactiveOutput() {
  if (event === 'session-start') {
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          'SpecWeave hooks inactive: specweave CLI not found (npm i -g specweave)',
      },
    };
  }
  return {};
}

let printed = false;
function emit(obj) {
  if (printed) return;
  printed = true;
  let text = '{}';
  try {
    text = JSON.stringify(obj && typeof obj === 'object' ? obj : {});
  } catch {
    text = '{}';
  }
  process.stdout.write(text + '\n', () => process.exit(0));
}

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    };
    const timer = setTimeout(finish, STDIN_CAP_MS);
    if (timer.unref) timer.unref();
    try {
      process.stdin.on('data', (c) => chunks.push(c));
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
      process.stdin.on('close', finish);
      if (process.stdin.readableEnded) finish();
    } catch {
      finish();
    }
  });
}

/** Returns { raw, skip } — `skip` when the event cannot possibly need the CLI. */
function normalizeInput(raw) {
  try {
    const input = JSON.parse(raw);
    if (input && typeof input === 'object') {
      const ti = input.tool_input;
      let filePath = '';
      if (ti && typeof ti === 'object' && typeof ti.file_path === 'string') {
        ti.file_path = ti.file_path.replace(/\\/g, '/');
        filePath = ti.file_path;
      }
      if (typeof input.cwd === 'string') input.cwd = input.cwd.replace(/\\/g, '/');
      const skip = event === 'pre-tool-use' && !filePath.includes('.specweave/increments/');
      return { raw: JSON.stringify(input), skip };
    }
  } catch {
    // fall through — the router tolerates a non-JSON payload
  }
  return { raw, skip: false };
}

function isCliRoot(dir) {
  if (!dir) return false;
  try {
    const pkg = path.join(dir, 'package.json');
    if (!existsSync(pkg) || !existsSync(path.join(dir, ROUTER_REL))) return false;
    return JSON.parse(readFileSync(pkg, 'utf8')).name === 'specweave';
  } catch {
    return false;
  }
}

function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return path.resolve(process.env.CLAUDE_PLUGIN_ROOT);
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

function fromCache() {
  if (!CACHE_FILE || !isPrivateOwnedFile(CACHE_FILE)) return null;
  try {
    const cached = readFileSync(CACHE_FILE, 'utf8').trim();
    return isCliRoot(cached) ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(dir) {
  if (!CACHE_DIR || !CACHE_FILE) return;
  try {
    mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
    // Drop whatever is there (possibly a planted symlink) before writing.
    rmSync(CACHE_FILE, { force: true });
    writeFileSync(CACHE_FILE, dir, { flag: 'wx', mode: 0o600 });
  } catch {
    // cache is best-effort
  }
}

function fromNpmGlobal() {
  try {
    const res = spawnSync('npm root -g', { shell: true, encoding: 'utf8', timeout: 4000 });
    const root = (res.stdout || '').trim().split(/\r?\n/).pop();
    if (!root) return null;
    const dir = path.join(root, 'specweave');
    if (!isCliRoot(dir)) return null;
    writeCache(dir);
    return dir;
  } catch {
    return null;
  }
}

function resolveCliRoot() {
  const candidates = [
    () => process.env.SPECWEAVE_HOME,
    () => path.resolve(pluginRoot(), '..', '..'),
    ...[process.env.CLAUDE_PROJECT_DIR, process.cwd()].filter(Boolean).flatMap((dir) => [
      () => path.dirname(createRequire(path.join(dir, 'package.json')).resolve('specweave/package.json')),
      () => path.join(dir, 'node_modules', 'specweave'),
    ]),
    fromCache,
    fromNpmGlobal,
  ];
  for (const candidate of candidates) {
    try {
      const dir = candidate();
      if (isCliRoot(dir)) return dir;
    } catch {
      // try the next strategy
    }
  }
  return null;
}

async function main() {
  if (!EVENTS.has(event)) {
    await readStdin();
    return emit({});
  }
  const { raw, skip } = normalizeInput(await readStdin());
  if (skip) return emit({});
  const cliRoot = resolveCliRoot();
  if (!cliRoot) return emit(inactiveOutput());
  try {
    const mod = await import(pathToFileURL(path.join(cliRoot, ROUTER_REL)).href);
    const result = await mod.hookRouter(event, raw);
    return emit(result);
  } catch {
    return emit(inactiveOutput());
  }
}

process.on('uncaughtException', () => emit(inactiveOutput()));
process.on('unhandledRejection', () => emit(inactiveOutput()));
main().catch(() => emit(inactiveOutput()));
