/**
 * Unit tests for role and prefix collection
 *
 * Tests the interactive role/prefix assignment flow
 * and parent repo selection that runs AFTER repo discovery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  mockSelect,
  mockInput,
  mockConfirm,
  mockValidatePrefix,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
  mockValidatePrefix: vi.fn().mockReturnValue({ valid: true, normalized: 'FE' }),
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
  confirm: mockConfirm,
}));

vi.mock('../../../../src/core/repo-structure/prefix-validator.js', () => ({
  validatePrefix: mockValidatePrefix,
  ROLE_PREFIX_DEFAULTS: {
    frontend: 'FE',
    backend: 'BE',
    mobile: 'MOB',
    infra: 'INFRA',
    shared: 'SHARED',
    other: 'MISC',
  },
  RESERVED_PREFIXES: ['US', 'FS', 'EP', 'T', 'AC'],
}));

vi.mock('chalk', () => {
  const identity = (s: any) => String(s);
  const handler: ProxyHandler<any> = {
    get: (_target, _prop) => {
      const fn: any = identity;
      fn.bold = identity;
      return new Proxy(fn, handler);
    },
    apply: (_target, _thisArg, args) => String(args[0])
  };
  const chalkProxy = new Proxy(identity, handler);
  return { default: chalkProxy };
});

import {
  collectRolesAndPrefixes,
  promptParentRepo,
  type RepoWithRolePrefix,
} from '../../../../src/core/repo-structure/role-prefix-collector.js';

describe('role-prefix-collector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectRolesAndPrefixes', () => {
    it('should ask role and prefix for each repo', async () => {
      const repos = [
        { id: 'acme-frontend', name: 'acme-frontend', owner: 'acme' },
        { id: 'acme-api', name: 'acme-api', owner: 'acme' },
      ];

      // Repo 1: role = frontend, prefix = FE (default)
      mockSelect.mockResolvedValueOnce('frontend');
      mockInput.mockResolvedValueOnce('FE');
      mockValidatePrefix.mockReturnValueOnce({ valid: true, normalized: 'FE' });

      // Repo 2: role = backend, prefix = BE (default)
      mockSelect.mockResolvedValueOnce('backend');
      mockInput.mockResolvedValueOnce('BE');
      mockValidatePrefix.mockReturnValueOnce({ valid: true, normalized: 'BE' });

      const result = await collectRolesAndPrefixes(repos);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'acme-frontend',
        role: 'frontend',
        storyPrefix: 'FE',
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        id: 'acme-api',
        role: 'backend',
        storyPrefix: 'BE',
      }));
    });

    it('should provide role-based default prefix suggestion', async () => {
      const repos = [
        { id: 'my-app', name: 'my-app', owner: 'org' },
      ];

      mockSelect.mockResolvedValueOnce('mobile');
      mockInput.mockResolvedValueOnce('MOB');
      mockValidatePrefix.mockReturnValueOnce({ valid: true, normalized: 'MOB' });

      await collectRolesAndPrefixes(repos);

      // Check that input was called with default prefix from role
      expect(mockInput).toHaveBeenCalledWith(
        expect.objectContaining({
          default: 'MOB',
        })
      );
    });

    it('should reject invalid prefix and re-prompt', async () => {
      const repos = [
        { id: 'repo', name: 'repo', owner: 'org' },
      ];

      mockSelect.mockResolvedValueOnce('frontend');

      // First attempt: invalid (reserved)
      // The validate function in the input prompt will call validatePrefix
      // We need to simulate the inquirer validation behavior
      mockValidatePrefix
        .mockReturnValueOnce({ valid: false, error: '"US" is reserved' })
        .mockReturnValueOnce({ valid: true, normalized: 'FE' });

      mockInput.mockResolvedValueOnce('FE');

      const result = await collectRolesAndPrefixes(repos);
      expect(result[0].storyPrefix).toBe('FE');
    });

    it('should track used prefixes across repos for uniqueness', async () => {
      const repos = [
        { id: 'repo-a', name: 'repo-a', owner: 'org' },
        { id: 'repo-b', name: 'repo-b', owner: 'org' },
      ];

      mockSelect
        .mockResolvedValueOnce('frontend')
        .mockResolvedValueOnce('backend');

      mockInput
        .mockResolvedValueOnce('FE')  // Repo A gets FE
        .mockResolvedValueOnce('BE'); // Repo B gets BE

      mockValidatePrefix
        .mockReturnValueOnce({ valid: true, normalized: 'FE' })
        .mockReturnValueOnce({ valid: true, normalized: 'BE' });

      const result = await collectRolesAndPrefixes(repos);

      // Second call to validatePrefix should have FE in usedPrefixes
      expect(mockValidatePrefix).toHaveBeenCalledTimes(2);
      // Second call should pass set containing 'FE'
      const secondCall = mockValidatePrefix.mock.calls[1];
      expect(secondCall[1]).toContain('FE');
    });

    it('should return empty array for empty input', async () => {
      const result = await collectRolesAndPrefixes([]);
      expect(result).toEqual([]);
    });

    it('should preserve original repo fields', async () => {
      const repos = [
        { id: 'repo', name: 'my-repo', owner: 'org', extra: 'keep' },
      ];

      mockSelect.mockResolvedValueOnce('infra');
      mockInput.mockResolvedValueOnce('INFRA');
      mockValidatePrefix.mockReturnValueOnce({ valid: true, normalized: 'INFRA' });

      const result = await collectRolesAndPrefixes(repos);

      expect(result[0].id).toBe('repo');
      expect(result[0].name).toBe('my-repo');
      expect(result[0].owner).toBe('org');
    });
  });

  describe('promptParentRepo', () => {
    it('should return undefined when user declines parent repo', async () => {
      const repos = [
        { id: 'repo-a', name: 'repo-a' },
        { id: 'repo-b', name: 'repo-b' },
      ];

      mockConfirm.mockResolvedValueOnce(false);

      const result = await promptParentRepo(repos);
      expect(result).toBeUndefined();
    });

    it('should return selected repo id when user wants parent repo', async () => {
      const repos = [
        { id: 'acme-specs', name: 'acme-specs' },
        { id: 'acme-frontend', name: 'acme-frontend' },
        { id: 'acme-api', name: 'acme-api' },
      ];

      mockConfirm.mockResolvedValueOnce(true);  // Yes, want parent repo
      mockSelect.mockResolvedValueOnce('acme-specs'); // Select which repo

      const result = await promptParentRepo(repos);
      expect(result).toBe('acme-specs');
    });

    it('should offer all repos as parent repo options', async () => {
      const repos = [
        { id: 'repo-a', name: 'Repo A' },
        { id: 'repo-b', name: 'Repo B' },
        { id: 'repo-c', name: 'Repo C' },
      ];

      mockConfirm.mockResolvedValueOnce(true);
      mockSelect.mockResolvedValueOnce('repo-b');

      await promptParentRepo(repos);

      // Verify select was called with choices for all repos
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          choices: expect.arrayContaining([
            expect.objectContaining({ value: 'repo-a' }),
            expect.objectContaining({ value: 'repo-b' }),
            expect.objectContaining({ value: 'repo-c' }),
          ]),
        })
      );
    });

    it('should return undefined for empty repos array', async () => {
      const result = await promptParentRepo([]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for single repo (no point in parent)', async () => {
      const repos = [{ id: 'only-repo', name: 'only-repo' }];
      const result = await promptParentRepo(repos);
      expect(result).toBeUndefined();
    });
  });
});
