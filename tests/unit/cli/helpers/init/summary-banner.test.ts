/**
 * Tests for summary banner output
 * T-010 [RED] → T-011 [GREEN]
 */

import { describe, it, expect } from 'vitest';

import {
  formatSummaryBanner,
  type SummaryBannerOptions,
} from '../../../../../src/cli/helpers/init/summary-banner.js';

/** Strip ANSI color codes for assertion matching */
function strip(s: string): string {
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}

function makeOptions(overrides: Partial<SummaryBannerOptions> = {}): SummaryBannerOptions {
  return {
    projectName: 'my-app',
    provider: { name: 'GitHub', owner: 'acme', repo: 'my-app' },
    tracker: { name: 'GitHub Issues' },
    repoCount: 1,
    isGreenfield: true,
    hasPendingClones: false,
    adapter: 'claude',
    language: 'en',
    defaults: {
      testing: 'TDD',
      qualityGates: 'standard',
      lspEnabled: true,
      gitHooksInstalled: true,
      translationEnabled: false,
    },
    ...overrides,
  };
}

describe('summary-banner', () => {
  describe('formatSummaryBanner', () => {
    // ─── Header ───────────────────────────────────────────────

    it('should contain project name', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('my-app');
    });

    it('should contain "SpecWeave initialized"', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('SpecWeave initialized');
    });

    // ─── Provider info ────────────────────────────────────────

    it('should show GitHub provider with owner/repo', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('GitHub');
      expect(output).toContain('acme/my-app');
    });

    it('should show ADO provider with organization', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        provider: { name: 'Azure DevOps', organization: 'myorg' },
      })));
      expect(output).toContain('Azure DevOps');
      expect(output).toContain('myorg');
    });

    it('should show provider name without details if none provided', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        provider: { name: 'Local' },
      })));
      expect(output).toContain('Local');
    });

    // ─── Tracker info ─────────────────────────────────────────

    it('should show tracker name', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('GitHub Issues');
    });

    it('should show Jira tracker', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        tracker: { name: 'Jira' },
      })));
      expect(output).toContain('Jira');
    });

    // ─── Repo count ───────────────────────────────────────────

    it('should show "single repo" for 1 repo', () => {
      const output = strip(formatSummaryBanner(makeOptions({ repoCount: 1 })));
      expect(output).toContain('1 (single repo)');
    });

    it('should show "multi-repo" for >1 repos', () => {
      const output = strip(formatSummaryBanner(makeOptions({ repoCount: 3 })));
      expect(output).toContain('3 (multi-repo)');
    });

    // ─── Enabled defaults ─────────────────────────────────────

    it('should list TDD mode', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('TDD mode');
    });

    it('should list test-after mode when configured', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: { ...makeOptions().defaults, testing: 'test-after' },
      })));
      expect(output).toContain('test-after');
    });

    it('should list quality gates', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toMatch(/[Ss]tandard quality gates/);
    });

    it('should list LSP when enabled (Claude)', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('LSP code intelligence');
    });

    it('should NOT list LSP when disabled', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: { ...makeOptions().defaults, lspEnabled: false },
      })));
      expect(output).not.toContain('LSP code intelligence');
    });

    it('should list git hooks when installed', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('Git pre-commit hooks');
    });

    it('should NOT list git hooks when not installed', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: { ...makeOptions().defaults, gitHooksInstalled: false },
      })));
      expect(output).not.toContain('Git pre-commit hooks');
    });

    it('should list translation when enabled for non-English', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        language: 'es',
        defaults: { ...makeOptions().defaults, translationEnabled: true },
      })));
      expect(output).toContain('Auto-translation (es)');
    });

    it('should NOT list translation for English', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).not.toContain('Auto-translation');
    });

    // ─── Customize instruction ────────────────────────────────

    it('should contain specweave config instruction', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('specweave config');
    });

    // ─── Brownfield / living docs hints ───────────────────────

    it('should show living docs suggestion when brownfield', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        isGreenfield: false,
      })));
      expect(output).toContain('/sw:living-docs');
      expect(output).toContain('Existing code detected');
    });

    it('should show pending clones message when cloning', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        isGreenfield: true,
        hasPendingClones: true,
      })));
      expect(output).toContain('cloning in background');
      expect(output).toContain('/sw:living-docs');
    });

    it('should omit living docs when greenfield and no pending clones', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        isGreenfield: true,
        hasPendingClones: false,
      })));
      expect(output).not.toContain('/sw:living-docs');
      expect(output).not.toContain('Existing code');
      expect(output).not.toContain('cloning');
    });
  });
});
