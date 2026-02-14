/**
 * Unit tests for Universal Auto-Create module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseUserStories,
  createExternalIssuesForIncrement,
  type UniversalAutoCreateConfig,
} from '../../../src/core/universal-auto-create.js';

// Mock fs modules
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockExistsSync = vi.fn();

vi.mock('fs/promises', () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
}));

vi.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
}));

// Mock JIRA client
const mockJiraCreateIssue = vi.fn();
vi.mock('../../../src/integrations/jira/jira-client.js', () => ({
  JiraClient: class {
    createIssue = mockJiraCreateIssue;
  },
}));

// Mock ADO client
const mockAdoCreateWorkItem = vi.fn();
vi.mock('../../../src/integrations/ado/ado-client.js', () => ({
  AdoClient: class {
    constructor() {}
    createWorkItem = mockAdoCreateWorkItem;
  },
}));

// Mock ADO PAT provider
vi.mock('../../../src/integrations/ado/ado-pat-provider.js', () => ({
  getAdoPat: () => 'test-pat-token',
}));

// Mock feature ID derivation
vi.mock('../../../src/utils/feature-id-derivation.js', () => ({
  deriveFeatureId: (id: string) => {
    const num = parseInt(id.match(/^(\d+)/)?.[1] || '0', 10);
    return `FS-${num}`;
  },
}));

describe('Universal Auto-Create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseUserStories', () => {
    it('should extract user stories from spec.md content', () => {
      const content = `
# 0206: Test Increment

## User Stories

### US-001: Fix Silent Event Drop
As a developer, I want events to reach external tools.

### US-002: Universal Auto-Create
As a developer, I want issues auto-created in all tools.
`;

      const stories = parseUserStories(content);
      expect(stories).toEqual([
        { id: 'US-001', title: 'Fix Silent Event Drop' },
        { id: 'US-002', title: 'Universal Auto-Create' },
      ]);
    });

    it('should return empty array when no user stories found', () => {
      expect(parseUserStories('# Just a title\n\nSome text.')).toEqual([]);
    });

    it('should handle US IDs with various digit counts', () => {
      const content = '### US-1: One\n### US-99: Two\n### US-100: Three';
      const stories = parseUserStories(content);
      expect(stories).toHaveLength(3);
      expect(stories[0].id).toBe('US-1');
      expect(stories[2].id).toBe('US-100');
    });
  });

  describe('createExternalIssuesForIncrement', () => {
    const specContent = `
# 0206: Test

## User Stories

### US-001: First Story
### US-002: Second Story
`;

    const baseConfig: UniversalAutoCreateConfig = {
      sync: {
        jira: { enabled: true },
        ado: { enabled: true },
      },
      jira: { domain: 'test.atlassian.net', projectKey: 'TEST' },
      ado: { organization: 'test-org', project: 'test-project' },
    };

    it('should create JIRA stories for each user story', async () => {
      mockReadFile.mockResolvedValueOnce(specContent); // spec.md
      mockExistsSync.mockReturnValue(false); // no metadata

      mockJiraCreateIssue
        .mockResolvedValueOnce({ key: 'TEST-1', self: 'https://...' })
        .mockResolvedValueOnce({ key: 'TEST-2', self: 'https://...' });

      // ADO will fail (no metadata write needed for error path)
      mockAdoCreateWorkItem.mockRejectedValue(new Error('ADO test skip'));

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', {
          ...baseConfig,
          sync: { jira: { enabled: true }, ado: { enabled: false } },
        },
      );

      expect(result.jira?.created).toHaveLength(2);
      expect(result.jira?.created[0]).toEqual({
        usId: 'US-001',
        ref: 'TEST-1',
        url: 'https://test.atlassian.net/browse/TEST-1',
      });
    });

    it('should create ADO work items for each user story', async () => {
      mockReadFile.mockResolvedValueOnce(specContent);
      mockExistsSync.mockReturnValue(false);

      mockAdoCreateWorkItem
        .mockResolvedValueOnce({ id: 42, url: 'https://ado/42' })
        .mockResolvedValueOnce({ id: 43, url: 'https://ado/43' });

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', {
          ...baseConfig,
          sync: { jira: { enabled: false }, ado: { enabled: true } },
        },
      );

      expect(result.ado?.created).toHaveLength(2);
      expect(result.ado?.created[0]).toEqual({
        usId: 'US-001',
        ref: '42',
        url: 'https://ado/42',
      });
    });

    it('should skip already-linked user stories (idempotency)', async () => {
      const metadataJson = JSON.stringify({
        externalLinks: {
          jira: {
            userStories: {
              'US-001': { issueKey: 'TEST-99', issueUrl: '...' },
            },
          },
        },
      });
      mockReadFile
        .mockResolvedValueOnce(specContent) // spec.md
        .mockResolvedValueOnce(metadataJson) // metadata for idempotency check
        .mockResolvedValueOnce(metadataJson); // metadata for updateMetadata
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockResolvedValueOnce(undefined);

      mockJiraCreateIssue.mockResolvedValueOnce({ key: 'TEST-2', self: '...' });

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', {
          ...baseConfig,
          sync: { jira: { enabled: true }, ado: { enabled: false } },
        },
      );

      // US-001 was skipped (already linked), US-002 was created
      expect(result.jira?.skipped).toHaveLength(1);
      expect(result.jira?.skipped[0].usId).toBe('US-001');
      expect(result.jira?.created).toHaveLength(1);
      expect(result.jira?.created[0].usId).toBe('US-002');
    });

    it('should return empty when no user stories in spec', async () => {
      mockReadFile.mockResolvedValueOnce('# No user stories here');
      mockExistsSync.mockReturnValue(false);

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', baseConfig,
      );

      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
    });

    it('should update metadata.json with created links', async () => {
      mockReadFile
        .mockResolvedValueOnce(specContent) // spec.md
        .mockResolvedValueOnce(JSON.stringify({ id: '0206-test' })); // metadata read for update
      mockExistsSync.mockReturnValue(true);

      mockJiraCreateIssue
        .mockResolvedValueOnce({ key: 'TEST-10', self: '...' })
        .mockResolvedValueOnce({ key: 'TEST-11', self: '...' });

      // Second readFile call for metadata update
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ id: '0206-test' }));
      mockWriteFile.mockResolvedValueOnce(undefined);

      await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', {
          ...baseConfig,
          sync: { jira: { enabled: true }, ado: { enabled: false } },
        },
      );

      expect(mockWriteFile).toHaveBeenCalled();
      const writtenJson = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenJson.externalLinks.jira.userStories['US-001'].issueKey).toBe('TEST-10');
      expect(writtenJson.externalLinks.jira.userStories['US-002'].issueKey).toBe('TEST-11');
    });

    it('should isolate errors per provider', async () => {
      mockReadFile.mockResolvedValueOnce(specContent);
      mockExistsSync.mockReturnValue(false);

      // JIRA succeeds
      mockJiraCreateIssue
        .mockResolvedValueOnce({ key: 'T-1', self: '...' })
        .mockResolvedValueOnce({ key: 'T-2', self: '...' });

      // ADO fails for US-001 but succeeds for US-002
      mockAdoCreateWorkItem
        .mockRejectedValueOnce(new Error('ADO API error'))
        .mockResolvedValueOnce({ id: 99, url: 'https://ado/99' });

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', baseConfig,
      );

      // JIRA should be fine
      expect(result.jira?.created).toHaveLength(2);
      // ADO: 1 error + 1 success
      expect(result.ado?.errors).toHaveLength(1);
      expect(result.ado?.created).toHaveLength(1);
    });

    it('should handle disabled providers', async () => {
      mockReadFile.mockResolvedValueOnce(specContent);
      mockExistsSync.mockReturnValue(false);

      const result = await createExternalIssuesForIncrement(
        '0206-test', '/spec.md', '/metadata.json', {
          sync: { jira: { enabled: false }, ado: { enabled: false } },
        },
      );

      expect(result.jira).toBeUndefined();
      expect(result.ado).toBeUndefined();
      expect(mockJiraCreateIssue).not.toHaveBeenCalled();
      expect(mockAdoCreateWorkItem).not.toHaveBeenCalled();
    });
  });
});
