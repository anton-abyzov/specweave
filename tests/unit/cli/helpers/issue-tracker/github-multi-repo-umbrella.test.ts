/**
 * Tests for umbrella mode in github-multi-repo (T-016 / T-017)
 *
 * AC-US2-03: Rate-limited GitHub API → falls back to config-based detection
 * AC-US2-04: Auto-detection shows detected child repo count
 * AC-US2-01: Architecture question skipped in umbrella mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock inquirer
const mockSelect = vi.fn();
const mockInput = vi.fn();
const mockConfirm = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  select: (...args: any[]) => mockSelect(...args),
  input: (...args: any[]) => mockInput(...args),
  confirm: (...args: any[]) => mockConfirm(...args),
  number: vi.fn(),
}));

// Mock ora
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  }),
}));

// Mock git-detector
vi.mock('../../../../../src/utils/git-detector.js', () => ({
  detectGitHubRemotes: vi.fn().mockResolvedValue([]),
  detectPrimaryGitHubRemote: vi.fn().mockResolvedValue(null),
  hasMultipleGitHubRemotes: vi.fn().mockReturnValue(false),
  formatGitRemote: vi.fn(),
  getUniqueRepositories: vi.fn().mockReturnValue([]),
}));

// Mock auth-helpers
vi.mock('../../../../../src/utils/auth-helpers.js', () => ({
  getGitHubAuth: vi.fn().mockResolvedValue('fake-token'),
}));

// Mock RepoStructureManager
const mockPromptStructure = vi.fn();
const mockCreateRepositories = vi.fn();
const mockInitializeLocalRepos = vi.fn();
const mockCreateSpecWeaveStructure = vi.fn();

vi.mock('../../../../../src/core/repo-structure/repo-structure-manager.js', () => ({
  RepoStructureManager: class {
    promptStructure = mockPromptStructure;
    createRepositories = mockCreateRepositories;
    initializeLocalRepos = mockInitializeLocalRepos;
    createSpecWeaveStructure = mockCreateSpecWeaveStructure;
  },
}));

import { promptGitHubSetupType } from '../../../../../src/cli/helpers/issue-tracker/github-multi-repo.js';

describe('GitHub multi-repo umbrella mode (T-016 / T-017)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-gh-umb-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // AC-US2-01 + AC-US2-03: umbrella mode with pre-selected architecture skips question
  it('should use pre-selected architecture when repositoryHosting is github', async () => {
    // When repositoryHosting = 'github', it maps to preSelectedArchitecture = 'github-parent'
    // RepoStructureManager.promptStructure should be called with 'github-parent'
    mockPromptStructure.mockResolvedValue({
      architecture: 'multi-repo',
      urlType: 'ssh',
      platform: 'github',
      provider: { config: { name: 'GitHub' } },
      repositories: [
        { id: 'specweave', name: 'specweave', owner: 'anton-abyzov', description: '', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
        { id: 'vskill', name: 'vskill', owner: 'anton-abyzov', description: '', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
      ],
    });

    const result = await promptGitHubSetupType(tempDir, 'fake-token', 'github');

    expect(result.setupType).toBe('multiple');
    expect(result.profiles).toHaveLength(2);
    expect(mockPromptStructure).toHaveBeenCalledWith('github-parent', 'github', undefined);
  });

  // AC-US2-03: Rate-limit fallback — promptStructure fails → graceful fallback
  it('should fall back gracefully when promptStructure fails (e.g., API rate limit)', async () => {
    mockPromptStructure.mockRejectedValue(new Error('HTTP 403 rate limited'));

    const result = await promptGitHubSetupType(tempDir, 'fake-token', 'github');

    // Should fall back to 'multiple' setup type without crashing
    expect(result.setupType).toBe('multiple');
  });

  // AC-US2-04: Detected repos are returned in profiles
  it('should return detected child repos as profiles', async () => {
    mockPromptStructure.mockResolvedValue({
      architecture: 'multi-repo',
      urlType: 'ssh',
      platform: 'github',
      provider: { config: { name: 'GitHub' } },
      repositories: [
        { id: 'specweave', name: 'specweave', owner: 'a', description: 'Main CLI', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
        { id: 'vskill', name: 'vskill', owner: 'a', description: 'Skill CLI', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
      ],
    });

    const result = await promptGitHubSetupType(tempDir, 'fake-token', 'github');

    expect(result.profiles).toBeDefined();
    expect(result.profiles!.length).toBe(2);
    expect(result.profiles![0].id).toBe('specweave');
    expect(result.profiles![1].id).toBe('vskill');
    expect(result.profiles![0].isDefault).toBe(true); // First is default
  });

  // T-017: E2E wizard integration in umbrella mode
  it('should complete full wizard flow in umbrella mode without architecture question', async () => {
    mockPromptStructure.mockResolvedValue({
      architecture: 'multi-repo',
      urlType: 'ssh',
      platform: 'github',
      provider: { config: { name: 'GitHub' } },
      repositories: [
        { id: 'specweave', name: 'specweave', owner: 'a', description: '', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
        { id: 'vskill', name: 'vskill', owner: 'a', description: '', path: '.', visibility: 'private', createOnGitHub: false, isNested: false },
      ],
    });

    const result = await promptGitHubSetupType(tempDir, 'fake-token', 'github');

    // Verify complete flow
    expect(result.setupType).toBe('multiple');
    expect(result.profiles).toHaveLength(2);
    expect(mockPromptStructure).toHaveBeenCalledTimes(1);
    // No interactive prompts should have been called for architecture
    // (select was not called for architecture choice)
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
