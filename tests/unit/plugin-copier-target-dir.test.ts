import { describe, it, expect, afterEach, vi } from 'vitest';
import { join } from 'node:path';

// Hoist mocks before any imports
const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  lstatSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock('node:fs', () => mocks);

vi.mock('node:crypto', () => ({
  createHash: () => ({
    update: vi.fn().mockReturnThis(),
    digest: () => 'fakehash123',
  }),
}));

vi.mock('../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: vi.fn().mockReturnValue({ status: 1, stdout: '', stderr: '' }),
}));

vi.mock('../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: vi.fn().mockReturnValue('project'),
  getScopeArgs: vi.fn().mockReturnValue([]),
}));

const FAKE_HOME = vi.hoisted(() => '/fake-home');
vi.mock('node:os', () => ({
  homedir: () => FAKE_HOME,
}));

import { copyPluginSkillsToProject } from '../../src/utils/plugin-copier.js';

const SPECWEAVE_ROOT = '/specweave';
const PROJECT_ROOT = '/project';

function setupBasicMocks() {
  const fileStats = { isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false };
  const dirStats = { isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false };

  mocks.existsSync.mockImplementation((p: string) => {
    const ps = p.toString();
    if (ps.includes('marketplace.json')) return true;
    if (ps.endsWith(join('plugins', 'sw'))) return true;
    if (ps.endsWith(join('plugins', 'sw', 'skills'))) return true;
    if (ps.includes('SKILL.md')) return true;
    if (ps.endsWith(join('plugins', 'sw', 'hooks'))) return true;
    if (ps.includes('vskill.lock')) return false;
    if (ps.includes('plugins-lock.json')) return false;
    if (ps.includes('.specweave') && ps.includes(FAKE_HOME)) return true;
    if (ps.includes('.claude/commands/sw')) return false;
    return false;
  });

  mocks.readFileSync.mockImplementation((p: string) => {
    const ps = p.toString();
    if (ps.includes('marketplace.json')) {
      return JSON.stringify({
        plugins: [{ name: 'sw', source: 'plugins/sw', version: '1.0.0' }],
      });
    }
    return 'file-content';
  });

  mocks.readdirSync.mockImplementation((dir: string, opts?: { recursive?: boolean }) => {
    const ds = dir.toString();
    if (ds.endsWith(join('plugins', 'sw', 'skills'))) return ['increment'];
    if (ds.includes(join('skills', 'increment')) && opts?.recursive) return ['SKILL.md'];
    if (ds.endsWith(join('plugins', 'sw', 'hooks')) && opts?.recursive) return ['pre-hook.sh'];
    // For hash computation: list all files in plugin source
    if (ds.endsWith(join('plugins', 'sw'))) return ['skills'];
    return [];
  });

  mocks.lstatSync.mockImplementation((p: string) => {
    const ps = p.toString();
    if (ps.endsWith('skills') || ps.endsWith('increment') || ps.endsWith('hooks')) return dirStats;
    return fileStats;
  });

  mocks.statSync.mockReturnValue(fileStats);
  mocks.mkdirSync.mockReturnValue(undefined);
  mocks.copyFileSync.mockReturnValue(undefined);
  mocks.chmodSync.mockReturnValue(undefined);
  mocks.writeFileSync.mockReturnValue(undefined);
}

describe('copyPluginSkillsToProject with targetSkillsDir', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('copies skills to custom targetSkillsDir when provided', () => {
    setupBasicMocks();

    const result = copyPluginSkillsToProject('sw', SPECWEAVE_ROOT, PROJECT_ROOT, {
      force: true,
      targetSkillsDir: '.cursor/skills',
    });

    expect(result.success).toBe(true);

    // Check that mkdir was called with cursor path
    const mkdirCalls = mocks.mkdirSync.mock.calls.map((c: string[][]) => c[0].toString());
    const hasCursorDir = mkdirCalls.some((p: string) => p.includes('.cursor/skills'));
    expect(hasCursorDir).toBe(true);

    // Ensure no .claude/skills path was used for skills
    const hasClaudeSkillsDir = mkdirCalls.some(
      (p: string) => p.includes(join('.claude', 'skills'))
    );
    expect(hasClaudeSkillsDir).toBe(false);
  });

  it('copies skills to .claude/skills when targetSkillsDir is not provided', () => {
    setupBasicMocks();

    const result = copyPluginSkillsToProject('sw', SPECWEAVE_ROOT, PROJECT_ROOT, {
      force: true,
    });

    expect(result.success).toBe(true);

    const mkdirCalls = mocks.mkdirSync.mock.calls.map((c: string[][]) => c[0].toString());
    const hasClaudeDir = mkdirCalls.some((p: string) => p.includes(join('.claude', 'skills')));
    expect(hasClaudeDir).toBe(true);
  });

  it('does NOT copy hooks when targetSkillsDir is a non-Claude path', () => {
    setupBasicMocks();

    copyPluginSkillsToProject('sw', SPECWEAVE_ROOT, PROJECT_ROOT, {
      force: true,
      targetSkillsDir: '.opencode/skills',
    });

    // No hooks directory should be created under .claude/hooks
    const mkdirCalls = mocks.mkdirSync.mock.calls.map((c: string[][]) => c[0]?.toString() || '');
    const hasHooksDir = mkdirCalls.some((p: string) => p.includes(join('.claude', 'hooks')));
    expect(hasHooksDir).toBe(false);

    // Skills should go to .opencode, not .claude
    const hasOpencode = mkdirCalls.some((p: string) => p.includes('.opencode/skills'));
    expect(hasOpencode).toBe(true);
  });

  it('never copies hooks into the project (Claude loads hooks.json from the plugin)', () => {
    setupBasicMocks();

    copyPluginSkillsToProject('sw', SPECWEAVE_ROOT, PROJECT_ROOT, {
      force: true,
    });

    // SpecWeave 2.0 registers its four hooks in plugins/specweave/hooks/hooks.json,
    // which Claude Code reads from the plugin cache. Nothing is written to
    // <project>/.claude/hooks — copying hook scripts there would leave stale copies.
    const mkdirCalls = mocks.mkdirSync.mock.calls.map((c: string[][]) => c[0].toString());
    const hasHooksDir = mkdirCalls.some((p: string) => p.includes(join('.claude', 'hooks')));
    expect(hasHooksDir).toBe(false);
  });

  it('should NOT write vskill.lock to projectRoot — uses global plugins-lock.json', () => {
    setupBasicMocks();

    copyPluginSkillsToProject('sw', SPECWEAVE_ROOT, PROJECT_ROOT, {
      force: true,
    });

    // No writeFileSync call should target vskill.lock
    const writeCalls = mocks.writeFileSync.mock.calls.map((c: unknown[]) => String(c[0]));
    const hasVskillLock = writeCalls.some((p: string) => p.includes('vskill.lock'));
    expect(hasVskillLock).toBe(false);

    // Should write to plugins-lock.json (global lockfile)
    const hasGlobalLock = writeCalls.some((p: string) => p.includes('plugins-lock.json'));
    expect(hasGlobalLock).toBe(true);
  });
});
