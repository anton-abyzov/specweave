/**
 * Tests for GitHubClientV2 searchIssuesByFeature session cache (US-003)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExecFileNoThrow } = vi.hoisted(() => ({
  mockExecFileNoThrow: vi.fn(),
}));

vi.mock('../../../plugins/specweave/lib/vendor/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Import after mocks
import { GitHubClientV2 } from '../../../plugins/specweave/lib/integrations/github/github-client-v2.js';

function makeClient() {
  return GitHubClientV2.fromRepo('test-owner', 'test-repo');
}

describe('GitHubClientV2 searchIssuesByFeature cache', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalDateNow = Date.now;
    // Clear static caches between tests
    (GitHubClientV2 as any).searchCache?.clear?.();
    (GitHubClientV2 as any).issueCache?.clear?.();
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  it('should call execFileNoThrow on first search (cache miss)', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([{ number: 1, title: '[FS-100][US-001] Test', state: 'open' }]),
    });

    const client = makeClient();
    const result = await client.searchIssuesByFeature('FS-100');

    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('should return cached result on second call within TTL (cache hit)', async () => {
    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([{ number: 1, title: '[FS-100][US-001] Test', state: 'open' }]),
    });

    const client = makeClient();
    await client.searchIssuesByFeature('FS-100');
    await client.searchIssuesByFeature('FS-100');

    // Should only call execFileNoThrow once — second call uses cache
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(1);
  });

  it('should re-fetch after TTL expires (cache expiry)', async () => {
    let now = 1000000;
    Date.now = () => now;

    mockExecFileNoThrow.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify([{ number: 1, title: '[FS-100][US-001] Test', state: 'open' }]),
    });

    const client = makeClient();
    await client.searchIssuesByFeature('FS-100');

    // Advance past 30s TTL
    now += 31_000;

    await client.searchIssuesByFeature('FS-100');

    // Should call execFileNoThrow twice — cache expired
    expect(mockExecFileNoThrow).toHaveBeenCalledTimes(2);
  });
});
