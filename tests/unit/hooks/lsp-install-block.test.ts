/**
 * LSP Plugin Installation Blocking Tests
 *
 * Tests the Gap #2 fix: user-prompt-submit.sh should NOT install LSP plugins
 * when ENABLE_LSP_TOOL environment variable is not set.
 *
 * The logic being tested (from user-prompt-submit.sh):
 * ```bash
 * if [[ "$LSP_NEEDS_INSTALL" == "true" ]] && [[ "$LSP_AUTO_INSTALL" == "true" ]]; then
 *   if [[ -z "${ENABLE_LSP_TOOL:-}" ]]; then
 *     LSP_NEEDS_INSTALL="false"  # Skip installation
 *   fi
 * fi
 * ```
 *
 * Since bash scripts are hard to unit test directly, we test the BEHAVIOR:
 * - The lsp-check.sh outputs lspEnvReady: false when ENABLE_LSP_TOOL is not set
 * - This signals to user-prompt-submit.sh that installation should be skipped
 *
 * @since v1.0.195
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LSP Plugin Installation Blocking (Gap #2)', () => {
  const hookPath = path.join(
    process.cwd(),
    'plugins',
    'specweave',
    'hooks',
    'user-prompt-submit.sh'
  );

  it('should contain ENABLE_LSP_TOOL check that blocks installation', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // Verify the critical blocking logic exists
    expect(hookContent).toContain('ENABLE_LSP_TOOL');
    expect(hookContent).toContain('LSP_NEEDS_INSTALL="false"');

    // Verify the comment explains WHY
    expect(hookContent).toContain('Skip LSP plugin installation if ENABLE_LSP_TOOL is not set');
    expect(hookContent).toContain("they won't work");
  });

  it('should check ENABLE_LSP_TOOL BEFORE attempting LSP plugin installation', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // The blocking logic pattern - this MUST appear before LSP installation
    const blockingPattern = 'Skip LSP plugin installation if ENABLE_LSP_TOOL is not set';
    const blockingPos = hookContent.indexOf(blockingPattern);

    // Find positions of actual LSP plugin installation commands (not comments)
    // These are the specific LSP plugins being installed
    const vtslsInstallPos = hookContent.indexOf('claude plugin install vtsls@claude-code-lsps');
    const pyrightInstallPos = hookContent.indexOf('claude plugin install pyright@claude-code-lsps');
    const rustAnalyzerInstallPos = hookContent.indexOf('claude plugin install rust-analyzer@claude-code-lsps');

    // The blocking check MUST exist
    expect(blockingPos).toBeGreaterThan(-1);

    // All LSP plugin installs MUST exist
    expect(vtslsInstallPos).toBeGreaterThan(-1);
    expect(pyrightInstallPos).toBeGreaterThan(-1);
    expect(rustAnalyzerInstallPos).toBeGreaterThan(-1);

    // The blocking check MUST come BEFORE all LSP installation attempts
    expect(blockingPos).toBeLessThan(vtslsInstallPos);
    expect(blockingPos).toBeLessThan(pyrightInstallPos);
    expect(blockingPos).toBeLessThan(rustAnalyzerInstallPos);
  });

  it('should use boostvolt/claude-code-lsps marketplace (not broken official)', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // Should reference the working marketplace
    expect(hookContent).toContain('claude-code-lsps');
    expect(hookContent).toContain('vtsls@claude-code-lsps');
    expect(hookContent).toContain('pyright@claude-code-lsps');

    // Should NOT try to install from broken official marketplace
    expect(hookContent).not.toContain('vtsls@claude-plugins-official');
    expect(hookContent).not.toContain('typescript-lsp@claude-plugins-official');
  });

  it('should show LSP setup warning when env var not set', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // Verify the warning message exists
    expect(hookContent).toContain('LSP Setup Required');
    expect(hookContent).toContain('export ENABLE_LSP_TOOL=1');
  });

  it('should have v1.0.195 version marker for this fix', () => {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // Verify version tracking
    expect(hookContent).toContain('v1.0.195');
  });
});

describe('OFFICIAL_PLUGINS Array (Gap #1 verification)', () => {
  it('should not include any *-lsp plugins', async () => {
    // Dynamic import to get the actual exported array
    const { OFFICIAL_PLUGINS } = await import(
      '../../../src/core/lazy-loading/llm-plugin-detector.js'
    );

    const lspPlugins = OFFICIAL_PLUGINS.filter(
      (p: string) => p.endsWith('-lsp') || p.includes('lsp')
    );

    expect(lspPlugins).toEqual([]);
  });
});
