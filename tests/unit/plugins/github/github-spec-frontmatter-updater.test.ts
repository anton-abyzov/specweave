/**
 * Unit tests for updateSpecFrontmatter (RED phase - TDD)
 *
 * Tests the spec frontmatter updater that records GitHub issue links
 * in spec.md YAML frontmatter after push sync completes.
 *
 * Expected module: plugins/specweave-github/lib/github-spec-frontmatter-updater.ts (does NOT exist yet)
 *
 * The module should:
 * - Read spec.md, parse YAML frontmatter
 * - Merge PushSyncResult into externalLinks.github section
 * - Set syncStatus based on errors
 * - Write updated frontmatter back to file
 * - Return the updated GitHubSyncMetadata
 *
 * @see T-007: Spec frontmatter update after GitHub sync
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (vi.hoisted + vi.mock for ESM)
// ---------------------------------------------------------------------------

const mockReadFile = vi.hoisted(() => vi.fn());
const mockWriteFile = vi.hoisted(() => vi.fn());
vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

// RED phase import — module does NOT exist yet
import {
  updateSpecFrontmatter,
} from '../../../../plugins/specweave-github/lib/github-spec-frontmatter-updater.js';

import type {
  PushSyncResult,
} from '../../../../plugins/specweave-github/lib/github-push-sync.js';

import type {
  GitHubSyncMetadata,
} from '../../../../src/core/types/sync-profile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a spec.md string with YAML frontmatter and markdown body */
function makeSpecContent(frontmatter: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(yamlStringify(frontmatter));
  lines.push('---');
  lines.push('');
  lines.push('# My Feature Spec');
  lines.push('');
  lines.push('## User Stories');
  lines.push('');
  lines.push('### US-001: User authentication');
  lines.push('Users should be able to log in.');
  return lines.join('\n');
}

/** Minimal YAML stringifier for test fixtures (key: value pairs) */
function yamlStringify(obj: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      parts.push(`${prefix}${key}: null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      parts.push(`${prefix}${key}:`);
      parts.push(yamlStringify(value as Record<string, unknown>, indent + 1));
    } else if (typeof value === 'string') {
      parts.push(`${prefix}${key}: "${value}"`);
    } else {
      parts.push(`${prefix}${key}: ${value}`);
    }
  }
  return parts.join('\n');
}

/** Build a default PushSyncResult fixture */
function makeSyncResult(overrides: Partial<PushSyncResult> = {}): PushSyncResult {
  return {
    created: [],
    updated: [],
    errors: [],
    ...overrides,
  };
}

/** Extract the frontmatter object from the content written via mockWriteFile */
function getWrittenFrontmatter(): Record<string, unknown> {
  const writeCall = mockWriteFile.mock.calls[0];
  const writtenContent = writeCall[1] as string;

  // Parse frontmatter between --- delimiters
  const match = writtenContent.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('No YAML frontmatter found in written content');
  }

  // Use simple line-based parsing for test verification
  // The implementation will use proper YAML; we just need to check values
  return parseSimpleYaml(match[1]);
}

/** Simple YAML parser for test verification (handles nested keys with dot notation) */
function parseSimpleYaml(yamlStr: string): Record<string, unknown> {
  // For test verification, we'll parse the written content as YAML
  // Since the implementation will use js-yaml or gray-matter,
  // we import it dynamically for verification
  const lines = yamlStr.split('\n');
  const result: Record<string, unknown> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | number | boolean | null = trimmed.slice(colonIdx + 1).trim();
    if (value === 'null') {
      result[key] = null;
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (/^\d+$/.test(value)) {
      result[key] = parseInt(value, 10);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      result[key] = value.slice(1, -1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const SPEC_PATH = '/project/.specweave/docs/internal/specs/default/spec-auth.md';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateSpecFrontmatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // 1. Creates new frontmatter section when none exists
  // -------------------------------------------------------------------------
  it('should create externalLinks.github section when none exists in frontmatter', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      status: 'in-progress',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 42,
          issueUrl: 'https://github.com/owner/repo/issues/42',
          issueNodeId: 'I_kwDOTest42',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should have called readFile with the spec path
    expect(mockReadFile).toHaveBeenCalledWith(SPEC_PATH, 'utf-8');

    // Should have written back to the same path
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile.mock.calls[0][0]).toBe(SPEC_PATH);

    // Result should contain the new metadata
    expect(result.syncStatus).toBe('synced');
    expect(result.userStories).toBeDefined();
    expect(result.userStories['US-001']).toBeDefined();
    expect(result.userStories['US-001'].issueNumber).toBe(42);
    expect(result.userStories['US-001'].issueUrl).toBe('https://github.com/owner/repo/issues/42');
    expect(result.userStories['US-001'].issueNodeId).toBe('I_kwDOTest42');
  });

  // -------------------------------------------------------------------------
  // 2. Merges created issues into existing frontmatter
  // -------------------------------------------------------------------------
  it('should merge newly created issues into existing externalLinks.github section', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          userStories: {
            'US-001': {
              issueNumber: 10,
              issueUrl: 'https://github.com/owner/repo/issues/10',
              issueNodeId: 'I_kwDOOld10',
              syncedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-002',
          issueNumber: 43,
          issueUrl: 'https://github.com/owner/repo/issues/43',
          issueNodeId: 'I_kwDOTest43',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should preserve existing US-001 and add US-002
    expect(result.userStories['US-001']).toBeDefined();
    expect(result.userStories['US-001'].issueNumber).toBe(10);
    expect(result.userStories['US-002']).toBeDefined();
    expect(result.userStories['US-002'].issueNumber).toBe(43);
    expect(result.userStories['US-002'].issueUrl).toBe('https://github.com/owner/repo/issues/43');
    expect(result.userStories['US-002'].issueNodeId).toBe('I_kwDOTest43');
  });

  // -------------------------------------------------------------------------
  // 3. Updates existing user story links for updated issues
  // -------------------------------------------------------------------------
  it('should update existing user story links when issues are updated', async () => {
    const oldSyncedAt = '2026-01-01T00:00:00.000Z';
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          userStories: {
            'US-001': {
              issueNumber: 10,
              issueUrl: 'https://github.com/owner/repo/issues/10',
              issueNodeId: 'I_kwDOOld10',
              syncedAt: oldSyncedAt,
            },
          },
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      updated: [
        {
          userStoryId: 'US-001',
          issueNumber: 10,
          issueUrl: 'https://github.com/owner/repo/issues/10',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should update the existing link
    expect(result.userStories['US-001']).toBeDefined();
    expect(result.userStories['US-001'].issueNumber).toBe(10);
    expect(result.userStories['US-001'].issueUrl).toBe('https://github.com/owner/repo/issues/10');

    // syncedAt should be updated to a newer timestamp
    expect(result.userStories['US-001'].syncedAt).not.toBe(oldSyncedAt);
    // Verify it's a valid ISO timestamp
    expect(new Date(result.userStories['US-001'].syncedAt).getTime()).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 4. Sets syncStatus to 'synced' when no errors
  // -------------------------------------------------------------------------
  it('should set syncStatus to synced when there are no errors', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 1,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNodeId: 'I_kwDO1',
        },
      ],
      updated: [
        {
          userStoryId: 'US-002',
          issueNumber: 2,
          issueUrl: 'https://github.com/owner/repo/issues/2',
        },
      ],
      errors: [],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    expect(result.syncStatus).toBe('synced');
  });

  // -------------------------------------------------------------------------
  // 5. Sets syncStatus to 'dirty' when there are errors
  // -------------------------------------------------------------------------
  it('should set syncStatus to dirty when there are sync errors', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 1,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNodeId: 'I_kwDO1',
        },
      ],
      errors: [
        {
          userStoryId: 'US-002',
          error: 'HTTP 422: Validation Failed',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    expect(result.syncStatus).toBe('dirty');
  });

  // -------------------------------------------------------------------------
  // 6. Preserves existing user story links not in current sync
  // -------------------------------------------------------------------------
  it('should preserve existing user story links that are not part of current sync', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          userStories: {
            'US-001': {
              issueNumber: 10,
              issueUrl: 'https://github.com/owner/repo/issues/10',
              issueNodeId: 'I_kwDOOld10',
              syncedAt: '2026-01-01T00:00:00.000Z',
            },
            'US-003': {
              issueNumber: 30,
              issueUrl: 'https://github.com/owner/repo/issues/30',
              issueNodeId: 'I_kwDOOld30',
              syncedAt: '2026-01-05T00:00:00.000Z',
            },
          },
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    // Only sync US-002 (new) — US-001 and US-003 should be preserved untouched
    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-002',
          issueNumber: 20,
          issueUrl: 'https://github.com/owner/repo/issues/20',
          issueNodeId: 'I_kwDONew20',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // All three user stories should be present
    expect(Object.keys(result.userStories)).toHaveLength(3);
    expect(result.userStories['US-001'].issueNumber).toBe(10);
    expect(result.userStories['US-001'].syncedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.userStories['US-002'].issueNumber).toBe(20);
    expect(result.userStories['US-003'].issueNumber).toBe(30);
    expect(result.userStories['US-003'].syncedAt).toBe('2026-01-05T00:00:00.000Z');
  });

  // -------------------------------------------------------------------------
  // 7. Includes projectV2 info when provided
  // -------------------------------------------------------------------------
  it('should include projectV2Id and projectV2Number when provided in options', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 1,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNodeId: 'I_kwDO1',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult, {
      projectV2Id: 'PVT_kwDOABC123',
      projectV2Number: 5,
    });

    expect(result.projectV2Id).toBe('PVT_kwDOABC123');
    expect(result.projectV2Number).toBe(5);
  });

  // -------------------------------------------------------------------------
  // 8. Updates syncedAt timestamp
  // -------------------------------------------------------------------------
  it('should set syncedAt to a current ISO timestamp for each synced user story', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const beforeTimestamp = new Date().toISOString();

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 42,
          issueUrl: 'https://github.com/owner/repo/issues/42',
          issueNodeId: 'I_kwDOTest42',
        },
      ],
      updated: [
        {
          userStoryId: 'US-002',
          issueNumber: 43,
          issueUrl: 'https://github.com/owner/repo/issues/43',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    const afterTimestamp = new Date().toISOString();

    // Both created and updated stories should have syncedAt timestamps
    for (const usId of ['US-001', 'US-002']) {
      const syncedAt = result.userStories[usId].syncedAt;
      expect(syncedAt).toBeDefined();
      // Should be a valid ISO timestamp
      expect(new Date(syncedAt).toISOString()).toBe(syncedAt);
      // Should be between before and after (inclusive)
      expect(syncedAt >= beforeTimestamp).toBe(true);
      expect(syncedAt <= afterTimestamp).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // 9. Handles missing/empty sync result gracefully
  // -------------------------------------------------------------------------
  it('should handle empty sync result without errors', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [],
      updated: [],
      errors: [],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    expect(result.syncStatus).toBe('synced');
    expect(result.userStories).toEqual({});
  });

  // -------------------------------------------------------------------------
  // 10. Preserves markdown body after frontmatter update
  // -------------------------------------------------------------------------
  it('should preserve the markdown body content when updating frontmatter', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 42,
          issueUrl: 'https://github.com/owner/repo/issues/42',
          issueNodeId: 'I_kwDOTest42',
        },
      ],
    });

    await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // The written content should still contain the markdown body
    const writtenContent = mockWriteFile.mock.calls[0][1] as string;
    expect(writtenContent).toContain('# My Feature Spec');
    expect(writtenContent).toContain('## User Stories');
    expect(writtenContent).toContain('### US-001: User authentication');
  });

  // -------------------------------------------------------------------------
  // 11. Preserves existing non-github externalLinks
  // -------------------------------------------------------------------------
  it('should preserve existing non-github externalLinks (e.g., jira, ado)', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        jira: {
          epicKey: 'AUTH-42',
          epicUrl: 'https://jira.example.com/browse/AUTH-42',
          syncedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 1,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNodeId: 'I_kwDO1',
        },
      ],
    });

    await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // The written content should preserve the jira link
    const writtenContent = mockWriteFile.mock.calls[0][1] as string;
    expect(writtenContent).toContain('AUTH-42');
  });

  // -------------------------------------------------------------------------
  // 12. Does not include issueNodeId for updated issues (not in PushSyncResult.updated)
  // -------------------------------------------------------------------------
  it('should preserve existing issueNodeId when updating an issue that already has one', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          userStories: {
            'US-001': {
              issueNumber: 10,
              issueUrl: 'https://github.com/owner/repo/issues/10',
              issueNodeId: 'I_kwDOOriginal',
              syncedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    // Updated issues don't include issueNodeId in PushSyncResult
    const syncResult = makeSyncResult({
      updated: [
        {
          userStoryId: 'US-001',
          issueNumber: 10,
          issueUrl: 'https://github.com/owner/repo/issues/10',
        },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should preserve the original issueNodeId
    expect(result.userStories['US-001'].issueNodeId).toBe('I_kwDOOriginal');
  });

  // -------------------------------------------------------------------------
  // 13. Returns correct type conforming to GitHubSyncMetadata
  // -------------------------------------------------------------------------
  it('should return a result conforming to GitHubSyncMetadata interface', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 42,
          issueUrl: 'https://github.com/owner/repo/issues/42',
          issueNodeId: 'I_kwDOTest42',
        },
      ],
    });

    const result: GitHubSyncMetadata = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Verify all required fields of GitHubSyncMetadata
    expect(result).toHaveProperty('syncStatus');
    expect(result).toHaveProperty('userStories');
    expect(['synced', 'dirty', 'conflicted']).toContain(result.syncStatus);
    expect(typeof result.userStories).toBe('object');
  });

  // -------------------------------------------------------------------------
  // 14. Handles spec with only errors (no created/updated)
  // -------------------------------------------------------------------------
  it('should handle sync result with only errors and no successful syncs', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      errors: [
        { userStoryId: 'US-001', error: 'Rate limit exceeded' },
        { userStoryId: 'US-002', error: 'Permission denied' },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should be dirty since there were errors
    expect(result.syncStatus).toBe('dirty');
    // No user stories should be added for errored ones
    expect(Object.keys(result.userStories)).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 15. Handles mixed created, updated, and error results
  // -------------------------------------------------------------------------
  it('should correctly handle a mix of created, updated, and errored user stories', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          userStories: {
            'US-002': {
              issueNumber: 20,
              issueUrl: 'https://github.com/owner/repo/issues/20',
              issueNodeId: 'I_kwDO20',
              syncedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 10,
          issueUrl: 'https://github.com/owner/repo/issues/10',
          issueNodeId: 'I_kwDO10',
        },
      ],
      updated: [
        {
          userStoryId: 'US-002',
          issueNumber: 20,
          issueUrl: 'https://github.com/owner/repo/issues/20',
        },
      ],
      errors: [
        { userStoryId: 'US-003', error: 'Network timeout' },
      ],
    });

    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Status should be dirty due to errors
    expect(result.syncStatus).toBe('dirty');

    // Both created and updated should be in userStories
    expect(result.userStories['US-001']).toBeDefined();
    expect(result.userStories['US-001'].issueNumber).toBe(10);
    expect(result.userStories['US-002']).toBeDefined();
    expect(result.userStories['US-002'].issueNumber).toBe(20);

    // Errored US-003 should NOT be added
    expect(result.userStories['US-003']).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 16. Preserves projectV2 from existing frontmatter when not in options
  // -------------------------------------------------------------------------
  it('should preserve existing projectV2 info when options do not provide it', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
      externalLinks: {
        github: {
          syncStatus: 'synced',
          projectV2Id: 'PVT_kwDOExisting',
          projectV2Number: 3,
          userStories: {},
        },
      },
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 1,
          issueUrl: 'https://github.com/owner/repo/issues/1',
          issueNodeId: 'I_kwDO1',
        },
      ],
    });

    // No projectV2 options provided
    const result = await updateSpecFrontmatter(SPEC_PATH, syncResult);

    // Should preserve existing projectV2 values
    expect(result.projectV2Id).toBe('PVT_kwDOExisting');
    expect(result.projectV2Number).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 17. Writes valid YAML frontmatter back to file
  // -------------------------------------------------------------------------
  it('should write content with valid YAML frontmatter delimiters', async () => {
    const specContent = makeSpecContent({
      id: 'spec-auth',
      title: 'Authentication Spec',
    });
    mockReadFile.mockResolvedValueOnce(specContent);

    const syncResult = makeSyncResult({
      created: [
        {
          userStoryId: 'US-001',
          issueNumber: 42,
          issueUrl: 'https://github.com/owner/repo/issues/42',
          issueNodeId: 'I_kwDOTest42',
        },
      ],
    });

    await updateSpecFrontmatter(SPEC_PATH, syncResult);

    const writtenContent = mockWriteFile.mock.calls[0][1] as string;

    // Should start with --- and have closing ---
    expect(writtenContent).toMatch(/^---\n/);
    expect(writtenContent).toMatch(/\n---\n/);

    // Should be written with utf-8 encoding
    expect(mockWriteFile.mock.calls[0][2]).toBe('utf-8');
  });
});
