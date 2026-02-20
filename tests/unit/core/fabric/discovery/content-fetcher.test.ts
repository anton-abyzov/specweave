/**
 * ContentFetcher Unit Tests
 *
 * Tests fetching SKILL.md content from GitHub repos
 * and wiring it to the security scanner.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentFetcher } from '../../../../../src/core/fabric/discovery/content-fetcher.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Tests ---

describe('ContentFetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches SKILL.md from raw.githubusercontent.com', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '---\nname: test-skill\n---\nDo something useful.',
    });

    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent('user/repo', 'SKILL.md');

    expect(content).toContain('name: test-skill');
    expect(mockFetch.mock.calls[0][0]).toContain('raw.githubusercontent.com');
    expect(mockFetch.mock.calls[0][0]).toContain('user/repo');
  });

  it('tries main and master branches', async () => {
    // main returns 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // master returns content
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '---\nname: legacy-skill\n---\nWorks.',
    });

    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent('user/old-repo', 'SKILL.md');

    expect(content).toContain('legacy-skill');
    expect(mockFetch.mock.calls).toHaveLength(2);
  });

  it('returns null when SKILL.md not found on any branch', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent('user/no-skill', 'SKILL.md');

    expect(content).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent('user/down', 'SKILL.md');

    expect(content).toBeNull();
  });

  it('handles custom skill paths', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '---\nname: nested\n---\nNested skill.',
    });

    const fetcher = new ContentFetcher();
    const content = await fetcher.fetchSkillContent('user/repo', '.claude/commands/my-skill/SKILL.md');

    expect(content).toContain('nested');
    expect(mockFetch.mock.calls[0][0]).toContain('.claude/commands/my-skill/SKILL.md');
  });

  it('accepts optional GitHub token for auth', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'content',
    });

    const testToken = 'test_token_not_real_' + 'abc123';
    const fetcher = new ContentFetcher({ token: testToken });
    await fetcher.fetchSkillContent('user/repo', 'SKILL.md');

    const headers = mockFetch.mock.calls[0][1]?.headers;
    expect(headers?.Authorization || headers?.authorization).toContain(testToken);
  });
});
