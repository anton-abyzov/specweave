/**
 * Unit tests for GitHub Living Docs Sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  updateIssueLivingDocs,
  collectLivingDocs,
  loadIncrementMetadata,
  detectRepo,
  postArchitectureComment,
  postScopeChangeComment,
  postStatusChangeComment
} from '../../../plugins/specweave-github/lib/github-issue-updater';

// Mock execFileNoThrow
vi.mock('../../../src/utils/execFileNoThrow', () => ({
  execFileNoThrow: vi.fn()
}));

describe('GitHub Living Docs Sync', () => {
  const testIncrementId = '0015-hierarchical-sync';
  const testOwner = 'test-owner';
  const testRepo = 'test-repo';
  const testIssueNumber = 29;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collectLivingDocs', () => {
    it('should collect specs, architecture, and diagrams', async () => {
      // Mock file system
      vi.spyOn(fs, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fs, 'readdir')
        .mockResolvedValueOnce(['spec-001.md', 'spec-002.md', 'README.md'] as any)
        .mockResolvedValueOnce(['0001-decision.md', '0002-decision.md'] as any)
        .mockResolvedValueOnce(['hld-system.md'] as any)
        .mockResolvedValueOnce(['1-main-flow.mmd', '2-sync.svg'] as any);

      const result = await collectLivingDocs(testIncrementId);

      expect(result.specs).toHaveLength(2);
      expect(result.specs).toContain('.specweave/docs/internal/specs/spec-001.md');
      expect(result.architecture).toContain('.specweave/docs/internal/architecture/adr/0001-decision.md');
      expect(result.diagrams).toContain('.specweave/docs/internal/architecture/diagrams/1-main-flow.mmd');
    });

    it('should handle missing directories gracefully', async () => {
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);

      const result = await collectLivingDocs(testIncrementId);

      expect(result.specs).toHaveLength(0);
      expect(result.architecture).toHaveLength(0);
      expect(result.diagrams).toHaveLength(0);
    });
  });

  describe('loadIncrementMetadata', () => {
    it('should load metadata with GitHub issue', async () => {
      const mockMetadata = {
        id: testIncrementId,
        status: 'active',
        type: 'feature',
        github: {
          issue: 29,
          url: 'https://github.com/test-owner/test-repo/issues/29'
        }
      };

      vi.spyOn(fs, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fs, 'readJson').mockResolvedValue(mockMetadata);

      const result = await loadIncrementMetadata(testIncrementId);

      expect(result).toEqual(mockMetadata);
      expect(result?.github?.issue).toBe(29);
    });

    it('should return null if metadata not found', async () => {
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);

      const result = await loadIncrementMetadata(testIncrementId);

      expect(result).toBeNull();
    });
  });

  describe('detectRepo', () => {
    it('should detect GitHub repository from git remote', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: 'https://github.com/test-owner/test-repo.git\n',
        stderr: ''
      });

      const result = await detectRepo();

      expect(result).toEqual({
        owner: 'test-owner',
        repo: 'test-repo'
      });
    });

    it('should handle SSH remotes', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: 'git@github.com:test-owner/test-repo.git\n',
        stderr: ''
      });

      const result = await detectRepo();

      expect(result).toEqual({
        owner: 'test-owner',
        repo: 'test-repo'
      });
    });

    it('should return null if git command fails', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 1,
        stdout: '',
        stderr: 'Not a git repository'
      });

      const result = await detectRepo();

      expect(result).toBeNull();
    });
  });

  describe('postArchitectureComment', () => {
    it('should post ADR comment with correct format', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: '',
        stderr: ''
      });

      await postArchitectureComment(
        testIssueNumber,
        '.specweave/docs/internal/architecture/adr/0018-hierarchical-sync.md',
        testOwner,
        testRepo
      );

      const call = vi.mocked(execFileNoThrow).mock.calls[0];
      expect(call[0]).toBe('gh');
      expect(call[1]).toContain('comment');
      expect(call[1]).toContain(String(testIssueNumber));

      const commentBody = call[1][call[1].indexOf('--body') + 1];
      expect(commentBody).toContain('Architecture Decision Record (ADR)');
      expect(commentBody).toContain('0018-hierarchical-sync');
    });
  });

  describe('postScopeChangeComment', () => {
    it('should post scope change with all sections', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: '',
        stderr: ''
      });

      await postScopeChangeComment(
        testIssueNumber,
        {
          added: ['US-006: Multi-ADO sync'],
          removed: ['US-002: Board resolution'],
          modified: ['US-001: Updated validation'],
          reason: 'ADO priority increased',
          impact: '+8 hours'
        },
        testOwner,
        testRepo
      );

      const call = vi.mocked(execFileNoThrow).mock.calls[0];
      const commentBody = call[1][call[1].indexOf('--body') + 1];

      expect(commentBody).toContain('**Scope Change Detected**');
      expect(commentBody).toContain('**Added**');
      expect(commentBody).toContain('US-006: Multi-ADO sync');
      expect(commentBody).toContain('**Removed**');
      expect(commentBody).toContain('US-002: Board resolution');
      expect(commentBody).toContain('**Reason**: ADO priority increased');
      expect(commentBody).toContain('**Impact**: +8 hours');
    });
  });

  describe('postStatusChangeComment', () => {
    it('should post paused status with correct emoji', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: '',
        stderr: ''
      });

      await postStatusChangeComment(
        testIssueNumber,
        'paused',
        'Waiting for API keys',
        testOwner,
        testRepo
      );

      const call = vi.mocked(execFileNoThrow).mock.calls[0];
      const commentBody = call[1][call[1].indexOf('--body') + 1];

      expect(commentBody).toContain('⏸️');
      expect(commentBody).toContain('Increment Paused');
      expect(commentBody).toContain('Waiting for API keys');
    });

    it('should post resumed status', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: '',
        stderr: ''
      });

      await postStatusChangeComment(
        testIssueNumber,
        'resumed',
        'API keys received',
        testOwner,
        testRepo
      );

      const call = vi.mocked(execFileNoThrow).mock.calls[0];
      const commentBody = call[1][call[1].indexOf('--body') + 1];

      expect(commentBody).toContain('▶️');
      expect(commentBody).toContain('Increment Resumed');
    });

    it('should post abandoned status', async () => {
      const { execFileNoThrow } = await import('../../../src/utils/execFileNoThrow');
      vi.mocked(execFileNoThrow).mockResolvedValue({
        status: 0,
        stdout: '',
        stderr: ''
      });

      await postStatusChangeComment(
        testIssueNumber,
        'abandoned',
        'Requirements changed',
        testOwner,
        testRepo
      );

      const call = vi.mocked(execFileNoThrow).mock.calls[0];
      const commentBody = call[1][call[1].indexOf('--body') + 1];

      expect(commentBody).toContain('🗑️');
      expect(commentBody).toContain('Increment Abandoned');
    });
  });
});
