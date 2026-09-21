/**
 * Opt-in Jev Bash guard (0878, AC-05).
 *
 * Two layers are covered:
 *   1. the PreToolUse handler — deny / warn / allow / prefilter-skip / timeout /
 *      no-marker / disabled / no-key / thrown-error, all failing OPEN;
 *   2. the launcher fast path — `node plugins/specweave/hooks/run.mjs
 *      pre-tool-use` must print `{}` for a Bash command with no marker WITHOUT
 *      importing the CLI router at all, and must load it when the marker exists.
 *
 * No network: the Jev module is replaced with vi.mock, and the launcher tests
 * point SPECWEAVE_HOME at a fake CLI whose router only writes a marker file.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createContext } from '../../../src/core/hooks/handlers/utils.js';
import { validateHookOutput } from '../../../src/core/hooks/handlers/types.js';

// ── Jev module double ────────────────────────────────────────────────────────

const jevMock = vi.hoisted(() => ({
  loadJevConfig: vi.fn(),
  prefilterCommand: vi.fn(),
  createJevClient: vi.fn(),
  guardCommand: vi.fn(),
}));

vi.mock('../../../src/core/jev/index.js', () => jevMock);

const ENABLED_CONFIG = {
  enabled: true,
  provider: 'openrouter',
  model: 'jev-1.13',
  timeoutMs: 4000,
  thresholds: { route: 0.7, guardDeny: 0.85, guardWarn: 0.5 },
  guards: { bash: true },
  modelRouting: true,
  browse: { allowDomains: [], maxSteps: 20 },
};

const FAKE_CLIENT = { ask: vi.fn(), ping: vi.fn() };

function guardOk(over: Record<string, unknown> = {}) {
  return {
    available: true as const,
    verdict: 'deny' as const,
    scope: 'destructive_remote' as const,
    scopeConfidence: 0.93,
    destructive: 0.91,
    prefiltered: false,
    probabilities: { destructive_remote: 0.93, shared_or_remote: 0.05, read_only: 0.01 },
    reason: 'scope destructive_remote 0.93',
    latencyMs: 240,
    ...over,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

describe('pre-tool-use: Jev Bash guard', () => {
  let root = '';
  const savedBypass = process.env.SPECWEAVE_JEV_GUARD;

  async function handleBash(command: string, extra: Record<string, unknown> = {}) {
    const { handle } = await import('../../../src/core/hooks/handlers/pre-tool-use.js');
    return handle(
      { hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: root, tool_input: { command, ...extra } },
      createContext(root),
    );
  }

  function enableMarker(): void {
    fs.writeFileSync(path.join(root, '.specweave', 'state', 'jev-guard.enabled'), '');
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SPECWEAVE_JEV_GUARD;
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-guard-'));
    fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
    jevMock.loadJevConfig.mockReturnValue(ENABLED_CONFIG);
    jevMock.prefilterCommand.mockReturnValue('check');
    jevMock.createJevClient.mockReturnValue(FAKE_CLIENT);
    jevMock.guardCommand.mockResolvedValue(guardOk());
  });

  afterEach(() => {
    vi.useRealTimers();
    if (root) fs.rmSync(root, { recursive: true, force: true });
    root = '';
    if (savedBypass === undefined) delete process.env.SPECWEAVE_JEV_GUARD;
    else process.env.SPECWEAVE_JEV_GUARD = savedBypass;
  });

  it('denies a deny-verdict command with scope, probabilities and the override', async () => {
    enableMarker();
    const out = await handleBash('rm -rf ~/Projects');

    expect(validateHookOutput('pre-tool-use', out)).toBeNull();
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    const reason = out.hookSpecificOutput?.permissionDecisionReason ?? '';
    expect(reason).toContain('destructive_remote');
    expect(reason).toContain('0.93');
    expect(reason).toContain('destructive=0.91');
    expect(jevMock.guardCommand).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.objectContaining({ command: 'rm -rf ~/Projects', cwd: root }),
    );
  });

  // The deny reason lands in the model's context on the turn it was blocked, so
  // it must not double as a how-to for switching the guard off (review 0878).
  it('does not hand the blocked agent a bypass procedure', async () => {
    enableMarker();
    const reason =
      (await handleBash('rm -rf ~/Projects')).hookSpecificOutput?.permissionDecisionReason ?? '';

    expect(reason).not.toMatch(/SPECWEAVE_JEV_GUARD/);
    expect(reason).not.toMatch(/jev-guard\.enabled/);
    expect(reason).not.toMatch(/guards\.bash/);
    expect(reason).toMatch(/ask the user|let them decide/i);
  });

  it('ignores an inline SPECWEAVE_JEV_GUARD=0 prefix (agent-typed text is not consent)', async () => {
    enableMarker();
    const out = await handleBash('SPECWEAVE_JEV_GUARD=0 rm -rf ~/Projects');

    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(jevMock.guardCommand).toHaveBeenCalled();
  });

  it('passes a warn verdict through as additionalContext (tool still runs)', async () => {
    enableMarker();
    jevMock.guardCommand.mockResolvedValue(
      guardOk({ verdict: 'warn', scope: 'local_irreversible', scopeConfidence: 0.71, destructive: 0.62 }),
    );

    const out = await handleBash('git clean -fdx');
    expect(validateHookOutput('pre-tool-use', out)).toBeNull();
    expect(out.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(out.hookSpecificOutput?.additionalContext).toContain('local_irreversible');
    expect(out.hookSpecificOutput?.additionalContext).toContain('destructive=0.62');
  });

  it('passes an allow verdict', async () => {
    enableMarker();
    jevMock.guardCommand.mockResolvedValue(guardOk({ verdict: 'allow', scope: 'local_reversible' }));
    expect(await handleBash('npm run build')).toEqual({});
  });

  it('skips Jev entirely for a prefiltered read-only command', async () => {
    enableMarker();
    jevMock.prefilterCommand.mockReturnValue('skip');

    expect(await handleBash('ls -la')).toEqual({});
    expect(jevMock.prefilterCommand).toHaveBeenCalledWith('ls -la');
    expect(jevMock.createJevClient).not.toHaveBeenCalled();
    expect(jevMock.guardCommand).not.toHaveBeenCalled();
  });

  it('passes when the round trip exceeds the 3 s budget', async () => {
    enableMarker();
    jevMock.guardCommand.mockReturnValue(new Promise(() => {})); // never settles
    vi.useFakeTimers();

    const promise = handleBash('rm -rf /');
    await vi.advanceTimersByTimeAsync(3100);
    expect(await promise).toEqual({});
  });

  it('passes without touching Jev when the marker file is absent', async () => {
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});
    expect(jevMock.loadJevConfig).not.toHaveBeenCalled();
    expect(jevMock.guardCommand).not.toHaveBeenCalled();
  });

  it('passes when jev is disabled or guards.bash is off', async () => {
    enableMarker();

    jevMock.loadJevConfig.mockReturnValue({ ...ENABLED_CONFIG, enabled: false });
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});

    jevMock.loadJevConfig.mockReturnValue({ ...ENABLED_CONFIG, guards: { bash: false } });
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});

    expect(jevMock.guardCommand).not.toHaveBeenCalled();
  });

  it('honours SPECWEAVE_JEV_GUARD=0 for a single command', async () => {
    enableMarker();
    process.env.SPECWEAVE_JEV_GUARD = '0';
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});
    expect(jevMock.loadJevConfig).not.toHaveBeenCalled();
  });

  it('passes when there is no API key (createJevClient returns null)', async () => {
    enableMarker();
    jevMock.createJevClient.mockReturnValue(null);
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});
    expect(jevMock.guardCommand).not.toHaveBeenCalled();
  });

  it('passes when Jev reports unavailable or throws', async () => {
    enableMarker();

    jevMock.guardCommand.mockResolvedValue({ available: false, reason: 'transport: ECONNRESET' });
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});

    jevMock.guardCommand.mockRejectedValue(new Error('boom'));
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});

    jevMock.loadJevConfig.mockImplementation(() => {
      throw new Error('bad config');
    });
    expect(await handleBash('rm -rf ~/Projects')).toEqual({});
  });

  // Scoring a command POSTs its text to a third-party API, and the prefilter
  // routes curl/ssh/publish/deploy — the credential-carrying verbs — at Jev.
  describe('secret redaction before the command leaves the machine', () => {
    async function sentCommand(command: string): Promise<string> {
      enableMarker();
      await handleBash(command);
      expect(jevMock.guardCommand).toHaveBeenCalled();
      return String(jevMock.guardCommand.mock.calls[0][1].command);
    }

    it('masks a bearer token in a curl header', async () => {
      const sent = await sentCommand(
        'curl -H "Authorization: Bearer ' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123' + '" https://api.github.com/user',
      );
      expect(sent).not.toContain('ghp_' + 'abcdefghijklmnopqrstuvwxyz0123');
      expect(sent).toContain('REDACTED');
      expect(sent).toContain('curl'); // shape preserved so the scoring still works
    });

    it('masks `npm publish --otp=<code>`', async () => {
      const sent = await sentCommand('npm publish --otp=123456 --access public');
      expect(sent).not.toContain('123456');
      expect(sent).toContain('npm publish');
      expect(sent).toContain('--access public');
    });

    it('masks credentials embedded in a connection string', async () => {
      const sent = await sentCommand('psql postgres://admin:' + 'hunter2@db.example.com/prod -c "drop table users"');
      expect(sent).not.toContain('hunter2');
      expect(sent).toContain('@db.example.com/prod');
      expect(sent).toContain('drop table users');
    });

    it('masks a KEY=value secret assignment and a --token flag', async () => {
      const sent = await sentCommand('DEPLOY_PASSWORD=s3cr3tValue ./deploy.sh --token sk-abcdefghijklmnop1234');
      expect(sent).not.toContain('s3cr3tValue');
      expect(sent).not.toContain('sk-abcdefghijklmnop1234');
      expect(sent).toContain('./deploy.sh');
    });

    // Masking removes text. If that text was what made the command look risky,
    // the guard's own prefilter would hand back a prefiltered allow.
    it('keeps a redacted command on the "check" side of the real prefilter', async () => {
      const raw = 'echo MY_TOKEN="x; rm -rf ~"';
      const { prefilterCommand } = await import('../../../src/core/jev/decide.js');
      expect(prefilterCommand(raw)).toBe('check');

      const sent = await sentCommand(raw);
      expect(sent).not.toContain('rm -rf'); // the risky text is inside the masked span
      expect(prefilterCommand(sent)).toBe('check');
    });

    it('scrubs the description too and leaves clean commands byte-identical', async () => {
      enableMarker();
      await handleBash('git push --force origin main', {
        description: 'push with ' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123',
      });

      const arg = jevMock.guardCommand.mock.calls[0][1];
      expect(arg.command).toBe('git push --force origin main');
      expect(String(arg.description)).not.toContain('ghp_' + 'abcdefghijklmnopqrstuvwxyz0123');
    });
  });

  it('ignores an empty command and leaves the Write|Edit guard untouched', async () => {
    enableMarker();
    expect(await handleBash('   ')).toEqual({});
    expect(jevMock.loadJevConfig).not.toHaveBeenCalled();

    const { handle } = await import('../../../src/core/hooks/handlers/pre-tool-use.js');
    const inc = path.join(root, '.specweave', 'increments', '0878-jev');
    fs.mkdirSync(inc, { recursive: true });
    const out = await handle(
      {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        cwd: root,
        tool_input: {
          file_path: path.join(inc, 'metadata.json'),
          old_string: '"status": "active"',
          new_string: '"status": "completed"',
        },
      },
      createContext(root),
    );
    expect(out.hookSpecificOutput?.permissionDecision).toBe('deny');
  });
});

// ── Launcher fast path ───────────────────────────────────────────────────────

describe('run.mjs PreToolUse fast path', () => {
  const repoRoot = process.cwd();
  const runner = path.join(repoRoot, 'plugins', 'specweave', 'hooks', 'run.mjs');
  const fakeCli = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-fakecli-'));
  const loaded = path.join(fakeCli, 'router-loaded.txt');
  let project = '';

  fs.writeFileSync(path.join(fakeCli, 'package.json'), JSON.stringify({ name: 'specweave' }));
  const routerDir = path.join(fakeCli, 'dist', 'src', 'core', 'hooks', 'handlers');
  fs.mkdirSync(routerDir, { recursive: true });
  fs.writeFileSync(
    path.join(routerDir, 'hook-router.js'),
    `import { writeFileSync } from 'node:fs';\n` +
      `export async function hookRouter() {\n` +
      `  writeFileSync(${JSON.stringify(loaded)}, 'LOADED');\n` +
      `  return {};\n` +
      `}\n`,
  );

  function launch(toolName: string, toolInput: Record<string, unknown>) {
    fs.rmSync(loaded, { force: true });
    const res = spawnSync(process.execPath, [runner, 'pre-tool-use'], {
      cwd: project,
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: toolInput, cwd: project }),
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, SPECWEAVE_HOME: fakeCli, CLAUDE_PROJECT_DIR: project },
    });
    return { status: res.status, out: (res.stdout ?? '').trim(), routerLoaded: fs.existsSync(loaded) };
  }

  beforeEach(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-launch-'));
    fs.mkdirSync(path.join(project, '.specweave', 'state'), { recursive: true });
    fs.writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
  });

  afterEach(() => {
    if (project) fs.rmSync(project, { recursive: true, force: true });
    project = '';
  });

  afterAll(() => fs.rmSync(fakeCli, { recursive: true, force: true }));

  it('Bash without the marker prints {} without loading the CLI', () => {
    const r = launch('Bash', { command: 'rm -rf ~/Projects' });
    expect(r.status).toBe(0);
    expect(r.out).toBe('{}');
    expect(r.routerLoaded).toBe(false);
  });

  it('Bash with the marker loads the router', () => {
    fs.writeFileSync(path.join(project, '.specweave', 'state', 'jev-guard.enabled'), '');
    const r = launch('Bash', { command: 'rm -rf ~/Projects' });
    expect(r.status).toBe(0);
    expect(r.out).toBe('{}');
    expect(r.routerLoaded).toBe(true);
  });

  it('finds the marker from a nested cwd within 8 levels', () => {
    fs.writeFileSync(path.join(project, '.specweave', 'state', 'jev-guard.enabled'), '');
    const nested = path.join(project, 'a', 'b', 'c');
    fs.mkdirSync(nested, { recursive: true });
    fs.rmSync(loaded, { force: true });
    const res = spawnSync(process.execPath, [runner, 'pre-tool-use'], {
      cwd: nested,
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm -rf /' }, cwd: nested }),
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, SPECWEAVE_HOME: fakeCli, CLAUDE_PROJECT_DIR: nested },
    });
    expect(res.status).toBe(0);
    expect(fs.existsSync(loaded)).toBe(true);
  });

  it('keeps the Write|Edit rule: non-increment file skips, increment file loads', () => {
    const outside = launch('Write', { file_path: path.join(project, 'src', 'a.ts'), content: 'x' });
    expect(outside.out).toBe('{}');
    expect(outside.routerLoaded).toBe(false);

    const inside = launch('Edit', {
      file_path: 'C:\\p\\.specweave\\increments\\0878-jev\\metadata.json',
      old_string: 'a',
      new_string: 'b',
    });
    expect(inside.status).toBe(0);
    expect(inside.routerLoaded).toBe(true);
  });
});
