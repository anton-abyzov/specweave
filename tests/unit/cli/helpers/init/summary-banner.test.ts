/**
 * Tests for summary banner output
 * T-010 [RED] → T-011 [GREEN]
 *
 * Simplified (v1.0.415): Removed tests for fields no longer in SummaryBannerOptions
 * (tracker, repoCount, isGreenfield, hasPendingClones, syncPermissions, externalPluginInstalled).
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

    // ─── Adapter info ──────────────────────────────────────────

    it('should show adapter display name for claude', () => {
      const output = strip(formatSummaryBanner(makeOptions({ adapter: 'claude' })));
      expect(output).toContain('Adapter:');
      expect(output).toContain('Claude Code');
    });

    it('should show adapter display name for cursor', () => {
      const output = strip(formatSummaryBanner(makeOptions({ adapter: 'cursor' })));
      expect(output).toContain('Adapter:');
      expect(output).toContain('Cursor');
    });

    it('should show adapter display name for generic', () => {
      const output = strip(formatSummaryBanner(makeOptions({ adapter: 'generic' })));
      expect(output).toContain('Adapter:');
      expect(output).toContain('Generic');
    });

    // ─── Config path ───────────────────────────────────────────

    it('should show config file path', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('Config:');
      expect(output).toContain('.specweave/config.json');
    });

    // ─── Help reference ────────────────────────────────────────

    it('should show help reference commands', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('specweave help');
      expect(output).toContain('specweave doctor');
    });

    it('should show quick reference header', () => {
      const output = strip(formatSummaryBanner(makeOptions()));
      expect(output).toContain('Quick reference:');
    });

    // ─── Coverage targets ──────────────────────────────────────

    it('should show coverage targets when TDD with coverageTargets', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: {
          ...makeOptions().defaults,
          testing: 'TDD',
          coverageTargets: { unit: 80, integration: 60, e2e: 40 },
        },
      })));
      expect(output).toContain('TDD mode (coverage: 80% unit, 60% integration, 40% e2e)');
      expect(output).not.toContain('TDD mode (testing)');
    });

    it('should fall back to "TDD mode (testing)" when no coverageTargets', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: { ...makeOptions().defaults, testing: 'TDD' },
      })));
      expect(output).toContain('TDD mode (testing)');
    });

    it('should not show coverage for non-TDD modes', () => {
      const output = strip(formatSummaryBanner(makeOptions({
        defaults: {
          ...makeOptions().defaults,
          testing: 'test-after',
          coverageTargets: { unit: 80, integration: 60, e2e: 40 },
        },
      })));
      expect(output).toContain('test-after (testing)');
      expect(output).not.toContain('coverage:');
    });
  });
});
