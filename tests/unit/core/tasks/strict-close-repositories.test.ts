/**
 * 1251: owning repositories resolve through the registered repositories at any
 * path, the repositories/<org>/<repo>/ convention keeps working, and the
 * increment records its repositories in metadata.json.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadTaskBoard } from '../../../../src/core/tasks/task-board.js';
import { readStrictClose, resolveOwnerChecks, resolveFileOwner, registeredRepositoryEntries } from '../../../../src/core/tasks/strict-close.js';
import { deriveIncrementRepositories, writeIncrementRepositories } from '../../../../src/core/tasks/increment-repositories.js';
import { taskCommand } from '../../../../src/cli/commands/task.js';

const tmp: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  while (tmp.length) fs.rmSync(tmp.pop()!, { recursive: true, force: true });
});

function spec(files: string[]): string {
  return `# Demo\n\n## Acceptance Criteria\n\n- [ ] AC-01: Works\n\n## Tasks\n\n${files
    .map((f, i) => `### T-0${i + 1} Task ${i + 1}\n- AC: AC-01 | Files: ${f} | Test: npm test\n`).join('\n')}`;
}

function mkProject(files: string[], extra: Record<string, unknown> = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-repos-'));
  tmp.push(base);
  const root = path.join(base, 'project');
  const inc = path.join(root, '.specweave', 'increments', '0001-demo');
  for (const dir of ['libs/core', 'repositories/acme/api', 'repositories/acme/legacy']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.mkdirSync(path.join(base, 'web'), { recursive: true });
  fs.mkdirSync(path.join(base, 'mobile'), { recursive: true });
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({
    workspace: {
      name: 'demo',
      repos: [
        { id: 'core', path: 'libs/core', prefix: 'CORE' },
        { id: 'web', path: '../web', prefix: 'WEB' },
        { id: 'mobile', path: path.join(base, 'mobile'), prefix: 'MOB' },
        { id: 'api', path: 'repositories/acme/api', prefix: 'API' },
      ],
    },
    testing: { strictClose: true, ownerCommands: { 'libs/core': ['npm test'], web: ['npm run test:web'], '../mobile': ['npm run test:mobile'], 'repositories/acme/api': ['npm test'], 'repositories/acme/legacy': ['make test'] } },
    ...extra,
  }));
  fs.writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ id: '0001-demo', status: 'active', type: 'feature', created: new Date().toISOString() }));
  fs.writeFileSync(path.join(inc, 'spec.md'), spec(files));
  return { base, root, inc };
}

describe('resolveFileOwner (1251)', () => {
  it('resolves registered repositories at any path, nested repositories first', () => {
    const { root } = mkProject(['src/a.ts']);
    const repos = registeredRepositoryEntries(root);
    expect(repos.map((r) => r.path)).toEqual(['libs/core', '../web', '../mobile', 'repositories/acme/api']);
    expect(resolveFileOwner(root, 'libs/core/src/index.ts', repos)).toEqual({ owner: 'libs/core', id: 'core' });
    expect(resolveFileOwner(root, '../web/apps/**/*.tsx', repos)).toEqual({ owner: '../web', id: 'web' });
    expect(resolveFileOwner(root, '../mobile/App.tsx', repos)).toEqual({ owner: '../mobile', id: 'mobile' });
    expect(resolveFileOwner(root, 'repositories/acme/api/src/x.ts', repos)).toEqual({ owner: 'repositories/acme/api', id: 'api' });
  });

  it('keeps the repositories/<org>/<repo>/ convention for unregistered checkouts', () => {
    const { root } = mkProject(['src/a.ts']);
    const repos = registeredRepositoryEntries(root);
    expect(resolveFileOwner(root, 'repositories/acme/legacy/main.go', repos)).toEqual({ owner: 'repositories/acme/legacy' });
    expect(resolveFileOwner(root, 'repositories/acme/*/main.go', repos)).toHaveProperty('error');
    expect(resolveFileOwner(root, 'src/a.ts', repos)).toBeUndefined();
  });

  it('refuses absolute paths and unregistered paths outside the project', () => {
    const { root } = mkProject(['src/a.ts']);
    const repos = registeredRepositoryEntries(root);
    expect(resolveFileOwner(root, '/etc/passwd', repos)).toHaveProperty('error');
    expect(resolveFileOwner(root, '../elsewhere/x.ts', repos)).toHaveProperty('error');
  });

  it('normalizes separators, ./ and trailing slashes, and never matches a sibling prefix', () => {
    const { root } = mkProject(['src/a.ts']);
    const repos = registeredRepositoryEntries(root);
    expect(resolveFileOwner(root, 'libs\\core\\src\\a.ts', repos)).toEqual({ owner: 'libs/core', id: 'core' });
    expect(resolveFileOwner(root, './libs/core/', repos)).toEqual({ owner: 'libs/core', id: 'core' });
    expect(resolveFileOwner(root, 'libs/core2/a.ts', repos)).toBeUndefined();
  });

  it('refuses a glob that hides which registered repository owns the file', () => {
    const { root } = mkProject(['src/a.ts']);
    const repos = registeredRepositoryEntries(root);
    expect(resolveFileOwner(root, 'libs/*/src/a.ts', repos)).toHaveProperty('error');
    expect(resolveFileOwner(root, 'libs/**', repos)).toHaveProperty('error');
    expect(resolveFileOwner(root, '**/*.test.ts', repos)).toBeUndefined();
    expect(resolveFileOwner(root, 'src/*.ts', repos)).toBeUndefined();
  });

  it('matches an absolute registered path reached through a symlink', () => {
    const { base, root } = mkProject(['src/a.ts']);
    const link = path.join(base, 'mobile-link');
    fs.symlinkSync(path.join(base, 'mobile'), link);
    const config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
    config.workspace.repos = [{ id: 'mobile', path: link, prefix: 'MOB' }];
    fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify(config));
    expect(resolveFileOwner(fs.realpathSync(root), '../mobile-link/App.tsx', registeredRepositoryEntries(fs.realpathSync(root)))).toEqual({ owner: '../mobile-link', id: 'mobile' });
  });

  it('keeps a symlinked checkout inside the root under its registered path', () => {
    const { base, root } = mkProject(['src/a.ts']);
    fs.mkdirSync(path.join(base, 'shared', 'core'), { recursive: true });
    fs.rmSync(path.join(root, 'libs', 'core'), { recursive: true });
    fs.symlinkSync(path.join(base, 'shared', 'core'), path.join(root, 'libs', 'core'));
    const repos = registeredRepositoryEntries(root);
    expect(repos.find((r) => r.id === 'core')?.path).toBe('libs/core');
    expect(resolveFileOwner(root, 'libs/core/a.ts', repos)).toEqual({ owner: 'libs/core', id: 'core' });
  });

  it('reads umbrella.childRepos too', () => {
    const { root } = mkProject(['src/a.ts'], { workspace: undefined, umbrella: { enabled: true, childRepos: [{ id: 'svc', path: 'services/svc', prefix: 'SVC' }] } });
    expect(resolveFileOwner(root, 'services/svc/main.ts', registeredRepositoryEntries(root))).toEqual({ owner: 'services/svc', id: 'svc' });
  });
});

describe('strict close owners (1251 AC-02)', () => {
  it('runs owner commands keyed by path or registered id, for registered and conventional repositories', () => {
    const { root, inc } = mkProject(['libs/core/a.ts', '../web/b.ts', '../mobile/c.ts', 'repositories/acme/api/d.ts', 'repositories/acme/legacy/e.go', 'README.md']);
    const { checks, errors } = resolveOwnerChecks(root, loadTaskBoard(inc), readStrictClose(root)!);
    expect(errors).toEqual([]);
    expect(checks.map((c) => [c.cwd, c.cmd])).toEqual([
      ['../mobile', 'npm run test:mobile'],
      ['../web', 'npm run test:web'],
      ['libs/core', 'npm test'],
      ['repositories/acme/api', 'npm test'],
      ['repositories/acme/legacy', 'make test'],
    ]);
  });

  it('reports a registered repository without owner commands', () => {
    const { root, inc } = mkProject(['libs/core/a.ts'], { testing: { strictClose: true, ownerCommands: {} } });
    const { errors } = resolveOwnerChecks(root, loadTaskBoard(inc), readStrictClose(root)!);
    expect(errors).toEqual(['No testing.ownerCommands configured for libs/core']);
  });
});

describe('metadata.repositories (1251 AC-01)', () => {
  it('derives the Files owners, sorted, without the project root', () => {
    const { root, inc } = mkProject(['libs/core/a.ts', '../web/b.ts', 'src/root.ts', 'repositories/acme/legacy/x.go']);
    expect(deriveIncrementRepositories(root, loadTaskBoard(inc))).toEqual(['../web', 'libs/core', 'repositories/acme/legacy']);
  });

  it('task commands fill it, and repos --set keeps declared entries next to the Files owners', async () => {
    const { root, inc } = mkProject(['libs/core/a.ts', '../web/b.ts']);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const meta = () => JSON.parse(fs.readFileSync(path.join(inc, 'metadata.json'), 'utf-8'));
    expect(await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'a@h', commit: false })).toBe(0);
    expect(meta().repositories).toEqual(['../web', 'libs/core']);
    expect(await taskCommand('repos', undefined, undefined, { cwd: root, agent: 'a@h', set: 'mobile, ./tools/gen/' })).toBe(0);
    expect(meta().repositories).toEqual(['../web', 'libs/core', 'mobile', 'tools/gen']);
    expect(await taskCommand('repos', undefined, undefined, { cwd: root, agent: 'a@h', set: '/abs/path' })).toBe(2);
    expect(await taskCommand('repos', undefined, undefined, { cwd: root, agent: 'a@h', set: '' })).toBe(0);
    expect(meta().repositories).toEqual(['../web', 'libs/core']);
  });

  it('a bad hand-declared entry never fails a task command', async () => {
    const { root, inc } = mkProject(['libs/core/a.ts']);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const file = path.join(inc, 'metadata.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf-8')), repositories: ['/abs/path'] }));
    expect(await taskCommand('claim', 'T-01', undefined, { cwd: root, agent: 'a@h', commit: false })).toBe(0);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8')).repositories).toEqual(['/abs/path']);
  });

  it('an id and its path collapse to one entry, and an empty list is omitted', () => {
    const { root, inc } = mkProject(['src/a.ts']);
    expect(writeIncrementRepositories(root, inc, ['web', '../web'])).toEqual(['web']);
    expect(writeIncrementRepositories(root, inc, [], loadTaskBoard(inc))).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(inc, 'metadata.json'), 'utf-8'))).not.toHaveProperty('repositories');
  });
});
