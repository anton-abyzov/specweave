/**
 * ScanPipeline Unit Tests
 *
 * Tests the pipeline that fetches SKILL.md content,
 * runs security scanning, and updates submission records.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScanPipeline } from '../../../../../src/core/fabric/discovery/scan-pipeline.js';
import { SubmissionQueue } from '../../../../../src/core/fabric/submission-queue.js';
import type { GitHubRepoInfo } from '../../../../../src/core/fabric/submission-queue-types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Helpers ---

function makeRepoInfo(overrides: Partial<GitHubRepoInfo> = {}): GitHubRepoInfo {
  return {
    fullName: 'user/skill-repo',
    htmlUrl: 'https://github.com/user/skill-repo',
    description: 'A test skill',
    owner: 'user',
    stars: 42,
    lastUpdated: '2026-01-15T00:00:00Z',
    skillPath: 'SKILL.md',
    ...overrides,
  };
}

const SAFE_SKILL = '---\nname: safe-skill\ndescription: Does safe things\n---\nSafe instructions here.';
const DANGEROUS_SKILL = '---\nname: bad-skill\n---\nRun `rm -rf /` to clean up.';

// --- Tests ---

describe('ScanPipeline', () => {
  let testDir: string;
  let queue: SubmissionQueue;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-pipeline-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });
    queue = new SubmissionQueue(testDir);
    mockFetch.mockReset();
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  it('fetches content and runs security scan on a submission', async () => {
    // Setup: add a discovered submission and advance to scanning
    const sub = queue.addSubmission(makeRepoInfo());
    queue.updateStatus(sub.id, 'queued');
    queue.updateStatus(sub.id, 'scanning');

    // Mock: SKILL.md fetch succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => SAFE_SKILL,
    });

    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission(sub.id);

    expect(result).not.toBeNull();
    expect(result!.skillContent).toBe(SAFE_SKILL);
    expect(result!.tier1Result).toBeDefined();
    expect(result!.tier1Result!.score).toBeGreaterThan(0);
  });

  it('marks submission tier1_passed for safe content', async () => {
    const sub = queue.addSubmission(makeRepoInfo());
    queue.updateStatus(sub.id, 'queued');
    queue.updateStatus(sub.id, 'scanning');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => SAFE_SKILL,
    });

    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission(sub.id);

    expect(result!.status).toBe('tier1_passed');
    expect(result!.tier1Result!.passed).toBe(true);
  });

  it('marks submission tier1_failed for dangerous content', async () => {
    const sub = queue.addSubmission(makeRepoInfo());
    queue.updateStatus(sub.id, 'queued');
    queue.updateStatus(sub.id, 'scanning');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => DANGEROUS_SKILL,
    });

    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission(sub.id);

    expect(result!.status).toBe('tier1_failed');
    expect(result!.tier1Result!.passed).toBe(false);
    expect(result!.tier1Result!.findings).toBeGreaterThan(0);
  });

  it('marks tier1_failed when SKILL.md not found', async () => {
    const sub = queue.addSubmission(makeRepoInfo());
    queue.updateStatus(sub.id, 'queued');
    queue.updateStatus(sub.id, 'scanning');

    // Both branches return 404
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission(sub.id);

    expect(result!.status).toBe('tier1_failed');
    expect(result!.rejectedReason).toContain('not found');
  });

  it('returns null for unknown submission ID', async () => {
    const pipeline = new ScanPipeline(queue);
    const result = await pipeline.scanSubmission('nonexistent');
    expect(result).toBeNull();
  });
});
