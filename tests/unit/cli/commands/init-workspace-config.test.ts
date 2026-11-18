/**
 * The workspace block init writes (T-023, T-024): a `workspace` key, never
 * the 1.x `umbrella`, and repository entries with forward-slash paths.
 */

import { describe, it, expect } from 'vitest';
import { buildWorkspaceConfig } from '../../../../src/cli/helpers/init/path-utils.js';

const discovery = {
  isUmbrella: true,
  repositoriesDir: '/tmp/test/repositories',
  orgs: ['acme'],
  repos: [{ org: 'acme', name: 'frontend', path: 'repositories/acme/frontend', hasGit: true }],
  totalRepoCount: 1,
};

describe('init workspace config writing (T-023/T-024)', () => {
  it('returns a workspace key, not umbrella, with empty sync defaults per entry', () => {
    const result = buildWorkspaceConfig(discovery as never, 'my-project');
    expect(result.workspace.repos[0].sync).toEqual({});
    expect(result).not.toHaveProperty('umbrella');
    expect(result).not.toHaveProperty('multiProject');
    expect(result).not.toHaveProperty('projectMappings');
  });

  it('writes repository paths with forward slashes', () => {
    const result = buildWorkspaceConfig(discovery as never, 'my-project');
    expect(result.workspace.repos[0].path).toBe('repositories/acme/frontend');
  });
});
