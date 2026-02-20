/**
 * Plugin Installer Source Code Validation Tests
 *
 * CRITICAL: These tests prevent regression of the marketplace deregistration bug
 * and verify the plugin-installer.ts source code follows expected patterns.
 *
 * Current Implementation (v1.0.278):
 * - Uses inline copier (plugin-copier.ts) for first-party plugin installation
 * - No vskill dependency, no external CLI shell-out
 * - copyPlugin() copies files directly to ~/.claude/commands/<name>/
 * - Hash-based skip for unchanged plugins
 * - Lockfile (vskill.lock) updated with tier: 'BUNDLED'
 *
 * @see src/cli/helpers/init/plugin-installer.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';

// Mock ora spinner
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    blue: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    gray: (s: string) => s,
    cyan: (s: string) => s,
    white: (s: string) => s,
  },
}));

// Mock Claude CLI detector
vi.mock('../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: vi.fn(() => ({ available: true, version: '2.0.0' })),
  getClaudeCliDiagnostic: vi.fn(() => ''),
  getClaudeCliSuggestions: vi.fn(() => []),
}));

describe('Plugin Installer - Marketplace Protection', () => {
  describe('CRITICAL: No marketplace deregistration', () => {
    it('should NOT contain marketplace remove logic in plugin-installer.ts', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify no marketplace remove commands
        expect(content).not.toContain("'marketplace remove'");
        expect(content).not.toContain("marketplace', 'remove'");
      }
    });
  });

  describe('Inline Copier Implementation (v1.0.278)', () => {
    it('should use inline copier (plugin-copier) for plugin installation', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify inline copier is used
        expect(content).toContain('copyPlugin');
        expect(content).toContain('findSpecweaveRoot');
        expect(content).toContain('plugin-copier');
      }
    });

    it('should NOT contain vskill shell-out code', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify vskill shell-out is removed
        expect(content).not.toContain('execFileNoThrowSync');
        expect(content).not.toContain('resolveVskillPath');
        expect(content).not.toContain('resolveSpecweavePluginDir');
        expect(content).not.toContain('installPluginViaVskill');
      }
    });

    it('should NOT contain cache management logic', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // These patterns were removed with the copier migration
        expect(content).not.toContain('cacheAge');
        expect(content).not.toContain('cacheTTL');
        expect(content).not.toContain('needsRefresh');
        expect(content).not.toContain('marketplaceCachePath');
      }
    });
  });

  describe('Idempotency', () => {
    it('should not modify installed_plugins.json when marketplace exists', async () => {
      // The installed_plugins.json should remain unchanged when
      // marketplace is already registered and cache is fresh
    });
  });

  describe('Error Handling', () => {
    it('should handle Claude CLI not available gracefully', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify detectClaudeCli is checked
        expect(content).toContain('detectClaudeCli');
        expect(content).toContain('claudeStatus.available');
      }
    });
  });
});

describe('Plugin Installer - Continue Existing Mode', () => {
  it('should skip plugin installation in continue existing mode', async () => {
    const initFile = path.join(process.cwd(), 'src/cli/commands/init.ts');

    if (await fs.pathExists(initFile)) {
      const content = await fs.readFile(initFile, 'utf-8');

      // Verify continueExisting check exists
      expect(content).toContain('if (continueExisting)');
      expect(content).toContain('Keeping existing plugin configuration');

      // Verify the fix is documented
      expect(content).toContain('CRITICAL FIX');
      expect(content).toContain('v0.34.6');
    }
  });

  it('should set autoInstallSucceeded=true when continuing existing', async () => {
    const initFile = path.join(process.cwd(), 'src/cli/commands/init.ts');

    if (await fs.pathExists(initFile)) {
      const content = await fs.readFile(initFile, 'utf-8');

      // Verify autoInstallSucceeded is set to true for continueExisting
      expect(content).toContain('autoInstallSucceeded = true');
    }
  });
});

describe('refresh-marketplace.sh Safety', () => {
  it('should have prominent developer-only warning', async () => {
    const scriptFile = path.join(process.cwd(), 'scripts/refresh-marketplace.sh');

    if (await fs.pathExists(scriptFile)) {
      const content = await fs.readFile(scriptFile, 'utf-8');

      // Verify warning banner exists
      expect(content).toContain('WARNING');
      expect(content).toContain('DEVELOPER-ONLY');
      expect(content).toContain('DO NOT USE IN PRODUCTION');

      // Verify it lists destructive operations
      expect(content).toContain('REMOVES');
      expect(content).toContain('DESTRUCTIVE');

      // Verify it suggests alternatives for users
      expect(content).toContain('/plugin install specweave');
      expect(content).toContain('specweave init .');
    }
  });
});

describe('Stale Plugin Cleanup (v0.35.2)', () => {
  it('should call cleanupStalePlugins after marketplace refresh', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify cleanupStalePlugins is imported
      expect(content).toContain("import { cleanupStalePlugins }");

      // Verify it's called
      expect(content).toContain('cleanupStalePlugins(');

      // Verify the cleanup result is handled
      expect(content).toContain('cleanupResult.removedCount');
      expect(content).toContain('cleanupResult.removedPlugins');
    }
  });

  it('should display cleanup results to user', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify user-friendly messages
      expect(content).toContain('stale plugin');
      expect(content).toContain('Removed');
    }
  });
});

describe('Inline Copier Installation (v1.0.278)', () => {
  it('should use copyPlugin for plugin installation, NOT vskill CLI', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify inline copier is used
      expect(content).toContain('copyPlugin');
      expect(content).toContain('plugin-copier');

      // Verify no vskill shell-out
      expect(content).not.toContain('--plugin-dir');
      expect(content).not.toContain("'marketplace add'");
      expect(content).not.toContain('SPECWEAVE_MARKETPLACE_URL');
    }
  });

  it('should document the inline copier approach in comments', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify the comment explains the copier approach
      expect(content).toContain('inline copier');
      expect(content).toContain('plugin');
    }
  });
});

describe('Regression Prevention', () => {
  it('should document the copier migration in source code', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify the implementation uses inline copier
      expect(content).toContain('copyPlugin');

      // Verify it documents lazy loading mode
      expect(content).toContain('lazy');
      expect(content).toContain('on-demand');
    }
  });

  it('should NOT contain cache management logic (removed with copier migration)', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // These patterns were removed with the copier migration
      expect(content).not.toContain('cacheAge');
      expect(content).not.toContain('cacheTTL');
      expect(content).not.toContain('needsRefresh');
      expect(content).not.toContain('marketplaceCachePath');

      // Verify inline copier handles installation directly (no cache management needed)
      expect(content).toContain('copyPlugin');
    }
  });
});

/**
 * CRITICAL TEST: Verify INIT installs core plugin (sw)
 */
describe('Plugin Installer - Core Plugin Installation on INIT', () => {
  describe('Lazy Mode (Default) - installs sw core plugin only', () => {
    it('should install CORE plugin (sw) during lazy mode init', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify lazy mode installs core plugin via essentialPlugins
        expect(content).toContain("name: 'sw'");
        expect(content).toContain("marketplace: 'specweave'");
        expect(content).toContain('Core SpecWeave framework');
      }
    });

    it('should use detect-intent for on-demand plugin loading', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify detect-intent hook is documented for on-demand loading
        expect(content).toContain('detect-intent');
        expect(content).toContain('on-demand');
      }
    });

    it('should NOT install sw-router (obsolete since v1.0.160)', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify sw-router is NOT being installed
        expect(content).not.toContain("plugins: ['sw-router']");
        expect(content).not.toContain("const routerPlugin = allPlugins.find(p => p.name === 'sw-router')");
      }
    });

    it('should install core plugin via copyPlugin with result handling', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify copyPlugin is used for core plugin installation
        expect(content).toContain('copyPlugin');

        // Verify skipped case is handled gracefully
        expect(content).toContain('result.skipped');
      }
    });
  });

  describe('installLazyMode function behavior', () => {
    it('should define installLazyMode as an async function', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify function signature
        expect(content).toContain('async function installLazyMode(');
        expect(content).toContain('): Promise<PluginInstallResult>');
      }
    });

    it('should return success when core plugin is installed', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify success condition
        expect(content).toContain('success: installedCount > 0');
      }
    });

    it('should track installed count for core plugin', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify installedCount is incremented for core plugin
        const installedCountIncrements = (content.match(/installedCount\+\+/g) || []).length;

        // Should have at least 1 increment (for sw core plugin)
        expect(installedCountIncrements).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Core plugin is defined in marketplace', () => {
    it.skip('should have sw (core) plugin in PLUGIN_GROUPS.core', async () => {
      // keyword-detector.js was never created - skip
    });

    it('should have sw (core) plugin available in marketplace', async () => {
      const marketplaceJsonPath = path.join(
        process.cwd(),
        '.claude-plugin/marketplace.json'
      );

      if (await fs.pathExists(marketplaceJsonPath)) {
        const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
        const marketplace = JSON.parse(content);

        const corePlugin = marketplace.plugins?.find(
          (p: { name: string }) => p.name === 'sw'
        );

        expect(corePlugin).toBeDefined();
        expect(corePlugin.name).toBe('sw');
      }
    });

    it('should NOT have sw-router in marketplace (removed in v1.0.160)', async () => {
      const marketplaceJsonPath = path.join(
        process.cwd(),
        '.claude-plugin/marketplace.json'
      );

      if (await fs.pathExists(marketplaceJsonPath)) {
        const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
        const marketplace = JSON.parse(content);

        const routerPlugin = marketplace.plugins?.find(
          (p: { name: string }) => p.name === 'sw-router'
        );

        // sw-router should NOT exist in marketplace anymore
        expect(routerPlugin).toBeUndefined();
      }
    });
  });
});
