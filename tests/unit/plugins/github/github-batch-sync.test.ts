/**
 * Unit tests for batchSyncAllSpecs (TDD)
 *
 * Tests the batch sync function that discovers all specs and syncs
 * them sequentially, returning an aggregated summary.
 *
 * @see T-008: Implement batch sync-all mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockGlob = vi.hoisted(() => vi.fn());
vi.mock('glob', () => ({
  glob: mockGlob,
}));

const mockReadFile = vi.hoisted(() => vi.fn());
vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

const { MockOrchestrator, mockSyncSpec } = vi.hoisted(() => {
  const mockSyncSpec = vi.fn();
  const MockOrchestrator = vi.fn().mockImplementation(function () {
    return { syncSpec: mockSyncSpec };
  });
  return { MockOrchestrator, mockSyncSpec };
});
vi.mock('../../../../plugins/specweave-github/lib/github-sync-orchestrator.js', () => ({
  GitHubSyncOrchestrator: MockOrchestrator,
}));

import {
  batchSyncAllSpecs,
  type BatchSyncConfig,
  type BatchSyncResult,
} from '../../../../plugins/specweave-github/lib/github-batch-sync.js';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const TEST_TOKEN = 'test-tok' + 'en-dummy'; // split to avoid secret scanner
const DEFAULT_CONFIG: BatchSyncConfig = {
  owner: 'test-owner',
  repo: 'test-repo',
  workspaceRoot: '/project',
};

function makeSpecContent(
  userStories: Array<{ id: string; title: string; description?: string; acs: Array<{ id: string; desc: string; done: boolean }> }>,
): string {
  let content = '---\ntitle: Test Spec\n---\n\n# Spec\n\n';
  for (const us of userStories) {
    content += `### ${us.id}: ${us.title}\n`;
    if (us.description) {
      content += `${us.description}\n`;
    }
    content += '\n**Acceptance Criteria**:\n';
    for (const ac of us.acs) {
      const check = ac.done ? 'x' : ' ';
      content += `- [${check}] **${ac.id}**: ${ac.desc}\n`;
    }
    content += '\n';
  }
  return content;
}

function makeSyncResult(created: number, updated: number, errors: number = 0) {
  return {
    pushResult: {
      created: Array.from({ length: created }, (_, i) => ({
        userStoryId: `US-${String(i + 1).padStart(3, '0')}`,
        issueNumber: 100 + i,
        issueUrl: `https://github.com/test-owner/test-repo/issues/${100 + i}`,
        issueNodeId: `I_kwDO${i}`,
      })),
      updated: Array.from({ length: updated }, (_, i) => ({
        userStoryId: `US-${String(created + i + 1).padStart(3, '0')}`,
        issueNumber: 200 + i,
        issueUrl: `https://github.com/test-owner/test-repo/issues/${200 + i}`,
      })),
      errors: Array.from({ length: errors }, (_, i) => ({
        userStoryId: `US-ERR-${i}`,
        error: 'test error',
      })),
    },
    frontmatterResult: {
      syncStatus: errors > 0 ? 'dirty' : 'synced' as const,
      userStories: {},
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('batchSyncAllSpecs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Discovers specs via glob pattern
  // -------------------------------------------------------------------------
  it('should discover spec files using glob pattern', async () => {
    mockGlob.mockResolvedValue([]);

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(mockGlob).toHaveBeenCalledTimes(1);
    expect(mockGlob).toHaveBeenCalledWith(
      '**/spec-*.md',
      expect.objectContaining({
        cwd: '/project/.specweave/docs/internal/specs',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 2. Syncs each spec sequentially
  // -------------------------------------------------------------------------
  it('should sync each discovered spec sequentially', async () => {
    mockGlob.mockResolvedValue([
      'default/spec-auth.md',
      'default/spec-dashboard.md',
      'default/spec-settings.md',
    ]);

    const specContent = makeSpecContent([
      { id: 'US-001', title: 'Auth', acs: [{ id: 'AC-US1-01', desc: 'Login', done: false }] },
    ]);

    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(mockSyncSpec).toHaveBeenCalledTimes(3);
    expect(result.specsProcessed).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 3. Aggregates created and updated counts
  // -------------------------------------------------------------------------
  it('should aggregate created and updated issue counts', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md', 'default/spec-b.md']);

    const specContent = makeSpecContent([
      { id: 'US-001', title: 'Story', acs: [{ id: 'AC-US1-01', desc: 'AC', done: false }] },
    ]);
    mockReadFile.mockResolvedValue(specContent);

    // Spec A: 2 created, 1 updated
    mockSyncSpec.mockResolvedValueOnce(makeSyncResult(2, 1));
    // Spec B: 1 created, 0 updated
    mockSyncSpec.mockResolvedValueOnce(makeSyncResult(1, 0));

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(result.totalIssuesCreated).toBe(3);
    expect(result.totalIssuesUpdated).toBe(1);
    expect(result.specsProcessed).toBe(2);
    expect(result.specsFailed).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 4. Continues when a spec sync fails
  // -------------------------------------------------------------------------
  it('should continue processing other specs when one fails', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md', 'default/spec-b.md']);

    const specContent = makeSpecContent([
      { id: 'US-001', title: 'Story', acs: [{ id: 'AC-US1-01', desc: 'AC', done: false }] },
    ]);
    mockReadFile.mockResolvedValue(specContent);

    // Spec A: fails
    mockSyncSpec.mockRejectedValueOnce(new Error('Network error'));
    // Spec B: succeeds
    mockSyncSpec.mockResolvedValueOnce(makeSyncResult(1, 0));

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(result.specsProcessed).toBe(2);
    expect(result.specsFailed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Network error');
    expect(result.totalIssuesCreated).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 5. Returns empty result when no specs found
  // -------------------------------------------------------------------------
  it('should return empty result when no specs found', async () => {
    mockGlob.mockResolvedValue([]);

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(result.specsProcessed).toBe(0);
    expect(result.totalIssuesCreated).toBe(0);
    expect(result.totalIssuesUpdated).toBe(0);
    expect(result.specsFailed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(mockSyncSpec).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. Passes orchestrator config through
  // -------------------------------------------------------------------------
  it('should create orchestrator with the provided config', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    const specContent = makeSpecContent([
      { id: 'US-001', title: 'Story', acs: [{ id: 'AC-US1-01', desc: 'AC', done: false }] },
    ]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    await batchSyncAllSpecs({
      ...DEFAULT_CONFIG,
      token: TEST_TOKEN,
      projectV2Enabled: true,
      projectV2Number: 5,
    });

    expect(MockOrchestrator).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
        token: TEST_TOKEN,
        projectV2Enabled: true,
        projectV2Number: 5,
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 7. Generates human-readable summary
  // -------------------------------------------------------------------------
  it('should generate a summary string', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md', 'default/spec-b.md', 'default/spec-c.md']);
    const specContent = makeSpecContent([
      { id: 'US-001', title: 'Story', acs: [{ id: 'AC-US1-01', desc: 'AC', done: false }] },
    ]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(2, 1));

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(result.summary).toContain('3/3');
    expect(result.summary).toContain('6');
    expect(result.summary).toContain('3');
  });

  // -------------------------------------------------------------------------
  // 8. Handles spec parse errors gracefully
  // -------------------------------------------------------------------------
  it('should handle spec file read errors gracefully', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

    const result = await batchSyncAllSpecs(DEFAULT_CONFIG);

    expect(result.specsProcessed).toBe(1);
    expect(result.specsFailed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 9. Extracts user stories from spec content
  // -------------------------------------------------------------------------
  it('should extract user stories from spec content and pass to orchestrator', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);

    const specContent = makeSpecContent([
      {
        id: 'US-001',
        title: 'User login',
        acs: [
          { id: 'AC-US1-01', desc: 'User can log in', done: false },
          { id: 'AC-US1-02', desc: 'Error shown on failure', done: true },
        ],
      },
      {
        id: 'US-002',
        title: 'Dashboard',
        acs: [
          { id: 'AC-US2-01', desc: 'Dashboard loads', done: false },
        ],
      },
    ]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(2, 0));

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    const syncCall = mockSyncSpec.mock.calls[0];
    const userStories = syncCall[1];

    expect(userStories).toHaveLength(2);
    expect(userStories[0]).toEqual(
      expect.objectContaining({
        id: 'US-001',
        title: 'User login',
      }),
    );
    expect(userStories[0].acceptanceCriteria).toHaveLength(2);
    expect(userStories[1]).toEqual(
      expect.objectContaining({
        id: 'US-002',
        title: 'Dashboard',
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 10. Description extraction — narrative format
  // -------------------------------------------------------------------------
  it('should extract plain narrative description from user story', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    const specContent = makeSpecContent([{
      id: 'US-001',
      title: 'SKILL.md Verification',
      description: 'As the system, repos found by topic/keyword search must have their SKILL.md verified before being submitted.',
      acs: [{ id: 'AC-US1-01', desc: 'Verify SKILL.md', done: false }],
    }]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    const userStories = mockSyncSpec.mock.calls[0][1];
    expect(userStories[0].description).toContain('As the system, repos found by topic/keyword search');
  });

  // -------------------------------------------------------------------------
  // 11. Description extraction — bold structured format
  // -------------------------------------------------------------------------
  it('should extract bold As a/I want/So that description', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    const specContent = makeSpecContent([{
      id: 'US-001',
      title: 'Login',
      description: '**As a** user\n**I want** to log in\n**So that** I can access my account',
      acs: [{ id: 'AC-US1-01', desc: 'Login works', done: false }],
    }]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    const userStories = mockSyncSpec.mock.calls[0][1];
    expect(userStories[0].description).toContain('**As a** user');
    expect(userStories[0].description).toContain('**I want** to log in');
  });

  // -------------------------------------------------------------------------
  // 12. Description excludes metadata lines
  // -------------------------------------------------------------------------
  it('should not include Project/Board metadata in description', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    const specContent = makeSpecContent([{
      id: 'US-001',
      title: 'Login',
      description: '**Project**: frontend-app\nAs a user, I want to log in.',
      acs: [{ id: 'AC-US1-01', desc: 'Login works', done: false }],
    }]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    const userStories = mockSyncSpec.mock.calls[0][1];
    expect(userStories[0].description).not.toContain('**Project**');
    expect(userStories[0].description).toContain('As a user, I want to log in.');
  });

  // -------------------------------------------------------------------------
  // 13. No description produces empty string
  // -------------------------------------------------------------------------
  it('should return empty description when no text between header and ACs', async () => {
    mockGlob.mockResolvedValue(['default/spec-a.md']);
    const specContent = makeSpecContent([{
      id: 'US-001',
      title: 'Quick Story',
      acs: [{ id: 'AC-US1-01', desc: 'Works', done: false }],
    }]);
    mockReadFile.mockResolvedValue(specContent);
    mockSyncSpec.mockResolvedValue(makeSyncResult(1, 0));

    await batchSyncAllSpecs(DEFAULT_CONFIG);

    const userStories = mockSyncSpec.mock.calls[0][1];
    expect(userStories[0].description).toBe('');
  });
});
