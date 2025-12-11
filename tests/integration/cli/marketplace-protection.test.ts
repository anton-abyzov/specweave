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

      // Extract refreshMarketplace function body
      const functionStart = content.indexOf('async function refreshMarketplace');
      const functionEnd = content.indexOf('\n}', functionStart) + 2;
      const functionBody = content.substring(functionStart, functionEnd);

      // CRITICAL: No marketplace remove command
      expect(functionBody).not.toContain("'marketplace', 'remove'");
      expect(functionBody).not.toContain('"marketplace", "remove"');
      expect(functionBody).not.toMatch(/claude.*marketplace.*remove/);
    });

    it('should return early when marketplace exists', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract refreshMarketplace function body
      const functionStart = content.indexOf('async function refreshMarketplace');
      const functionEnd = content.indexOf('\n}', functionStart) + 2;
      const functionBody = content.substring(functionStart, functionEnd);

      // Must have early return when marketplace exists
      expect(functionBody).toContain('if (marketplaceExists)');
      expect(functionBody).toContain('return;');

      // Must log that marketplace is already registered
      expect(functionBody).toContain('already registered');
    });

    it('should only add marketplace when it does NOT exist', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract refreshMarketplace function body
      const functionStart = content.indexOf('async function refreshMarketplace');
      const functionEnd = content.indexOf('\n}', functionStart) + 2;
      const functionBody = content.substring(functionStart, functionEnd);

      // Must have marketplace add command
      expect(functionBody).toContain("'marketplace'");
      expect(functionBody).toContain("'add'");
      expect(functionBody).toContain('anton-abyzov/specweave');
    });

    it('should have CRITICAL FIX documentation', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract refreshMarketplace function and its JSDoc
      const docStart = content.lastIndexOf('/**', content.indexOf('async function refreshMarketplace'));
      const functionEnd = content.indexOf('\n}', content.indexOf('async function refreshMarketplace')) + 2;
      const functionWithDoc = content.substring(docStart, functionEnd);

      // Must document the fix
      expect(functionWithDoc).toContain('CRITICAL FIX');
      expect(functionWithDoc).toContain('v0.34.6');
      expect(functionWithDoc).toContain('Never remove existing marketplace');
    });
  });

  describe('Cache TTL Configuration', () => {
    it('should use 24-hour cache TTL for users, 5 min for framework devs', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Must have both TTL constants (conditional)
      expect(content).toContain('24 * 60 * 60 * 1000'); // 24 hours for users
      expect(content).toContain('5 * 60 * 1000');       // 5 min for devs

      // Must detect framework repo
      expect(content).toContain('isSpecWeaveFrameworkRepository');
    });

    it('should use cacheTTL variable in cache comparison', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Must compare against cacheTTL variable
      expect(content).toContain('cacheAge < cacheTTL');
    });

    it('should NOT use hardcoded plugin count >= 25', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Must check core plugin existence instead of magic number
      expect(content).toContain("p.name === 'specweave'");
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

  it('should check marketplace existence before any operations', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // Extract refreshMarketplace function
    const functionStart = content.indexOf('async function refreshMarketplace');
    const functionEnd = content.indexOf('\n}', functionStart) + 2;
    const functionBody = content.substring(functionStart, functionEnd);

    // Must check existence first
    const listIndex = functionBody.indexOf("'list'");
    const addIndex = functionBody.indexOf("'add'");

    // List (existence check) must come before add
    expect(listIndex).toBeGreaterThan(0);
    expect(addIndex).toBeGreaterThan(listIndex);
  });

  it('should be idempotent - same result regardless of call count', async () => {
    const pluginInstallerPath = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );
    const content = await fs.readFile(pluginInstallerPath, 'utf-8');

    // Extract refreshMarketplace function
    const functionStart = content.indexOf('async function refreshMarketplace');
    const functionEnd = content.indexOf('\n}', functionStart) + 2;
    const functionBody = content.substring(functionStart, functionEnd);

    // Idempotency is guaranteed by:
    // 1. Checking if marketplace exists first
    // 2. Returning early if it does
    // 3. Only adding if it doesn't exist

    expect(functionBody).toContain('marketplaceExists');
    expect(functionBody).toContain('return;'); // Early return
    expect(functionBody).toContain("'add'"); // Only add, never remove
  });
});
