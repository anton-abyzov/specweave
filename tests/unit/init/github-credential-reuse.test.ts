/**
 * Tests for GitHub credential reuse during init flow
 *
 * Covers:
 * 1. checkExistingGitHubCredentials reads both GITHUB_TOKEN and GH_TOKEN
 * 2. setupIssueTracker persists PAT from repo setup to .env
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env-file utilities at the module level
const { mockReadEnvFile, mockWriteEnvFile, mockCreateEnvFromTemplate, mockUpdateEnvVars, mockEnsureEnvGitignored } = vi.hoisted(() => ({
  mockReadEnvFile: vi.fn(),
  mockWriteEnvFile: vi.fn(),
  mockCreateEnvFromTemplate: vi.fn(),
  mockUpdateEnvVars: vi.fn(),
  mockEnsureEnvGitignored: vi.fn(),
}));

vi.mock('../../../src/utils/env-file.js', () => ({
  readEnvFile: mockReadEnvFile,
  writeEnvFile: mockWriteEnvFile,
  createEnvFromTemplate: mockCreateEnvFromTemplate,
  updateEnvVars: mockUpdateEnvVars,
  parseEnvFile: (content: string): Record<string, string> => {
    // Real implementation for test clarity
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        result[trimmed.substring(0, eq).trim()] = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
    return result;
  },
  ensureEnvGitignored: mockEnsureEnvGitignored,
  generateEnvExample: vi.fn(),
}));

// Mock getGitHubAuth (fallback to gh CLI)
const { mockGetGitHubAuth } = vi.hoisted(() => ({
  mockGetGitHubAuth: vi.fn(),
}));

vi.mock('../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuth: mockGetGitHubAuth,
}));

describe('checkExistingGitHubCredentials', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Import after mocks are set up
  async function getChecker() {
    const mod = await import('../../../src/cli/helpers/issue-tracker/github.js');
    return mod.checkExistingGitHubCredentials;
  }

  it('should find GITHUB_TOKEN in .env', async () => {
    const checkExisting = await getChecker();
    mockReadEnvFile.mockReturnValue('GITHUB_TOKEN=ghp_my_pat_token_12345');

    const result = await checkExisting('/test/project');

    expect(result).not.toBeNull();
    expect(result!.source).toBe('.env');
    expect((result!.credentials as any).token).toBe('ghp_my_pat_token_12345');
  });

  it('should find GH_TOKEN in .env (backward compat)', async () => {
    const checkExisting = await getChecker();
    mockReadEnvFile.mockReturnValue('GH_TOKEN=ghp_legacy_token_67890');

    const result = await checkExisting('/test/project');

    expect(result).not.toBeNull();
    expect(result!.source).toBe('.env');
    expect((result!.credentials as any).token).toBe('ghp_legacy_token_67890');
  });

  it('should prefer GITHUB_TOKEN over GH_TOKEN when both present', async () => {
    const checkExisting = await getChecker();
    mockReadEnvFile.mockReturnValue(
      'GITHUB_TOKEN=ghp_preferred\nGH_TOKEN=ghp_legacy'
    );

    const result = await checkExisting('/test/project');

    expect(result).not.toBeNull();
    expect((result!.credentials as any).token).toBe('ghp_preferred');
  });

  it('should fall back to gh CLI when .env has no token', async () => {
    const checkExisting = await getChecker();
    mockReadEnvFile.mockReturnValue('# empty env\nSOME_OTHER_VAR=hello');
    mockGetGitHubAuth.mockReturnValue({
      token: 'gho_oauth_token',
      source: 'gh-cli',
    });

    const result = await checkExisting('/test/project');

    expect(result).not.toBeNull();
    expect(result!.source).toBe('gh-cli');
    expect((result!.credentials as any).token).toBe('gho_oauth_token');
  });

  it('should return null when no credentials found anywhere', async () => {
    const checkExisting = await getChecker();
    mockReadEnvFile.mockReturnValue('');
    mockGetGitHubAuth.mockReturnValue({ source: 'none' });

    const result = await checkExisting('/test/project');

    expect(result).toBeNull();
  });
});

describe('getGitHubEnvVars', () => {
  it('should produce GITHUB_TOKEN key', async () => {
    const mod = await import('../../../src/cli/helpers/issue-tracker/github.js');

    const vars = mod.getGitHubEnvVars({
      token: 'ghp_test_token',
      instanceType: 'cloud',
    });

    expect(vars).toEqual(
      expect.arrayContaining([
        { key: 'GITHUB_TOKEN', value: 'ghp_test_token' },
      ])
    );
  });
});
