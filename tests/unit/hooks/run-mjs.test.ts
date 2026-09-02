/**
 * Launcher tests: spawn `node plugins/specweave/hooks/run.mjs <event>` with a
 * sample stdin and assert exit 0 + exactly one schema-valid JSON object.
 *
 * Needs the built router (dist/) — run `npm run build` first; the suite skips
 * itself with a clear message when dist/ is absent.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { validateHookOutput } from '../../../src/core/hooks/handlers/types.js';

const repoRoot = process.cwd();
const runner = path.join(repoRoot, 'plugins', 'specweave', 'hooks', 'run.mjs');
const distRouter = path.join(repoRoot, 'dist', 'src', 'core', 'hooks', 'handlers', 'hook-router.js');
const built = fs.existsSync(distRouter);

let project = '';

function run(event: string, input: string | object, env: Record<string, string> = {}, cwd = project) {
  const res = spawnSync(process.execPath, [runner, event], {
    cwd,
    input: typeof input === 'string' ? input : JSON.stringify({ ...input, cwd }),
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, SPECWEAVE_HOME: repoRoot, SPECWEAVE_HOOK_DRY_RUN: '1', ...env },
  });
  const out = (res.stdout ?? '').trim();
  return { status: res.status, out, stderr: res.stderr ?? '', json: out ? (JSON.parse(out) as Record<string, unknown>) : null };
}

describe.skipIf(!built)('plugins/specweave/hooks/run.mjs (requires npm run build)', () => {
  beforeAll(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-runmjs-'));
    fs.mkdirSync(path.join(project, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
    const inc = path.join(project, '.specweave', 'increments', '0001-launch');
    fs.mkdirSync(inc, { recursive: true });
    fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ status: 'active', title: 'Launch' }));
    fs.writeFileSync(path.join(inc, 'tasks.md'), '### T-001: First\n**Status**: [ ] pending\n');
    fs.writeFileSync(path.join(inc, 'spec.md'), '# Launch\n');
  });
  afterAll(() => fs.rmSync(project, { recursive: true, force: true }));

  it('session-start prints one SessionStart additionalContext object', () => {
    const r = run('session-start', { hook_event_name: 'SessionStart', source: 'startup' });
    expect(r.status).toBe(0);
    expect(r.out.split('\n')).toHaveLength(1);
    expect(validateHookOutput('session-start', r.json)).toBeNull();
    expect(JSON.stringify(r.json)).toContain('0001-launch');
  });

  it('pre-tool-use denies a Windows-path status→completed edit', () => {
    const r = run('pre-tool-use', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 'C:\\p\\.specweave\\increments\\0001-launch\\metadata.json', old_string: 'a', new_string: '"status": "completed"' },
    });
    expect(r.status).toBe(0);
    expect(validateHookOutput('pre-tool-use', r.json)).toBeNull();
    expect((r.json as { hookSpecificOutput?: { permissionDecision?: string } }).hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('pre-tool-use fast path: non-increment file -> {} without loading the CLI', () => {
    const r = run(
      'pre-tool-use',
      { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'C:\\p\\src\\a.ts', old_string: 'a', new_string: 'b' } },
      { SPECWEAVE_HOME: path.join(os.tmpdir(), 'definitely-not-a-cli') },
    );
    expect(r.status).toBe(0);
    expect(r.json).toEqual({});
  });

  it('stop and pre-compact print {} in a project with no auto session', () => {
    for (const ev of ['stop', 'pre-compact']) {
      const r = run(ev, { hook_event_name: ev });
      expect(r.status, ev).toBe(0);
      expect(r.json, ev).toEqual({});
    }
  });

  it('prints {} for an unknown event and for garbage stdin, exit 0', () => {
    expect(run('bogus', '{}')).toMatchObject({ status: 0, out: '{}' });
    expect(run('stop', '{{{{')).toMatchObject({ status: 0, out: '{}' });
    expect(run('pre-tool-use', '')).toMatchObject({ status: 0, out: '{}' });
  });

  it('prints the inactive notice on SessionStart when no CLI can be found', () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-nocli-'));
    try {
      const r = run(
        'session-start',
        { hook_event_name: 'SessionStart' },
        { SPECWEAVE_HOME: bare, CLAUDE_PLUGIN_ROOT: path.join(bare, 'plugin'), CLAUDE_PROJECT_DIR: bare, HOME: bare, USERPROFILE: bare, PATH: '' },
        bare,
      );
      expect(r.status).toBe(0);
      expect(JSON.stringify(r.json)).toContain('SpecWeave hooks inactive');
      expect(validateHookOutput('session-start', r.json)).toBeNull();
      // Other events stay silent: {}
      const s = run('stop', { hook_event_name: 'Stop' }, { SPECWEAVE_HOME: bare, CLAUDE_PLUGIN_ROOT: path.join(bare, 'plugin'), CLAUDE_PROJECT_DIR: bare, HOME: bare, USERPROFILE: bare, PATH: '' }, bare);
      expect(s).toMatchObject({ status: 0, out: '{}' });
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });

  it('resolves the CLI from CLAUDE_PLUGIN_ROOT/../.. when SPECWEAVE_HOME is unset', () => {
    const r = spawnSync(process.execPath, [runner, 'session-start'], {
      cwd: project,
      input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: project }),
      encoding: 'utf8',
      timeout: 20000,
      env: { ...process.env, SPECWEAVE_HOME: '', CLAUDE_PLUGIN_ROOT: path.join(repoRoot, 'plugins', 'specweave') },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('0001-launch');
  });
});

if (!built) {
  it('run.mjs suite skipped: dist/ not built (run `npm run build`)', () => {
    expect(built).toBe(false);
  });
}
