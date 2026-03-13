import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormatPreservationSyncService, CompletionCommentData } from '../../../src/sync/format-preservation-sync.js';

describe('FormatPreservationSyncService - PR info in completion comments', () => {
  let service: FormatPreservationSyncService;

  beforeEach(() => {
    // The constructor requires config — create minimal instance
    service = Object.create(FormatPreservationSyncService.prototype);
  });

  it('includes PR info when prUrl is provided', () => {
    const data: CompletionCommentData = {
      tasks: [{ taskId: 'T-001', title: 'Implement feature', completed: true }],
      acceptanceCriteria: [{ acId: 'AC-US1-01', description: 'Works', satisfied: true }],
      progressPercentage: 100,
      prUrl: 'https://github.com/org/repo/pull/42',
      prNumber: 42,
      prBranch: 'ID-300/0521-feature',
    };

    const comment = service.buildCompletionComment(data);

    expect(comment).toContain('### Pull Request');
    expect(comment).toContain('#42');
    expect(comment).toContain('https://github.com/org/repo/pull/42');
    expect(comment).toContain('ID-300/0521-feature');
  });

  it('omits PR section when no prUrl', () => {
    const data: CompletionCommentData = {
      tasks: [{ taskId: 'T-001', title: 'Implement feature', completed: true }],
      acceptanceCriteria: [],
      progressPercentage: 100,
    };

    const comment = service.buildCompletionComment(data);

    expect(comment).not.toContain('Pull Request');
  });

  it('handles prUrl without prBranch', () => {
    const data: CompletionCommentData = {
      tasks: [],
      acceptanceCriteria: [],
      progressPercentage: 0,
      prUrl: 'https://github.com/org/repo/pull/1',
      prNumber: 1,
    };

    const comment = service.buildCompletionComment(data);

    expect(comment).toContain('### Pull Request');
    expect(comment).not.toContain('**Branch**');
  });
});
