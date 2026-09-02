import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../../../src/core/config/types.js';
import type { HookConfiguration } from '../../../../src/core/config/types.js';

describe('HookConfiguration structure (2.0)', () => {
  it('DEFAULT_CONFIG ships no hooks block — closure flags are opt-in', () => {
    expect(DEFAULT_CONFIG.hooks).toBeUndefined();
  });

  it('living docs are controlled by `livingDocs`, not a hook flag', () => {
    expect(DEFAULT_CONFIG.livingDocs).toBe(false);
    expect(DEFAULT_CONFIG.hooks?.post_increment_done).toBeUndefined();
  });

  it('HookConfiguration still types the external-tracker closure flags', () => {
    const hooks: HookConfiguration = {
      post_increment_done: {
        sync_to_github_project: true,
        close_external_issue: true,
        close_github_issue: false,
      },
    };
    expect(hooks.post_increment_done?.close_external_issue).toBe(true);
  });

  it('the orphaned banner hook surface is gone', () => {
    expect(Object.keys({} as HookConfiguration)).not.toContain('banner');
    const hooks = DEFAULT_CONFIG.hooks as Record<string, unknown> | undefined;
    expect(hooks?.banner).toBeUndefined();
  });
});
