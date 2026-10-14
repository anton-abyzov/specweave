import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import ts from 'typescript';
import { adoptRepository, previewAdoption, normalizeRemote } from '../../../src/core/workspace/adoption.js';
import { registerRepo } from '../../../src/cli/helpers/get/register-repo.js';
import { getCommand } from '../../../src/cli/commands/get.js';
import { sandbox, workspace, checkout, git, cleanup } from './fixtures.js';

afterEach(() => { vi.restoreAllMocks(); cleanup(); });
const read = (root: string) => JSON.parse(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8'));
describe('existing checkout adoption', () => {
  it.each([
    ['https://secret:password@GitHub.com/Org/API.git?token=secret#fragment', 'github.com/org/api'],
    ['git@github.com:Org/API.git', 'github.com/org/api'],
    ['ssh://git@gitlab.example:2222/Group/Sub/API.git', 'gitlab.example:2222/Group/Sub/API'],
    ['git://host/Owner/Repo.git/', 'host/Owner/Repo'],
    ['/local/path', undefined], ['file:///local/path', undefined], ['https://host/', undefined], ['https://host/a/has..dots', undefined],
  ])('normalizes %s without credentials', (input, expected) => expect(normalizeRemote(input)).toBe(expected));
  it('previews then adopts without changing history, dirty files, child config or untracked files', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning'), [], { customSetting: { preserved: true } });
    const repo = checkout(path.join(base, 'api'), 'git@github.com:owner/api.git');
    fs.writeFileSync(path.join(repo, 'tracked.txt'), 'before'); git(repo, ['add', 'tracked.txt']);
    git(repo, ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'initial']);
    workspace(repo, [], { customChild: true }); fs.writeFileSync(path.join(repo, 'tracked.txt'), 'dirty');
    fs.writeFileSync(path.join(repo, 'untracked.txt'), 'untracked');
    const before = [git(repo, ['rev-parse', 'HEAD']), git(repo, ['status', '--porcelain']), fs.readFileSync(path.join(repo, '.specweave/config.json'), 'utf8')];
    const oldRoot = fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8');
    const preview = await adoptRepository(root, repo, { dryRun: true });
    expect(preview.repository).toMatchObject({ id: 'owner-api', path: '../api', identity: 'github.com/owner/api' });
    expect(preview.childPlanningRoot).toBe(repo); expect(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).toBe(oldRoot);
    expect(fs.readdirSync(path.join(root, '.specweave'))).toEqual(['config.json']);
    await adoptRepository(root, repo, { expectedFingerprint: preview.fingerprint });
    expect(read(root).customSetting.preserved).toBe(true);
    expect([git(repo, ['rev-parse', 'HEAD']), git(repo, ['status', '--porcelain']), fs.readFileSync(path.join(repo, '.specweave/config.json'), 'utf8')]).toEqual(before);
    expect(fs.readFileSync(path.join(repo, 'tracked.txt'), 'utf8')).toBe('dirty');
    expect(fs.readFileSync(path.join(repo, 'untracked.txt'), 'utf8')).toBe('untracked');
    const applied = fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8');
    expect((await adoptRepository(root, repo)).action).toBe('already-registered');
    expect(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).toBe(applied);
  });
  it('keeps equal names across owners and separate clones of the same remote distinct', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning'));
    for (const [folder, remote] of [['a', 'https://github.com/a/api'], ['b', 'https://github.com/b/api'], ['copy', 'https://github.com/a/api']]) {
      await adoptRepository(root, checkout(path.join(base, folder), remote));
    }
    const repos = read(root).workspace.repos;
    expect(new Set(repos.map((r: any) => r.id)).size).toBe(3); expect(repos[0].id).toBe('a-api'); expect(repos[1].id).toBe('b-api');
    expect(repos[2].identity).toBe(repos[0].identity);
    fs.symlinkSync(path.join(base, 'a'), path.join(base, 'alias'));
    expect((await adoptRepository(root, path.join(base, 'alias'))).action).toBe('already-registered');
  });
  it('preserves legacy id and bindings, rejects changed origin and ambiguous physical registrations', async () => {
    const base = sandbox(), repo = checkout(path.join(base, 'api'), 'https://github.com/owner/api');
    const entry = { id: 'legacy', path: '../api', prefix: 'LEG', sync: { github: { owner: 'owner', repo: 'api' } } };
    const root = workspace(path.join(base, 'planning'), [entry]);
    expect((await adoptRepository(root, repo)).repository).toEqual(entry);
    git(repo, ['remote', 'set-url', 'origin', 'https://github.com/other/api']);
    await expect(adoptRepository(root, repo)).rejects.toThrow('origin changed');
    workspace(root, [entry, { ...entry, id: 'duplicate' }]);
    expect(() => previewAdoption(root, repo)).toThrow('Multiple workspace entries');
  });
  it('rejects stale config and origin previews without changing the config', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), repo = checkout(path.join(base, 'api'), 'https://github.com/a/api');
    const first = previewAdoption(root, repo); workspace(root, [], { changed: true });
    await expect(adoptRepository(root, repo, { expectedFingerprint: first.fingerprint })).rejects.toThrow('since preview');
    const second = previewAdoption(root, repo); git(repo, ['remote', 'set-url', 'origin', 'https://github.com/b/api']);
    await expect(adoptRepository(root, repo, { expectedFingerprint: second.fingerprint })).rejects.toThrow('since preview');
    expect(read(root).workspace.repos).toEqual([]);
  });
  it('adopts local-only repos, long namespaces and real Git worktrees without initializing them', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning'));
    const local = checkout(path.join(base, 'local')); expect((await adoptRepository(root, local)).repository.id).toBe('local');
    const long = checkout(path.join(base, 'long'), `https://gitlab.example/${'organization'.repeat(8)}/api`);
    const result = await adoptRepository(root, long, { role: 'backend', prefix: 'BE' }); expect(result.repository.id.length).toBeLessThanOrEqual(64);
    expect(result.repository.sync).toBeUndefined(); expect(result.repository.role).toBe('backend');
    git(local, ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-qm', 'initial']);
    const tree = path.join(base, 'tree'); git(local, ['worktree', 'add', '-q', tree, '-b', 'test-tree']);
    expect((await adoptRepository(root, tree)).action).toBe('register'); expect(fs.existsSync(path.join(tree, '.specweave'))).toBe(false);
  });
  it('rejects invalid inputs and never replaces corrupt config', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), repo = checkout(path.join(base, 'api'));
    expect(() => previewAdoption(root, path.join(base, 'missing'))).toThrow('does not exist');
    expect(() => previewAdoption(root, root)).toThrow('Not a Git');
    fs.mkdirSync(path.join(base, 'fake/.git'), { recursive: true }); expect(() => previewAdoption(root, path.join(base, 'fake'))).toThrow('Not a valid');
    expect(() => previewAdoption(root, repo, { prefix: 'way-too-long-prefix' })).toThrow('prefix');
    expect(() => previewAdoption(root, repo, { role: 'bad' })).toThrow('role');
    fs.writeFileSync(path.join(root, '.specweave/config.json'), 'broken'); await expect(adoptRepository(root, repo)).rejects.toThrow('Cannot read');
    expect(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).toBe('broken');
  });
  it('local get prints a machine-readable preview and apply never invokes child init', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), repo = workspace(checkout(path.join(base, 'api')));
    const cwd = process.cwd(); const output = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      process.chdir(root);
      await getCommand('../api', { dryRun: true, json: true });
      expect(JSON.parse(output.mock.calls[0][0]).action).toBe('register'); expect(read(root).workspace.repos).toEqual([]);
      await getCommand('../api', { json: true }); expect(read(root).workspace.repos).toHaveLength(1);
      expect(read(repo).workspace.repos).toEqual([]);
      await expect(getCommand('owner/repo', { dryRun: true })).rejects.toThrow('local checkout');
      await expect(getCommand('owner/*', { dryRun: true })).rejects.toThrow('local checkout');
    } finally { process.chdir(cwd); }
  });
  it('shares the adoption writer with remote-clone registration', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), repo = checkout(path.join(base, 'api'), 'https://github.com/owner/api');
    expect(await registerRepo(root, 'owner', 'api', '../api')).toEqual({ registered: true, alreadyRegistered: false });
    expect(await registerRepo(root, 'owner', 'api', '../api')).toEqual({ registered: false, alreadyRegistered: true });
  });
  it('waits for an active registration lock and never removes another writer lock on timeout', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), repo = checkout(path.join(base, 'api'));
    const lock = path.join(root, '.specweave/config.json.adoption.lock');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    const release = setTimeout(() => fs.unlinkSync(lock), 40);
    try { expect((await adoptRepository(root, repo)).action).toBe('register'); } finally { clearTimeout(release); }
    fs.writeFileSync(lock, 'another writer');
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(20000);
    await expect(adoptRepository(root, repo)).rejects.toThrow('registration is locked');
    expect(fs.readFileSync(lock, 'utf8')).toBe('another writer');
  });
  it('serializes real independent processes so no registrations are lost', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning')), compiled = path.join(base, 'compiled'); fs.mkdirSync(compiled);
    fs.writeFileSync(path.join(compiled, 'package.json'), '{"type":"module"}');
    for (const name of ['context', 'adoption']) {
      const source = fs.readFileSync(path.resolve(`src/core/workspace/${name}.ts`), 'utf8');
      fs.writeFileSync(path.join(compiled, `${name}.js`), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText);
    }
    const worker = path.join(compiled, 'worker.js');
    fs.writeFileSync(worker, "import {adoptRepository} from './adoption.js'; await adoptRepository(process.argv[2], process.argv[3]);");
    const repos = Array.from({ length: 6 }, (_, i) => checkout(path.join(base, `repo-${i}`), `https://github.com/owner/repo-${i}`));
    const run = (repo: string) => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [worker, root, repo], { stdio: ['ignore', 'ignore', 'pipe'] }); let stderr = '';
      child.stderr.on('data', chunk => stderr += chunk); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
    });
    await Promise.all([...repos, repos[0]].map(run));
    expect(read(root).workspace.repos).toHaveLength(6); expect(fs.readdirSync(path.join(root, '.specweave'))).toEqual(['config.json']);
  }, 20000);
});
