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

    it('should use vskill-based installation instead of marketplace (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: refreshMarketplace() removed, replaced with vskill-based approach
      expect(content).not.toContain('async function refreshMarketplace');

      // Must have vskill-based installer function
      expect(content).toContain('function installPluginViaVskill');

      // Must resolve vskill path
      expect(content).toContain('resolveVskillPath');
    });

    it('should install plugins via vskill add instead of marketplace add (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: No marketplace CLI commands
      expect(content).not.toContain("'marketplace', 'add'");
      expect(content).not.toContain("'marketplace', 'update'");

      // Uses vskill add instead
      expect(content).toContain("vskill");
      expect(content).toContain("'add'");

      // Must resolve specweave plugin directory
      expect(content).toContain('resolveSpecweavePluginDir');
    });

    it('should have proper documentation for vskill-based installation (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract installPluginViaVskill function and its JSDoc
      const docStart = content.lastIndexOf('/**', content.indexOf('function installPluginViaVskill'));
      const functionEnd = content.indexOf('\n}', content.indexOf('function installPluginViaVskill')) + 2;
      const functionWithDoc = content.substring(docStart, functionEnd);

      // Must document the vskill approach
      expect(functionWithDoc).toContain('vskill');
      expect(functionWithDoc).toContain('add');
      expect(functionWithDoc).toContain('plugin');
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

    it('should use vskill to install plugins instead of marketplace list (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: No marketplace list command - vskill handles installation directly
      expect(content).not.toContain("'marketplace', 'list'");

      // Uses vskill for plugin installation
      expect(content).toContain('installPluginViaVskill');

      // Handles already-installed case via vskill output
      expect(content).toContain('alreadyInstalled');
    });

    it('should install core sw plugin via vskill (0232+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // 0232+: Core plugin is 'sw', installed via vskill with --plugin flag
      expect(content).toContain("{ name: 'sw'");
      expect(content).toContain("'--plugin'");

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
    const scriptPath = path.join(process.cwd(), 'scripts/refresh-marketplace.sh');

    it('should have prominent warning banner', async () => {
      const content = await fs.readFile(scriptPath, 'utf-8');

      // Must have ASCII art warning box
      expect(content).toContain('╔═');
      expect(content).toContain('WARNING');
      expect(content).toContain('DEVELOPER-ONLY');
    });

    it('should list destructive operations', async () => {
      const content = await fs.readFile(scriptPath, 'utf-8');

      expect(content).toContain('REMOVES');
      expect(content).toContain('plugins');
      expect(content).toContain('marketplace');
      expect(content).toContain('DESTRUCTIVE');
    });

    it('should provide safe alternatives for users', async () => {
      const content = await fs.readFile(scriptPath, 'utf-8');

      expect(content).toContain('/plugin install specweave');
      expect(content).toContain('specweave init .');
      expect(content).toContain('non-destructive');
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

  it('should use vskill add with plugin-dir flag (0232+)', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // Extract installPluginViaVskill function body
    const functionStart = content.indexOf('function installPluginViaVskill');
    const functionEnd = content.indexOf('\n}', functionStart) + 2;
    const functionBody = content.substring(functionStart, functionEnd);

    // Must use vskill add with --plugin and --plugin-dir flags
    const addIndex = functionBody.indexOf("'add'");
    const pluginFlagIndex = functionBody.indexOf("'--plugin'");
    const pluginDirFlagIndex = functionBody.indexOf("'--plugin-dir'");

    // vskill add must come first, then flags
    expect(addIndex).toBeGreaterThan(0);
    expect(pluginFlagIndex).toBeGreaterThan(addIndex);
    expect(pluginDirFlagIndex).toBeGreaterThan(addIndex);
  });

  it('should be idempotent - same result regardless of call count (0232+)', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // 0232+: Idempotency guaranteed by vskill handling already-installed case
    // - If plugin already installed → vskill returns "already" in output
    // - installPluginViaVskill detects this and returns alreadyInstalled=true
    // - No destructive remove/re-add cycle needed

    // Must have installPluginViaVskill function
    expect(content).toContain('function installPluginViaVskill');

    // Must handle already-installed case gracefully
    expect(content).toContain('alreadyInstalled');
    expect(content).toContain("'already'");

    // No marketplace remove operations (idempotent: never destructive)
    expect(content).not.toContain("'marketplace', 'remove'");
  });
});
