/**
 * Unit tests for repo-connect helpers
 *
 * Tests: parseRepoInput (pure), cloneReposIntoWorkspace (mocked git),
 * promptProjectSetup (2-choice prompt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockExecFileNoThrowSync } = vi.hoisted(() => ({
  mockExecFileNoThrowSync: vi.fn(),
}));

const { mockExistsSync, mockMkdirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockMkdirSync: vi.fn(),
}));

const { mockSelect, mockInput } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue('clone-repos'),
  mockInput: vi.fn(),
}));

// ============================================================================
// vi.mock() declarations
// ============================================================================

vi.mock('../../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrowSync: mockExecFileNoThrowSync,
}));

vi.mock('../../../../../src/utils/fs-native.js', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      return new Proxy(identity, handler);
    },
    apply(_target, _this, args) { return String(args[0]); },
  };
  return { default: new Proxy(identity, handler) };
});

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { parseRepoInput, cloneReposIntoWorkspace, promptProjectSetup } from '../../../../../src/cli/helpers/init/repo-connect.js';

// ============================================================================
// parseRepoInput
// ============================================================================

describe('parseRepoInput', () => {
  it('should parse org/repo shorthand', () => {
    const result = parseRepoInput('my-org/my-repo');
    expect(result).toEqual([
      { org: 'my-org', name: 'my-repo', cloneUrl: 'https://github.com/my-org/my-repo.git' },
    ]);
  });

  it('should parse HTTPS GitHub URL', () => {
    const result = parseRepoInput('https://github.com/acme/widget.git');
    expect(result).toEqual([
      { org: 'acme', name: 'widget', cloneUrl: 'https://github.com/acme/widget.git' },
    ]);
  });

  it('should parse HTTPS URL without .git suffix', () => {
    const result = parseRepoInput('https://github.com/acme/widget');
    expect(result).toEqual([
      { org: 'acme', name: 'widget', cloneUrl: 'https://github.com/acme/widget.git' },
    ]);
  });

  it('should parse SSH GitHub URL', () => {
    const result = parseRepoInput('git@github.com:acme/widget.git');
    expect(result).toEqual([
      { org: 'acme', name: 'widget', cloneUrl: 'https://github.com/acme/widget.git' },
    ]);
  });

  it('should parse multiple repos (space-separated)', () => {
    const result = parseRepoInput('org1/repo1 org2/repo2');
    expect(result).toHaveLength(2);
    expect(result[0].org).toBe('org1');
    expect(result[0].name).toBe('repo1');
    expect(result[1].org).toBe('org2');
    expect(result[1].name).toBe('repo2');
  });

  it('should parse multiple repos (comma-separated)', () => {
    const result = parseRepoInput('org1/repo1, org2/repo2');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('repo1');
    expect(result[1].name).toBe('repo2');
  });

  it('should parse mixed formats', () => {
    const result = parseRepoInput('org/short https://github.com/org/https-repo git@github.com:org/ssh-repo.git');
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('short');
    expect(result[1].name).toBe('https-repo');
    expect(result[2].name).toBe('ssh-repo');
  });

  it('should skip invalid tokens', () => {
    const result = parseRepoInput('not-a-url');
    expect(result).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(parseRepoInput('')).toEqual([]);
    expect(parseRepoInput('   ')).toEqual([]);
  });

  it('should handle repos with dots and underscores in names', () => {
    const result = parseRepoInput('org/my_repo.js');
    expect(result).toEqual([
      { org: 'org', name: 'my_repo.js', cloneUrl: 'https://github.com/org/my_repo.js.git' },
    ]);
  });
});

// ============================================================================
// cloneReposIntoWorkspace
// ============================================================================

describe('cloneReposIntoWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should clone repos into repositories/{org}/{name}', () => {
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = cloneReposIntoWorkspace('/workspace', [
      { org: 'acme', name: 'api', cloneUrl: 'https://github.com/acme/api.git' },
    ]);

    expect(result.totalCloned).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('repositories/acme'),
      { recursive: true },
    );
    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'git',
      ['clone', 'https://github.com/acme/api.git', 'api'],
      { cwd: expect.stringContaining('repositories/acme') },
    );
  });

  it('should handle partial failures', () => {
    mockExecFileNoThrowSync
      .mockReturnValueOnce({ success: true, stdout: '', stderr: '' })
      .mockReturnValueOnce({ success: false, stdout: '', stderr: 'fatal: repo not found' });

    const result = cloneReposIntoWorkspace('/workspace', [
      { org: 'acme', name: 'api', cloneUrl: 'https://github.com/acme/api.git' },
      { org: 'acme', name: 'bad', cloneUrl: 'https://github.com/acme/bad.git' },
    ]);

    expect(result.totalCloned).toBe(1);
    expect(result.totalFailed).toBe(1);
    expect(result.repos[1].error).toContain('repo not found');
  });

  it('should skip already-cloned repos', () => {
    mockExistsSync.mockImplementation((p: string) => {
      return typeof p === 'string' && p.includes('already-there');
    });

    const result = cloneReposIntoWorkspace('/workspace', [
      { org: 'acme', name: 'already-there', cloneUrl: 'https://github.com/acme/already-there.git' },
    ]);

    expect(result.totalCloned).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(mockExecFileNoThrowSync).not.toHaveBeenCalled();
  });

  it('should sanitize PAT tokens from error messages', () => {
    mockExecFileNoThrowSync.mockReturnValue({
      success: false,
      stdout: '',
      stderr: 'fatal: https://user:ghp_secret123@github.com/acme/repo.git not found',
    });

    const result = cloneReposIntoWorkspace('/workspace', [
      { org: 'acme', name: 'repo', cloneUrl: 'https://github.com/acme/repo.git' },
    ]);

    expect(result.repos[0].error).not.toContain('ghp_secret123');
    expect(result.repos[0].error).toContain('***');
  });

  it('should return correct paths in results', () => {
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = cloneReposIntoWorkspace('/workspace', [
      { org: 'my-org', name: 'my-repo', cloneUrl: 'https://github.com/my-org/my-repo.git' },
    ]);

    expect(result.repos[0].path).toBe('repositories/my-org/my-repo');
  });
});

// ============================================================================
// promptProjectSetup — 2-choice prompt
// ============================================================================

describe('promptProjectSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call select with exactly 2 choices', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    expect(mockSelect).toHaveBeenCalledTimes(1);
    const callArgs = mockSelect.mock.calls[0][0];
    expect(callArgs.choices).toHaveLength(2);
  });

  it('should offer "clone-repos" and "add-later" as the only values', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    const callArgs = mockSelect.mock.calls[0][0];
    const values = callArgs.choices.map((c: any) => c.value);
    expect(values).toEqual(['clone-repos', 'add-later']);
  });

  it('should NOT offer "existing", "scratch", or "multi-repo-deferred" choices', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    const callArgs = mockSelect.mock.calls[0][0];
    const values = callArgs.choices.map((c: any) => c.value);
    expect(values).not.toContain('existing');
    expect(values).not.toContain('scratch');
    expect(values).not.toContain('multi-repo-deferred');
  });

  it('should not ask "How would you like to set up your code?"', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    const callArgs = mockSelect.mock.calls[0][0];
    expect(callArgs.message).not.toContain('How would you like to set up your code?');
  });

  it('should ask "Which repositories to connect?"', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    const callArgs = mockSelect.mock.calls[0][0];
    expect(callArgs.message).toContain('Which repositories to connect?');
  });

  it('should default to clone-repos', async () => {
    mockSelect.mockResolvedValue('clone-repos');

    await promptProjectSetup('en');

    const callArgs = mockSelect.mock.calls[0][0];
    expect(callArgs.default).toBe('clone-repos');
  });

  it('should return the selected value', async () => {
    mockSelect.mockResolvedValue('add-later');

    const result = await promptProjectSetup('en');

    expect(result).toBe('add-later');
  });
});
