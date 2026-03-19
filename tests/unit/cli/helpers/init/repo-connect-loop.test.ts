/**
 * Tests for promptRepoUrlsLoop — pattern-based init and add-more loop
 *
 * TDD Red: these tests define expected behavior before implementation.
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

const { mockInput, mockConfirm } = vi.hoisted(() => ({
  mockInput: vi.fn(),
  mockConfirm: vi.fn(),
}));

const { mockParseBulkSource, mockBuildBulkRepoList, mockGetAuthToken } = vi.hoisted(() => ({
  mockParseBulkSource: vi.fn(),
  mockBuildBulkRepoList: vi.fn(),
  mockGetAuthToken: vi.fn(),
}));

const { mockLaunchCloneJob } = vi.hoisted(() => ({
  mockLaunchCloneJob: vi.fn(),
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
  select: vi.fn(),
  input: mockInput,
  confirm: mockConfirm,
}));

vi.mock('../../../../../src/cli/helpers/get/bulk-get.js', () => ({
  parseBulkSource: mockParseBulkSource,
  buildBulkRepoList: mockBuildBulkRepoList,
  getAuthToken: mockGetAuthToken,
}));

vi.mock('../../../../../src/core/background/job-launcher.js', () => ({
  launchCloneJob: mockLaunchCloneJob,
}));

// Suppress console.log
vi.spyOn(console, 'log').mockImplementation(() => {});

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { promptRepoUrlsLoop } from '../../../../../src/cli/helpers/init/repo-connect.js';

// ============================================================================
// promptRepoUrlsLoop
// ============================================================================

describe('promptRepoUrlsLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  // TC-001: Individual repo input
  it('should handle individual repo input via foreground clone', async () => {
    mockInput.mockResolvedValueOnce('my-org/my-repo');
    mockConfirm.mockResolvedValueOnce(false);

    // parseBulkSource returns null for individual repos
    mockParseBulkSource.mockReturnValue(null);
    // runForegroundClone uses execFileNoThrowSync internally
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(mockParseBulkSource).toHaveBeenCalledWith('my-org/my-repo', {});
    expect(mockLaunchCloneJob).not.toHaveBeenCalled();
    expect(result.foregroundResults).toHaveLength(1);
    expect(result.foregroundResults[0].totalCloned).toBe(1);
    expect(result.jobIds).toHaveLength(0);
  });

  // TC-002: Glob pattern org/*
  it('should route glob pattern org/* to bulk clone path', async () => {
    mockInput.mockResolvedValueOnce('org/*');
    mockConfirm.mockResolvedValueOnce(false);

    mockParseBulkSource.mockReturnValue({ org: 'org', pattern: null });
    mockGetAuthToken.mockResolvedValue('ghp_test_token');
    mockBuildBulkRepoList.mockResolvedValue([
      { owner: 'org', name: 'repo-a', path: 'repositories/org/repo-a', cloneUrl: 'https://github.com/org/repo-a.git' },
      { owner: 'org', name: 'repo-b', path: 'repositories/org/repo-b', cloneUrl: 'https://github.com/org/repo-b.git' },
    ]);
    mockLaunchCloneJob.mockResolvedValue({
      job: { id: 'job-001' },
      isBackground: true,
    });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(mockParseBulkSource).toHaveBeenCalledWith('org/*', {});
    expect(mockGetAuthToken).toHaveBeenCalled();
    expect(mockBuildBulkRepoList).toHaveBeenCalledWith(
      'org', 'ghp_test_token', null,
      { noArchived: true, noForks: true },
    );
    expect(mockLaunchCloneJob).toHaveBeenCalledWith({
      projectPath: '/tmp/project',
      repositories: expect.arrayContaining([
        expect.objectContaining({ owner: 'org', name: 'repo-a' }),
      ]),
    });
    expect(result.jobIds).toContain('job-001');
  });

  // TC-003: Glob pattern with prefix org/prefix-*
  it('should forward prefix pattern to buildBulkRepoList', async () => {
    mockInput.mockResolvedValueOnce('org/prefix-*');
    mockConfirm.mockResolvedValueOnce(false);

    mockParseBulkSource.mockReturnValue({ org: 'org', pattern: 'prefix-*' });
    mockGetAuthToken.mockResolvedValue('ghp_test_token');
    mockBuildBulkRepoList.mockResolvedValue([
      { owner: 'org', name: 'prefix-api', path: 'repositories/org/prefix-api', cloneUrl: 'https://github.com/org/prefix-api.git' },
    ]);
    mockLaunchCloneJob.mockResolvedValue({
      job: { id: 'job-002' },
      isBackground: true,
    });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(mockBuildBulkRepoList).toHaveBeenCalledWith(
      'org', 'ghp_test_token', 'prefix-*',
      { noArchived: true, noForks: true },
    );
    expect(result.jobIds).toContain('job-002');
  });

  // TC-004: Mixed input — bulk + individual
  it('should handle mixed input with bulk and individual tokens', async () => {
    mockInput.mockResolvedValueOnce('org-a/* my-org/my-repo');
    mockConfirm.mockResolvedValueOnce(false);

    // First token: bulk, second token: individual
    mockParseBulkSource
      .mockReturnValueOnce({ org: 'org-a', pattern: null })
      .mockReturnValueOnce(null);

    mockGetAuthToken.mockResolvedValue('ghp_test_token');
    mockBuildBulkRepoList.mockResolvedValue([
      { owner: 'org-a', name: 'svc-1', path: 'repositories/org-a/svc-1', cloneUrl: 'https://github.com/org-a/svc-1.git' },
    ]);
    mockLaunchCloneJob.mockResolvedValue({
      job: { id: 'job-003' },
      isBackground: true,
    });

    // Individual path uses execFileNoThrowSync via runForegroundClone
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    // Bulk path executed
    expect(mockBuildBulkRepoList).toHaveBeenCalled();
    expect(mockLaunchCloneJob).toHaveBeenCalled();
    // Individual path executed (git clone via execFileNoThrowSync)
    expect(mockExecFileNoThrowSync).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['clone']),
      expect.any(Object),
    );
    // Both paths produced results
    expect(result.jobIds).toContain('job-003');
    expect(result.foregroundResults).toHaveLength(1);
  });

  // TC-005: Add-more loop continues on "yes"
  it('should continue loop when user answers "yes" to add more', async () => {
    // Round 1
    mockInput.mockResolvedValueOnce('org-a/repo-1');
    mockConfirm.mockResolvedValueOnce(true); // yes, add more
    // Round 2
    mockInput.mockResolvedValueOnce('org-b/repo-2');
    mockConfirm.mockResolvedValueOnce(false); // done

    mockParseBulkSource.mockReturnValue(null);
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(mockInput).toHaveBeenCalledTimes(2);
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(result.foregroundResults).toHaveLength(2);
  });

  // TC-006: Add-more loop stops on "no"
  it('should stop loop when user answers "no" to add more', async () => {
    mockInput.mockResolvedValueOnce('org/repo');
    mockConfirm.mockResolvedValueOnce(false);

    mockParseBulkSource.mockReturnValue(null);
    mockExecFileNoThrowSync.mockReturnValue({ success: true, stdout: '', stderr: '' });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(mockInput).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(result.foregroundResults).toHaveLength(1);
    expect(result.jobIds).toHaveLength(0);
  });

  // TC-007: Bulk clone returns job ID in jobIds array
  it('should include bulk job IDs in returned jobIds array', async () => {
    mockInput.mockResolvedValueOnce('org-x/*');
    mockConfirm.mockResolvedValueOnce(false);

    mockParseBulkSource.mockReturnValue({ org: 'org-x', pattern: null });
    mockGetAuthToken.mockResolvedValue('ghp_token');
    mockBuildBulkRepoList.mockResolvedValue([
      { owner: 'org-x', name: 'app', path: 'repositories/org-x/app', cloneUrl: 'https://github.com/org-x/app.git' },
    ]);
    mockLaunchCloneJob.mockResolvedValue({
      job: { id: 'bulk-job-42' },
      isBackground: true,
    });

    const result = await promptRepoUrlsLoop('/tmp/project', 'en');

    expect(result.jobIds).toEqual(['bulk-job-42']);
  });
});

// ============================================================================
// I18n strings for new prompts (TC-008, TC-009, TC-010)
// ============================================================================

describe('promptRepoUrlsLoop i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  // TC-008: English strings mention pattern support
  it('should use English prompt with pattern examples', async () => {
    mockInput.mockResolvedValueOnce('');
    mockConfirm.mockResolvedValueOnce(false);
    mockParseBulkSource.mockReturnValue(null);

    await promptRepoUrlsLoop('/tmp/project', 'en');

    const inputCall = mockInput.mock.calls[0][0];
    expect(inputCall.message).toBeDefined();
    expect(typeof inputCall.message).toBe('string');
    expect(inputCall.message).toMatch(/org\/\*/);
  });

  // TC-009: Russian strings present and non-empty
  it('should use Russian i18n strings for prompts', async () => {
    mockInput.mockResolvedValueOnce('');
    mockConfirm.mockResolvedValueOnce(false);
    mockParseBulkSource.mockReturnValue(null);

    await promptRepoUrlsLoop('/tmp/project', 'ru');

    const inputCall = mockInput.mock.calls[0][0];
    expect(inputCall.message).toBeDefined();
    expect(inputCall.message.length).toBeGreaterThan(0);
  });

  // TC-010: Spanish strings present and non-empty
  it('should use Spanish i18n strings for prompts', async () => {
    mockInput.mockResolvedValueOnce('');
    mockConfirm.mockResolvedValueOnce(false);
    mockParseBulkSource.mockReturnValue(null);

    await promptRepoUrlsLoop('/tmp/project', 'es');

    const inputCall = mockInput.mock.calls[0][0];
    expect(inputCall.message).toBeDefined();
    expect(inputCall.message.length).toBeGreaterThan(0);
  });
});
