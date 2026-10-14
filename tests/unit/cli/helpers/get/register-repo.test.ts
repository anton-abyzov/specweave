import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerRepo } from '../../../../../src/cli/helpers/get/register-repo.js';
import { sandbox, workspace, checkout, cleanup } from '../../../workspace-adoption/fixtures.js';
afterEach(cleanup);
const read = (root: string) => JSON.parse(fs.readFileSync(path.join(root, '.specweave/config.json'), 'utf8'));
function setup(legacy = false) {
  const root = workspace(sandbox());
  const repoPath = 'repositories/org/my-service';
  checkout(path.join(root, repoPath), 'https://github.com/org/my-service');
  if (legacy) fs.writeFileSync(path.join(root, '.specweave/config.json'), JSON.stringify({ umbrella: { childRepos: [] } }));
  return { root, repoPath };
}
describe('registerRepo real filesystem behavior', () => {
  it('AC-US3-04: preserves an existing legacy child repo id and returns already registered', async () => {
    const { root, repoPath } = setup(true); const config = read(root);
    config.umbrella.childRepos.push({ id: 'my-service', path: repoPath, prefix: 'MYR' });
    fs.writeFileSync(path.join(root, '.specweave/config.json'), JSON.stringify(config));
    expect(await registerRepo(root, 'org', 'my-service', repoPath)).toEqual({ registered: false, alreadyRegistered: true });
    expect(read(root)).toEqual(config);
  });
  it('preserves an existing workspace entry', async () => {
    const { root, repoPath } = setup(); const entry = { id: 'old-id', path: repoPath, prefix: 'MYR' };
    workspace(root, [entry]); expect((await registerRepo(root, 'org', 'my-service', repoPath)).alreadyRegistered).toBe(true);
    expect(read(root).workspace.repos).toEqual([entry]);
  });
  it('registers owner-qualified identity, prefix, role and sync in workspace.repos', async () => {
    const { root, repoPath } = setup();
    await registerRepo(root, 'org', 'my-service', repoPath, { prefix: 'BE', role: 'backend', githubUrl: 'https://github.com/org/my-service' });
    expect(read(root).workspace.repos).toEqual([expect.objectContaining({ id: 'org-my-service', path: repoPath,
      prefix: 'BE', role: 'backend', identity: 'github.com/org/my-service', sync: { github: { owner: 'org', repo: 'my-service' } } })]);
  });
  it('AC-US3-01: adds a legacy-config checkout to the unified inventory', async () => {
    const { root, repoPath } = setup(true); await registerRepo(root, 'org', 'my-service', repoPath);
    expect(read(root).workspace.repos[0]).toMatchObject({ id: 'org-my-service', path: repoPath, name: 'my-service' });
  });
  it('AC-US3-02: uses the supplied prefix', async () => {
    const { root, repoPath } = setup(); await registerRepo(root, 'org', 'my-service', repoPath, { prefix: 'BE' });
    expect(read(root).workspace.repos[0].prefix).toBe('BE');
  });
  it('AC-US3-03: defaults prefix to three uppercase alphanumeric characters', async () => {
    const { root, repoPath } = setup(); await registerRepo(root, 'org', 'my-service', repoPath);
    expect(read(root).workspace.repos[0].prefix).toBe('MYS');
  });
  it('AC-US3-05: preserves the provided role', async () => {
    const { root, repoPath } = setup(); await registerRepo(root, 'org', 'my-service', repoPath, { role: 'backend' });
    expect(read(root).workspace.repos[0].role).toBe('backend');
  });
  it('returns registered=true on success', async () => {
    const { root, repoPath } = setup(); expect(await registerRepo(root, 'org', 'my-service', repoPath)).toEqual({ registered: true, alreadyRegistered: false });
  });
  it('rejects a missing config instead of creating or overwriting workspace state', async () => {
    const { root, repoPath } = setup(); fs.unlinkSync(path.join(root, '.specweave/config.json'));
    await expect(registerRepo(root, 'org', 'my-service', repoPath)).rejects.toThrow('Cannot read workspace');
    expect(fs.readdirSync(path.join(root, '.specweave'))).toEqual([]);
  });
});
