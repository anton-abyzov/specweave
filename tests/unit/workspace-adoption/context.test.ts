import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { explicitWorkspaceRoot, readWorkspaceConfig, registeredRepositories, isWithin, isWorkspaceRoot } from '../../../src/core/workspace/context.js';
import { findEffectiveRoot, findProjectRoot } from '../../../src/utils/find-project-root.js';
import { findProjectRoot as hookRoot, extractIncrementId, readActiveIncrements } from '../../../src/core/hooks/handlers/utils.js';
import { hookRouter } from '../../../src/core/hooks/handlers/hook-router.js';
import { findNestedCheckouts } from '../../../src/core/session/nested-repos.js';
import { buildHandoffIndex } from '../../../src/core/session/handoff-all.js';
import { scanWorkspaceRepos, buildWorkspaceConfig, detectUmbrellaParent } from '../../../src/cli/helpers/init/path-utils.js';
import { sandbox, workspace, checkout, cleanup } from './fixtures.js';

afterEach(cleanup);
describe('one planning context across layouts', () => {
  it.each(['flat', 'sibling', 'external'])('resolves explicit %s membership consistently in CLI and hooks', shape => {
    const base = sandbox(); const root = path.join(base, 'planning');
    const repo = checkout(shape === 'flat' ? path.join(root, 'api') : path.join(base, shape, 'api'));
    workspace(root, [{ id: 'api', path: path.relative(root, repo), prefix: 'API' }]);
    process.env.SPECWEAVE_WORKSPACE = root;
    expect(findEffectiveRoot(repo)).toBe(root); expect(findProjectRoot(repo)).toBe(root); expect(hookRoot(repo)).toBe(root);
    expect(findNestedCheckouts(root)).toEqual([repo]);
  });
  it('automatically resolves a configured nested repo without imposing repositories/', () => {
    const root = workspace(path.join(sandbox(), 'planning'), [{ id: 'api', path: 'code/api' }]);
    const repo = checkout(path.join(root, 'code/api')); workspace(repo);
    expect(findEffectiveRoot(repo)).toBe(root); expect(hookRoot(repo)).toBe(root);
  });
  it('does not override an independently initialized unregistered child', () => {
    const root = workspace(path.join(sandbox(), 'planning'), [{ id: 'other', path: 'other' }]);
    const child = workspace(checkout(path.join(root, 'independent')));
    fs.mkdirSync(path.join(child, '.specweave/increments/0001-existing'), { recursive: true });
    expect(findEffectiveRoot(child)).toBe(child);
  });
  it('requires an explicit choice when a registered child already has increments', () => {
    const root = workspace(path.join(sandbox(), 'planning'), [{ id: 'api', path: 'api' }]);
    const child = workspace(checkout(path.join(root, 'api')));
    fs.mkdirSync(path.join(child, '.specweave/increments/0001-existing'), { recursive: true });
    expect(() => findEffectiveRoot(child)).toThrow('Conflicting planning roots');
    process.env.SPECWEAVE_WORKSPACE = root; expect(hookRoot(child)).toBe(root);
    process.env.SPECWEAVE_WORKSPACE = child; expect(findEffectiveRoot(child)).toBe(child);
  });
  it('fails closed for bad explicit roots and nonmembers, including symlink escapes', () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning'));
    const outside = checkout(path.join(base, 'outside'));
    fs.symlinkSync(outside, path.join(root, 'escape'));
    expect(() => explicitWorkspaceRoot(path.join(root, 'escape'), root)).toThrow('not a member');
    expect(() => explicitWorkspaceRoot(outside, root)).toThrow('not a member');
    expect(explicitWorkspaceRoot(outside, root, false)).toBe(root);
    expect(() => explicitWorkspaceRoot(root, '')).toThrow('must name');
    expect(() => explicitWorkspaceRoot(root, path.join(base, 'missing'))).toThrow('does not exist');
    process.env.SPECWEAVE_WORKSPACE = outside; expect(() => findEffectiveRoot(root)).toThrow('Cannot read');
    expect(() => explicitWorkspaceRoot(path.join(base, 'missing'), root)).toThrow('Working directory does not exist');
  });
  it('reports invalid hook context without falling back or writing another workspace', async () => {
    const root = workspace(sandbox());
    const before = fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8');
    process.env.SPECWEAVE_WORKSPACE = path.join(root, 'missing');
    const result = await hookRouter('session-start', JSON.stringify({ cwd: root }));
    expect(result.systemMessage).toContain('SpecWeave planning context error: Workspace does not exist');
    expect(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8')).toBe(before);
    expect(fs.readdirSync(path.join(root, '.specweave'))).toEqual(['config.json']);
  });
  it('rejects malformed inventories, ignores missing checkouts without deleting registrations', () => {
    const root = workspace(sandbox(), [{ id: 'gone', path: 'gone', prefix: 'GON' }]);
    expect(registeredRepositories(root)).toEqual([]);
    const discovered = scanWorkspaceRepos(root)!;
    expect(discovered.repos[0].hasGit).toBe(false);
    expect(buildWorkspaceConfig(discovered, 'test').workspace.repos[0].id).toBe('gone');
    for (const invalid of ['null', '[]', '{', JSON.stringify({ workspace: {} }), JSON.stringify({ workspace: { repos: [{ id: 'x', path: '' }] } })]) {
      fs.writeFileSync(path.join(root, '.specweave/config.json'), invalid);
      expect(() => readWorkspaceConfig(root)).toThrow();
    }
  });
  it('preserves registered ids and sync settings during discovery, deduplicates linked paths', () => {
    const root = workspace(sandbox()); const repo = checkout(path.join(root, 'repositories/org/api'));
    workspace(root, [{ id: 'old-id', path: 'repositories/org/api', prefix: 'OLD', identity: 'github.com/org/api', sync: { github: { owner: 'org', repo: 'api' } } }]);
    fs.symlinkSync(repo, path.join(root, 'alias'));
    expect(findNestedCheckouts(root)).toEqual([repo]);
    const result = scanWorkspaceRepos(root)!;
    expect(result.totalRepoCount).toBe(1);
    expect(buildWorkspaceConfig(result, 'test').workspace.repos[0]).toMatchObject({ id: 'old-id', prefix: 'OLD', identity: 'github.com/org/api' });
  });
  it('deduplicates registered symlink aliases during init discovery', () => {
    const root = workspace(sandbox()); const repo = checkout(path.join(root, 'repositories/org/api'));
    fs.symlinkSync(repo, path.join(root, 'alias'));
    workspace(root, [{ id: 'old-id', path: 'alias', prefix: 'OLD' }]);
    const discovered = scanWorkspaceRepos(root)!;
    expect(discovered.totalRepoCount).toBe(1);
    expect(buildWorkspaceConfig(discovered, 'test').workspace.repos[0].path).toBe('alias');
  });
  it('uses physical membership for configured init ancestry', () => {
    const root = workspace(sandbox()); const repo = checkout(path.join(root, 'code/api'));
    fs.symlinkSync(repo, path.join(root, 'alias'));
    workspace(root, [{ id: 'api', path: 'alias', prefix: 'API' }]);
    expect(detectUmbrellaParent(repo)?.umbrellaRoot).toBe(root);
  });
  it('includes configured sibling repositories in handoff without a repositories directory', async () => {
    const base = sandbox(), root = workspace(path.join(base, 'planning'), [{ id: 'api', path: '../api' }]);
    checkout(path.join(base, 'api'));
    const index = await buildHandoffIndex(root, { prLookup: false });
    expect(index.repos?.scanned).toBe(1);
  });
  it('keeps standalone and conventional workspaces and bounded path semantics', () => {
    const root = workspace(sandbox()); expect(findEffectiveRoot(root)).toBe(root); expect(isWorkspaceRoot(root)).toBe(false);
    const repo = checkout(path.join(root, 'repositories/org/api')); expect(findNestedCheckouts(root)).toEqual([repo]);
    expect(findEffectiveRoot(repo)).toBe(root); expect(isWorkspaceRoot(root)).toBe(true);
    expect(isWithin('/root', '/root-sibling')).toBe(false); expect(isWithin('/root', '/root/child')).toBe(true);
  });
  it('preserves explicit legacy umbrella flags without requiring a repositories directory', () => {
    const root = workspace(sandbox(), [], { umbrella: { enabled: true, childRepos: [] } });
    const child = workspace(checkout(path.join(root, 'api')));
    expect(findEffectiveRoot(child)).toBe(root);
  });
  it('uses numeric increment parsing in hooks, including wider and legacy imported IDs', () => {
    const root = workspace(sandbox());
    for (const id of ['10000-new', '9999-last', '12000G-import', '0009E-old']) {
      const dir = path.join(root, '.specweave/increments', id); fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'metadata.json'), '{"status":"active"}');
      expect(extractIncrementId(path.join(dir, 'spec.md'))).toBe(id);
    }
    expect(readActiveIncrements(root)).toEqual(['0009E-old', '9999-last', '10000-new', '12000G-import']);
    expect(extractIncrementId('.specweave/increments/not-an-increment/spec.md')).toBe('unknown');
  });
});
