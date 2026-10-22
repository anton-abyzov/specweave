/**
 * The required-increment guard through the real launcher
 * (`plugins/specweave/hooks/run.mjs pre-tool-use`), whose fast path must not
 * skip ordinary edits in a project that opted in. Needs `npm run build`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { requireIncrementCommand } from '../../../src/cli/commands/require-increment.js';

const repoRoot = process.cwd();
const runner = path.join(repoRoot, 'plugins', 'specweave', 'hooks', 'run.mjs');
const built = fs.existsSync(path.join(repoRoot, 'dist', 'src', 'core', 'hooks', 'handlers', 'hook-router.js'));

let project = '';
let home = '';

function edit(session: string) {
  const res = spawnSync(process.execPath, [runner, 'pre-tool-use'], {
    cwd: project,
    input: JSON.stringify({
      hook_event_name: 'PreToolUse', session_id: session, cwd: project, tool_name: 'Edit',
      tool_input: { file_path: path.join(project, 'src', 'a.ts'), old_string: 'a', new_string: 'b' },
    }),
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, HOME: home, USERPROFILE: home, SPECWEAVE_HOME: repoRoot, CLAUDE_CODE_SESSION_ID: '', SPECWEAVE_SESSION_ID: '', SPECWEAVE_STUDIO_THREAD_ID: '' },
  });
  expect(res.status).toBe(0);
  return JSON.parse(res.stdout.trim()) as { hookSpecificOutput?: { permissionDecision?: string } };
}
function marker(session: string, body: object) {
  const dir = path.join(home, '.specweave', 'sessions');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${session}.json`), JSON.stringify({ version: 1, sessionId: session, at: '2026-10-22T12:00:00Z', ...body }));
}

describe.skipIf(!built)('required-increment guard through run.mjs (requires npm run build)', () => {
  beforeAll(() => {
    project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-launch-')));
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-require-launch-home-'));
    fs.mkdirSync(path.join(project, '.specweave', 'increments', '0001-open'), { recursive: true });
    fs.mkdirSync(path.join(project, '.specweave', 'increments', '0002-closed'), { recursive: true });
    fs.writeFileSync(path.join(project, '.specweave', 'increments', '0001-open', 'metadata.json'), '{"status":"active"}');
    fs.writeFileSync(path.join(project, '.specweave', 'increments', '0002-closed', 'metadata.json'), '{"status":"completed"}');
    fs.writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
  });
  afterAll(() => {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('passes edits while the policy is off, denies them under enforce, and honours markers', () => {
    expect(edit('s-none')).toEqual({});
    const out = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      expect(requireIncrementCommand('enforce', { cwd: project, packageDir: repoRoot })).toBe(0);
    } finally {
      process.stdout.write = out;
    }
    expect(fs.existsSync(path.join(project, '.specweave', 'state', 'require-increment.enabled'))).toBe(true);

    expect(edit('s-none').hookSpecificOutput?.permissionDecision).toBe('deny');
    marker('s-open', { kind: 'increment', incrementId: '0001-open', root: project, event: 'claim' });
    expect(edit('s-open')).toEqual({});
    marker('s-fix', { kind: 'small-fix', incrementId: null, root: project, event: 'small-fix' });
    expect(edit('s-fix')).toEqual({});
    // A closed increment, or work in another project, does not count.
    marker('s-closed', { kind: 'increment', incrementId: '0002-closed', root: project, event: 'verify' });
    expect(edit('s-closed').hookSpecificOutput?.permissionDecision).toBe('deny');
    marker('s-other', { kind: 'small-fix', incrementId: null, root: path.join(home, 'other-project'), event: 'small-fix' });
    expect(edit('s-other').hookSpecificOutput?.permissionDecision).toBe('deny');
  });
});
