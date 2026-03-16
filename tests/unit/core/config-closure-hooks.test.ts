/**
 * Unit tests for closure hook config types and defaults (T-014)
 *
 * Tests that:
 * - Config without hooks.post_increment_done → all provider flags default to true
 * - Config with close_jira_issue: false → JIRA skipped
 * - Config with close_ado_work_item: false → ADO skipped
 * - close_external_issue acts as generic fallback for all providers
 */

import { describe, it, expect } from 'vitest';
import { buildClosureConfigFromHooks } from '../../../src/core/closure-dispatcher.js';
import { DEFAULT_CONFIG } from '../../../src/core/config/types.js';

describe('closure hook config types and defaults', () => {
  it('DEFAULT_CONFIG has post_increment_done with close_github_issue: true', () => {
    expect(DEFAULT_CONFIG.hooks?.post_increment_done?.close_github_issue).toBe(true);
  });

  it('all provider flags default to true when post_increment_done exists', () => {
    const config = buildClosureConfigFromHooks(
      { post_increment_done: { close_github_issue: true } },
      { canUpdateExternalItems: true },
    );

    expect(config.github).toBe(true);
    expect(config.jira).toBe(true);
    expect(config.ado).toBe(true);
  });

  it('close_jira_issue: false → JIRA skipped, no JIRA client instantiated', () => {
    const config = buildClosureConfigFromHooks(
      {
        post_increment_done: {
          close_github_issue: true,
          close_jira_issue: false,
        },
      },
      { canUpdateExternalItems: true },
    );

    expect(config.github).toBe(true);
    expect(config.jira).toBe(false);
    expect(config.ado).toBe(true);
  });

  it('close_ado_work_item: false → ADO skipped', () => {
    const config = buildClosureConfigFromHooks(
      {
        post_increment_done: {
          close_github_issue: true,
          close_ado_work_item: false,
        },
      },
      { canUpdateExternalItems: true },
    );

    expect(config.github).toBe(true);
    expect(config.jira).toBe(true);
    expect(config.ado).toBe(false);
  });

  it('close_external_issue: false → all providers disabled (generic fallback)', () => {
    const config = buildClosureConfigFromHooks(
      {
        post_increment_done: {
          close_external_issue: false,
        },
      },
      { canUpdateExternalItems: true },
    );

    expect(config.github).toBe(false);
    expect(config.jira).toBe(false);
    expect(config.ado).toBe(false);
  });

  it('per-provider flag overrides close_external_issue', () => {
    const config = buildClosureConfigFromHooks(
      {
        post_increment_done: {
          close_external_issue: false,
          close_github_issue: true,
        },
      },
      { canUpdateExternalItems: true },
    );

    // GitHub overridden to true, JIRA/ADO inherit from close_external_issue: false
    expect(config.github).toBe(true);
    expect(config.jira).toBe(false);
    expect(config.ado).toBe(false);
  });

  it('no hooks config → all providers disabled', () => {
    const config = buildClosureConfigFromHooks(undefined, { canUpdateExternalItems: true });

    expect(config.github).toBe(false);
    expect(config.jira).toBe(false);
    expect(config.ado).toBe(false);
  });

  it('canUpdateExternalItems defaults to true when syncSettings undefined', () => {
    const config = buildClosureConfigFromHooks(
      { post_increment_done: { close_github_issue: true } },
      undefined,
    );

    // canUpdateExternalItems defaults to true, so providers enabled
    expect(config.github).toBe(true);
    expect(config.jira).toBe(true);
    expect(config.ado).toBe(true);
  });
});
