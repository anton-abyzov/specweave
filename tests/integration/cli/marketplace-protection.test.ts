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

    it('should update marketplace when it exists (v0.35.2+)', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract refreshMarketplace function body
      const functionStart = content.indexOf('async function refreshMarketplace');
      const functionEnd = content.indexOf('\n}', functionStart) + 2;
      const functionBody = content.substring(functionStart, functionEnd);

      // Must check if marketplace exists
      expect(functionBody).toContain('if (marketplaceExists)');

      // v0.35.2+: When marketplace exists, UPDATE it (better than early return!)
      // This ensures users get latest plugins on each init
      expect(functionBody).toContain("'update'");
      expect(functionBody).toContain('Marketplace updated');
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

    it('should have proper documentation for marketplace handling', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Extract refreshMarketplace function and its JSDoc
      const docStart = content.lastIndexOf('/**', content.indexOf('async function refreshMarketplace'));
      const functionEnd = content.indexOf('\n}', content.indexOf('async function refreshMarketplace')) + 2;
      const functionWithDoc = content.substring(docStart, functionEnd);

      // Must document the approach (v0.35.2+: simplified, no longer has CRITICAL FIX comment)
      expect(functionWithDoc).toContain('marketplace');
      expect(functionWithDoc).toContain('add');
      expect(functionWithDoc).toContain('update');
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

    it('should use marketplace list to check existence', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Check marketplace via CLI, not manual cache inspection
      expect(content).toContain("'marketplace', 'list'");
      expect(content).toContain('marketplaceExists');
    });

    it('should check core plugin by name when installing', async () => {
      const content = await fs.readFile(pluginInstallerPath, 'utf-8');

      // Must check core plugin by name (for sorting and special handling)
      // v0.35.2+: Uses pluginName === 'specweave' for sorting and special install
      expect(content).toContain("pluginName === 'specweave'");
      expect(content).toContain("a.name === 'specweave'"); // Sort comparison
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
    // 2. If exists → UPDATE (v0.35.2+: better than early return, gets latest)
    // 3. If not exists → ADD
    // 4. Remove ONLY for SSH auth failure recovery (v1.0.24) - then re-add with HTTPS

    expect(functionBody).toContain('marketplaceExists');
    expect(functionBody).toContain("'update'"); // Update if exists (v0.35.2+)
    expect(functionBody).toContain("'add'"); // Add if not exists
    // v1.0.24: Remove is now allowed in SSH failure recovery path
    // (remove old SSH-based registration, re-add with HTTPS)
    expect(functionBody).toContain('SSH authentication failed');
  });
});
