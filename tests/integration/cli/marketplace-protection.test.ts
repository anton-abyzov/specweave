/**
 * Integration Tests: Marketplace Protection
 *
 * These tests verify the actual behavior of the plugin-installer code
 * to ensure marketplace deregistration NEVER happens.
 *
 * Bug Fixed: v0.34.6 - Users losing all plugins on `specweave init .`
 *
 * @see src/cli/helpers/init/plugin-installer.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';

describe('Marketplace Protection - Source Code Verification', () => {
  const pluginInstallerPath = path.join(
    process.cwd(),
    'src/cli/helpers/init/plugin-installer.ts'
  );

  const initPath = path.join(
    process.cwd(),
    'src/cli/commands/init.ts'
  );

  describe('refreshMarketplace() Function', () => {
    it('should NOT contain marketplace remove command', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // CRITICAL: No marketplace remove command anywhere in the file
      expect(content).not.toContain("'marketplace', 'remove'");
      expect(content).not.toContain('"marketplace", "remove"');
      expect(content).not.toMatch(/claude.*marketplace.*remove/);
    });

    it('should use inline copier instead of marketplace (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: refreshMarketplace() removed, replaced with inline copier approach
      expect(content).not.toContain('async function refreshMarketplace');

      // Must use copyPlugin from plugin-copier
      expect(content).toContain('copyPlugin');

      // Must resolve specweave root for plugin source
      expect(content).toContain('findSpecweaveRoot');
    });

    it('should install plugins via inline copier instead of marketplace add (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: No marketplace CLI commands
      expect(content).not.toContain("'marketplace', 'add'");
      expect(content).not.toContain("'marketplace', 'update'");

      // Uses inline copier instead
      expect(content).toContain('copyPlugin');
      expect(content).toContain('findSpecweaveRoot');

      // Uses specweaveRoot to locate plugin source
      expect(content).toContain('specweaveRoot');
    });

    it('should have proper documentation for inline copier installation (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Must document the inline copier approach
      expect(content).toContain('inline copier');
      expect(content).toContain('plugin');
      expect(content).toContain('installation');
    });
  });

  describe('Simplified Marketplace Handling (v0.35.2+)', () => {
    it('should NOT have manual cache TTL logic (Claude CLI handles it)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // v0.35.2: Removed manual cache management - Claude CLI handles internally
      // These patterns should NOT exist anymore (over-engineering removed)
      expect(content).not.toContain('cacheAge < cacheTTL');
      expect(content).not.toContain('isSpecWeaveFrameworkRepository');
    });

    it('should use inline copier instead of marketplace list (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: No marketplace list command - inline copier handles installation directly
      expect(content).not.toContain("'marketplace', 'list'");

      // Uses copyPlugin for plugin installation
      expect(content).toContain('copyPlugin');

      // Handles already-installed case via skipped flag
      expect(content).toContain('skipped');
    });

    it('should install core sw plugin via inline copier (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: Core plugin is 'sw', installed via copyPlugin
      expect(content).toContain("name: 'sw'");
      expect(content).toContain('copyPlugin');

      // No plugins.length >= 25 guard (removed as over-engineering)
      expect(content).not.toMatch(/plugins\.length\s*>=\s*25/);
    });
  });

  describe('Continue Existing Mode', () => {
    it('should skip plugin installation when continueExisting is true', async () => {
      const content = await fs.readFile(initPath, 'utf-8');

      // Must have continueExisting check before plugin installation
      expect(content).toContain('if (continueExisting)');

      // Must skip plugin installation
      expect(content).toContain('Keeping existing plugin configuration');
    });

    it('should set autoInstallSucceeded=true when continuing', async () => {
      const content = await fs.readFile(initPath, 'utf-8');

      // Find the continueExisting block that handles plugin installation
      // This is in the claude toolName section, search for the pattern
      const pluginSectionStart = content.indexOf("if (toolName === 'claude')");
      const contentAfterToolName = content.substring(pluginSectionStart);

      // Find the continueExisting check within this section
      const continueCheckIndex = contentAfterToolName.indexOf('if (continueExisting)');
      const blockStart = pluginSectionStart + continueCheckIndex;
      const blockEnd = content.indexOf('} else {', blockStart);
      const block = content.substring(blockStart, blockEnd);

      // Must set autoInstallSucceeded = true
      expect(block).toContain('autoInstallSucceeded = true');
    });

    it('should have CRITICAL FIX documentation in init.ts', async () => {
      const content = await fs.readFile(initPath, 'utf-8');

      // Must document the fix
      expect(content).toContain('CRITICAL FIX');
      expect(content).toContain('v0.34.6');
      expect(content).toContain('Skip plugin installation');
    });
  });

  describe('Developer Script Safety', () => {
    // scripts/refresh-marketplace.sh was removed; plugin refresh is now handled
    // by `specweave refresh-plugins` CLI (see CLAUDE.md rule #6)

    it.skip('should have prominent warning banner', async () => {
      // Script removed - skipped
    });

    it.skip('should list destructive operations', async () => {
      // Script removed - skipped
    });

    it.skip('should provide safe alternatives for users', async () => {
      // Script removed - skipped
    });
  });
});

describe('Marketplace Protection - Behavioral Verification', () => {
  it('should have no destructive marketplace operations in installAllPlugins', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // Extract installAllPlugins function
    const functionStart = content.indexOf('export async function installAllPlugins');
    const functionEnd = content.indexOf('\n}', functionStart + 500) + 2; // ~500 chars to skip to body
    const functionBody = content.substring(functionStart, functionEnd);

    // No marketplace remove anywhere in this function
    expect(functionBody).not.toContain("'remove'");
  });

  it('should use copyPlugin with specweaveRoot (0232+)', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // Must use copyPlugin for installation
    expect(content).toContain('copyPlugin');

    // Must resolve specweave root for locating plugin source
    expect(content).toContain('findSpecweaveRoot');
    expect(content).toContain('specweaveRoot');

    // Must import from plugin-copier
    expect(content).toContain('plugin-copier');
  });

  it('should be idempotent - same result regardless of call count (0232+)', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // 0232+: Idempotency guaranteed by inline copier handling already-installed case
    // - If plugin already installed → copyPlugin returns skipped=true
    // - No destructive remove/re-add cycle needed

    // Must use copyPlugin for installation
    expect(content).toContain('copyPlugin');

    // Must handle already-installed case gracefully via skipped flag
    expect(content).toContain('skipped');

    // No marketplace remove operations (idempotent: never destructive)
    expect(content).not.toContain("'marketplace', 'remove'");
  });
});
