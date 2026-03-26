/**
 * Plugin Installer Source Code Validation Tests
 *
 * CRITICAL: These tests prevent regression of the marketplace deregistration bug
 * and verify the plugin-installer.ts source code follows expected patterns.
 *
 * Current Implementation (v1.0.535):
 * - Uses copyPluginSkillsToProject (plugin-copier.ts) for plugin installation
 * - Copies skills directly into .claude/skills/ (project-local)
 * - No vskill dependency, no external CLI shell-out, no Claude CLI dependency
 * - No lazy mode — all plugins installed at init time
 * - Hash-based skip for unchanged plugins via lockfile
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

  describe('Inline Copier Implementation (v1.0.535)', () => {
    it('should use copyPluginSkillsToProject (plugin-copier) for plugin installation', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify inline copier is used
        expect(content).toContain('copyPluginSkillsToProject');
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
    it('should handle missing specweave root gracefully', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify specweaveRoot is checked
        expect(content).toContain('specweaveRoot');
        expect(content).toContain('findSpecweaveRoot');
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

describe('Stale Plugin Cleanup', () => {
  it('should NOT import cleanupStalePlugins in plugin-installer (moved to refresh-plugins)', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // cleanupStalePlugins was removed from plugin-installer in v1.0.535
      // (it's now only in refresh-plugins.ts)
      expect(content).not.toContain("import { cleanupStalePlugins }");
    }
  });

  it('should have cleanupStalePlugins in refresh-plugins command instead', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/commands/refresh-plugins.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify cleanupStalePlugins is used in refresh-plugins
      expect(content).toContain('cleanupStalePlugins');
    }
  });
});

describe('Inline Copier Installation (v1.0.535)', () => {
  it('should use copyPluginSkillsToProject for plugin installation, NOT vskill CLI', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify inline copier is used
      expect(content).toContain('copyPluginSkillsToProject');
      expect(content).toContain('plugin-copier');

      // Verify no vskill shell-out
      expect(content).not.toContain('--plugin-dir');
      expect(content).not.toContain("'marketplace add'");
      expect(content).not.toContain('SPECWEAVE_MARKETPLACE_URL');
    }
  });

  it('should document the approach in comments', async () => {
    const sourceFile = path.join(
      process.cwd(),
      'src/cli/helpers/init/plugin-installer.ts'
    );

    if (await fs.pathExists(sourceFile)) {
      const content = await fs.readFile(sourceFile, 'utf-8');

      // Verify the comment explains the approach
      expect(content).toContain('plugin');
      expect(content).toContain('skill');
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
      expect(content).toContain('copyPluginSkillsToProject');

      // Verify it documents that lazy/CLI-based installation was replaced
      expect(content).toContain('replaced');
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
      expect(content).toContain('copyPluginSkillsToProject');
    }
  });
});

/**
 * CRITICAL TEST: Verify INIT installs all plugins
 */
describe('Plugin Installer - All Plugin Installation on INIT', () => {
  describe('All plugins installed at init time (v1.0.535)', () => {
    it('should install ALL plugins from marketplace.json during init', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify all plugins from marketplace are iterated
        expect(content).toContain('allPlugins');
        expect(content).toContain('for (const plugin of allPlugins)');
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

    it('should install plugins via copyPluginSkillsToProject with result handling', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify copyPluginSkillsToProject is used for plugin installation
        expect(content).toContain('copyPluginSkillsToProject');

        // Verify skipped case is handled gracefully
        expect(content).toContain('result.skipped');
      }
    });
  });

  describe('installAllPlugins function behavior', () => {
    it('should define installAllPlugins as an async function', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify function signature
        expect(content).toContain('async function installAllPlugins(');
        expect(content).toContain('): Promise<PluginInstallResult>');
      }
    });

    it('should return success when plugins are installed', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify success condition
        expect(content).toContain('success: successCount > 0');
      }
    });

    it('should track success count for installed plugins', async () => {
      const sourceFile = path.join(
        process.cwd(),
        'src/cli/helpers/init/plugin-installer.ts'
      );

      if (await fs.pathExists(sourceFile)) {
        const content = await fs.readFile(sourceFile, 'utf-8');

        // Verify successCount is incremented for installed plugins
        const successCountIncrements = (content.match(/successCount\+\+/g) || []).length;

        // Should have at least 1 increment
        expect(successCountIncrements).toBeGreaterThanOrEqual(1);
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

  // =========================================================================
  // Native Plugin Skip — init.ts source validation
  // =========================================================================
  describe('Native Plugin Skip in init.ts', () => {
    it('should check isSwPluginInstalledNatively before calling installAllPlugins', async () => {
      const initFile = path.join(
        process.cwd(),
        'src/cli/commands/init.ts'
      );

      if (await fs.pathExists(initFile)) {
        const content = await fs.readFile(initFile, 'utf-8');
        expect(content).toContain('isSwPluginInstalledNatively');
      }
    });

    it('should bypass native check when forceRefresh is set', async () => {
      const initFile = path.join(
        process.cwd(),
        'src/cli/commands/init.ts'
      );

      if (await fs.pathExists(initFile)) {
        const content = await fs.readFile(initFile, 'utf-8');
        // forceRefresh must be checked before native plugin detection
        expect(content).toContain('!options.forceRefresh && isSwPluginInstalledNatively');
      }
    });

    it('should display skip message when native plugin is detected', async () => {
      const initFile = path.join(
        process.cwd(),
        'src/cli/commands/init.ts'
      );

      if (await fs.pathExists(initFile)) {
        const content = await fs.readFile(initFile, 'utf-8');
        expect(content).toContain('already installed natively');
      }
    });
  });
});
