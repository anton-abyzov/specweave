import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { HookConfiguration } from '../../../../src/core/config/types.js';

describe('HookConfiguration structure (0208)', () => {
  it('should NOT have sync_living_docs in post_task_completion defaults', () => {
    const ptc = DEFAULT_CONFIG.hooks?.post_task_completion;
    expect(ptc).not.toHaveProperty('sync_living_docs');
  });

  it('should have sync_living_docs in post_increment_done defaults', () => {
    expect(DEFAULT_CONFIG.hooks?.post_increment_done?.sync_living_docs).toBe(true);
  });

  it('should have sync_to_github_project in post_increment_done defaults', () => {
    expect(DEFAULT_CONFIG.hooks?.post_increment_done?.sync_to_github_project).toBe(true);
  });

  it('should have close_github_issue in post_increment_done defaults', () => {
    expect(DEFAULT_CONFIG.hooks?.post_increment_done?.close_github_issue).toBe(true);
  });

  it('should accept post_increment_done in HookConfiguration type', () => {
    const hooks: HookConfiguration = {
      post_increment_done: {
        sync_living_docs: true,
        sync_to_github_project: true,
        close_github_issue: false,
      },
    };
    expect(hooks.post_increment_done?.sync_living_docs).toBe(true);
  });

  it('should still have sync_tasks_md in post_task_completion', () => {
    expect(DEFAULT_CONFIG.hooks?.post_task_completion?.sync_tasks_md).toBe(true);
  });

  it('should still have external_tracker_sync in post_task_completion', () => {
    expect(DEFAULT_CONFIG.hooks?.post_task_completion?.external_tracker_sync).toBe(true);
  });
});
